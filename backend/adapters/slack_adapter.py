"""
SlackMCPAdapter — posts Block Kit cards and handles button interactions.

Two critical implementation details, documented here so no future change
silently breaks the Slack round-trip:

1. RAW BODY VERIFICATION
   Slack signs requests using HMAC-SHA256 over the exact bytes it sent,
   combined with X-Slack-Request-Timestamp. Signature verification MUST
   happen against the raw bytes (raw_body: bytes parameter), before any
   JSON parsing. If you parse body first, re-serialise it, then verify —
   the bytes won't match what Slack signed and EVERY request will fail.
   handle_interaction therefore accepts raw_body + headers and verifies
   before calling json.loads().

2. TICKET ID IN BUTTON VALUE
   resume_graph(thread_id, human_response) needs a thread_id to know which
   LangGraph checkpoint to resume. thread_id = f"ticket-{ticket_id}".
   The Slack interaction payload doesn't carry ticket context unless we
   put it there. post_card embeds ticket_id in each button's value field
   (JSON-encoded so extensions are easy). handle_interaction extracts it
   from payload["actions"][0]["value"] — no DB look-up, no race condition.

Sync SDK wrapped in asyncio.to_thread:
   slack_sdk.WebClient is synchronous. We wrap the network call in
   asyncio.to_thread() so the FastAPI event loop never blocks.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_sdk.signature import SignatureVerifier

from adapters.base import ChatSink
from config import settings
from schemas import Decision, TrustScore

log = logging.getLogger(__name__)


def _thread_id_from_ticket(ticket_id: str) -> str:
    """Convention shared with agent/graph.py for LangGraph thread IDs."""
    return f"ticket-{ticket_id}"


class SlackMCPAdapter(ChatSink):
    """
    Posts escalation cards to Slack and handles the button callbacks.
    One instance per application lifetime.
    """

    def __init__(self) -> None:
        self._client = WebClient(token=settings.SLACK_BOT_TOKEN)
        self._verifier = SignatureVerifier(settings.SLACK_SIGNING_SECRET)

    # ── ChatSink interface ────────────────────────────────────────────────────

    async def post_card(self, channel: str, summary: str, ticket_id: str) -> str:
        """
        Post a Block Kit card with Approve / Escalate Further buttons.

        Each button's value is a JSON object containing ticket_id so that
        handle_interaction can recover it from the payload with no external
        state. Returns the Slack message timestamp (ts).

        Layout:
          [Header]   Ticket ticket_id needs your review
          [Section]  summary text
          [Actions]  [Approve ✓]  [Escalate Further ↑]
        """
        button_value = json.dumps({"ticket_id": ticket_id})

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"🔍 Ticket {ticket_id} needs your review",
                },
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": summary},
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "✓ Approve"},
                        "style": "primary",
                        "action_id": "arbiter_approve",
                        # ticket_id embedded here — handle_interaction reads it back
                        "value": button_value,
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "↑ Escalate Further"},
                        "style": "danger",
                        "action_id": "arbiter_escalate_further",
                        "value": button_value,
                    },
                ],
            },
        ]

        def _post():
            return self._client.chat_postMessage(channel=channel, blocks=blocks)

        try:
            response = await asyncio.to_thread(_post)
            ts: str = response["ts"]
            log.info("SlackMCPAdapter: card posted for %s (ts=%s)", ticket_id, ts)
            return ts
        except SlackApiError as exc:
            log.error(
                "SlackMCPAdapter: failed to post card for %s: %s", ticket_id, exc
            )
            raise

    async def handle_interaction(
        self, raw_body: bytes, headers: dict
    ) -> Optional[Decision]:
        """
        Verify the Slack signature, parse the interaction payload, and return
        a Decision. Returns None if verification fails.

        IMPORTANT: raw_body must be the unmodified bytes from the HTTP request.
        Never parse the body before passing it here — re-serialised JSON will
        not match Slack's signature.

        The button value (JSON) contains:
          { "ticket_id": "<Jira issue key>" }

        The returned Decision has:
          ticket_id    — from the button value
          action       — "escalate" (human always sees this card post-escalation)
          trust_score  — placeholder zeros (trust was already scored; we keep the
                         model unchanged by recording the human's response via
                         repo.update_human_response, not by re-scoring)
          human_response — "approve" | "escalate_further"
        """
        # ── 1. Verify signature against raw bytes, before any parsing ─────────
        timestamp = headers.get("x-slack-request-timestamp", "")
        signature = headers.get("x-slack-signature", "")

        if not self._verifier.is_valid(
            body=raw_body,
            timestamp=timestamp,
            signature=signature,
        ):
            log.warning(
                "SlackMCPAdapter: signature verification FAILED "
                "(ts=%s, sig=%s…)",
                timestamp,
                signature[:16] if signature else "",
            )
            return None  # caller responds 200 to suppress Slack retries

        # ── 2. Parse only after verification succeeds ─────────────────────────
        # Slack sends interaction payloads as application/x-www-form-urlencoded
        # with a 'payload' field containing URL-encoded JSON.
        from urllib.parse import parse_qs
        form = parse_qs(raw_body.decode("utf-8"))
        payload_str = form.get("payload", ["{}"])[0]
        payload = json.loads(payload_str)

        # ── 3. Extract ticket_id from the button value ─────────────────────────
        actions = payload.get("actions", [])
        if not actions:
            log.warning("SlackMCPAdapter: interaction payload has no actions")
            return None

        action = actions[0]
        action_id: str = action.get("action_id", "")
        try:
            value_data = json.loads(action.get("value", "{}"))
            ticket_id: str = value_data["ticket_id"]
        except (json.JSONDecodeError, KeyError) as exc:
            log.error(
                "SlackMCPAdapter: could not extract ticket_id from button value: %s", exc
            )
            return None

        # ── 4. Map action_id → human_response literal ─────────────────────────
        human_response_map = {
            "arbiter_approve": "approve",
            "arbiter_escalate_further": "escalate_further",
        }
        human_response = human_response_map.get(action_id)
        if human_response is None:
            log.warning("SlackMCPAdapter: unknown action_id %r", action_id)
            return None

        log.info(
            "SlackMCPAdapter: interaction for %s → %s", ticket_id, human_response
        )

        # ── 5. Build and return Decision ──────────────────────────────────────
        # Trust score is zeroed here — the real score was captured when the
        # decision was first saved. Callers update the existing Decision row
        # via repo.update_human_response(), not by creating a new one.
        placeholder_score = TrustScore(
            value=0.0,
            retrieval_component=0.0,
            category_success_component=0.0,
            llm_confidence_component=0.0,
            risk_override=False,
        )
        return Decision(
            ticket_id=ticket_id,
            action="escalate",
            trust_score=placeholder_score,
            human_response=human_response,  # type: ignore[arg-type]
        )
