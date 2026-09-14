"""
FastAPI application for Arbiter (§2.9).

Exposes four primary endpoints:
  - POST /webhooks/jira                 → starts graph run for new ticket
  - POST /webhooks/slack/interactions   → verifies raw signature, resumes graph run
  - GET  /api/tickets                   → paginated ticket list
  - GET  /api/audit                     → paginated audit log
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import parse_qs

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from slack_sdk.signature import SignatureVerifier

from agent.graph import get_default_graph, resume_graph, run_graph
from config import settings
from db.repository import ArbiterRepository
from schemas import Ticket

log = logging.getLogger(__name__)


def create_app(
    repo: Optional[ArbiterRepository] = None,
    graph: Optional[Any] = None,
    signing_secret: Optional[str] = None,
) -> FastAPI:
    """Application factory allowing injection of repository and graph for testing."""
    app = FastAPI(
        title="Arbiter IT Support Agent API",
        version="1.0.0",
        description="Autonomous IT helpdesk triage and safety-critical resolution engine.",
    )

    app.state.repo = repo or ArbiterRepository()
    app.state.graph = graph  # If None, get_default_graph() is used lazily
    app.state.signing_secret = signing_secret or settings.SLACK_SIGNING_SECRET

    @app.get("/health")
    async def health_check():
        """Health check endpoint for container probes."""
        return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

    @app.post("/webhooks/jira", status_code=status.HTTP_200_OK)
    async def jira_webhook(request: Request):
        """
        Ingest incoming Jira webhook event and trigger the Arbiter agent graph.
        Handles both Jira Cloud webhook formats and flat test payloads.
        """
        try:
            body = await request.json()
        except Exception as exc:
            log.error("Jira webhook: failed to parse JSON: %s", exc)
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        # 1. Extract ticket fields
        ticket_id = None
        ticket_text = None
        created_at = None

        if "issue" in body:
            issue = body["issue"]
            ticket_id = issue.get("key") or issue.get("id")
            fields = issue.get("fields", {})
            summary = fields.get("summary", "")
            description = fields.get("description", "")
            ticket_text = f"{summary}\n{description}".strip()
            raw_created = fields.get("created")
            if raw_created:
                try:
                    created_at = datetime.fromisoformat(raw_created.replace("Z", "+00:00"))
                except ValueError:
                    pass
        elif "ticket_id" in body or "id" in body:
            ticket_id = body.get("ticket_id") or body.get("id")
            ticket_text = body.get("text") or body.get("summary", "")
            raw_created = body.get("created_at")
            if raw_created and isinstance(raw_created, str):
                try:
                    created_at = datetime.fromisoformat(raw_created.replace("Z", "+00:00"))
                except ValueError:
                    pass

        if not ticket_id or not ticket_text:
            log.warning("Jira webhook received invalid payload: %s", body)
            raise HTTPException(
                status_code=400,
                detail="Payload must include ticket ID and description text",
            )

        ticket = Ticket(
            id=str(ticket_id),
            source="jira",
            text=ticket_text,
            created_at=created_at or datetime.now(timezone.utc),
        )

        thread_id = f"ticket-{ticket.id}"
        log.info("Starting graph run for ticket %s (thread %s)", ticket.id, thread_id)
        result = await run_graph(ticket=ticket, thread_id=thread_id, graph=app.state.graph)

        decision = result.get("decision")
        action = decision.action if decision else "unknown"
        return {
            "status": "ok",
            "ticket_id": ticket.id,
            "thread_id": thread_id,
            "action": action,
            "risk_override": result.get("trust_score").risk_override if result.get("trust_score") else False,
        }

    @app.post("/webhooks/slack/interactions", status_code=status.HTTP_200_OK)
    async def slack_interactions_webhook(request: Request):
        """
        Handle interactive button clicks from Slack Block Kit cards.
        
        CRITICAL REQUIREMENTS:
        1. Reads raw bytes before any JSON parsing for HMAC-SHA256 signature verification.
        2. Returns 403 immediately if signature is invalid.
        3. Extracts ticket_id from embedded button payload.
        4. Resumes paused graph run via resume_graph(thread_id, human_response).
        """
        raw_body: bytes = await request.body()
        headers = dict(request.headers)

        timestamp = headers.get("x-slack-request-timestamp", "")
        signature = headers.get("x-slack-signature", "")

        if not timestamp or not signature:
            log.warning("Missing Slack signature or timestamp headers")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing Slack request signature",
            )

        verifier = SignatureVerifier(app.state.signing_secret)
        if not verifier.is_valid(body=raw_body, timestamp=timestamp, signature=signature):
            log.warning(
                "Security alert: Slack signature verification failed for ts=%s, sig=%s",
                timestamp,
                signature[:12] if signature else "",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Slack request signature",
            )

        # ── 2. Parse payload ──────────────────────────────────────────────────
        try:
            form = parse_qs(raw_body.decode("utf-8"))
            payload_str = form.get("payload", ["{}"])[0]
            payload = json.loads(payload_str)
        except Exception as exc:
            log.error("Failed to parse Slack interaction payload: %s", exc)
            raise HTTPException(status_code=400, detail="Invalid form payload")

        actions = payload.get("actions", [])
        if not actions:
            log.warning("Slack interaction payload has no actions: %s", payload)
            return {"status": "ignored", "reason": "no actions"}

        action = actions[0]
        action_id: str = action.get("action_id", "")

        try:
            value_data = json.loads(action.get("value", "{}"))
            ticket_id = value_data["ticket_id"]
        except (json.JSONDecodeError, KeyError) as exc:
            log.error("Failed to extract ticket_id from button value: %s", exc)
            raise HTTPException(status_code=400, detail="Missing ticket_id in button value")

        human_response_map = {
            "arbiter_approve": "approve",
            "arbiter_escalate_further": "escalate_further",
            "approve": "approve",
            "escalate_further": "escalate_further",
            "edit": "edit",
        }
        human_response = human_response_map.get(action_id)
        if not human_response:
            log.warning("Unknown action_id %r in Slack interaction", action_id)
            raise HTTPException(status_code=400, detail=f"Unsupported action {action_id}")

        thread_id = f"ticket-{ticket_id}"
        log.info(
            "Resuming graph for thread %s with human_response=%s",
            thread_id,
            human_response,
        )

        resumed_state = await resume_graph(
            thread_id=thread_id,
            human_response=human_response,
            graph=app.state.graph,
        )

        return {
            "status": "ok",
            "ticket_id": ticket_id,
            "thread_id": thread_id,
            "human_response": human_response,
        }

    @app.get("/api/tickets", status_code=status.HTTP_200_OK)
    async def list_tickets(offset: int = 0, limit: int = 50):
        """Paginated list of incoming tickets from database with decision details."""
        tickets = app.state.repo.list_tickets(offset=offset, limit=limit)
        results = []
        for t in tickets:
            item = t.model_dump()
            item["ticket_id"] = t.id
            decision = app.state.repo.get_decision(t.id)
            if decision:
                item["trust_score"] = decision.trust_score.value
                item["action"] = decision.action
                item["human_response"] = decision.human_response
                item["resolved_at"] = decision.resolved_at.isoformat() if decision.resolved_at else None
            else:
                item["trust_score"] = None
                item["action"] = None
                item["human_response"] = None
                item["resolved_at"] = None

            # Resolve category from audit log
            audit_events = app.state.repo.list_audit_log(ticket_id=t.id, limit=5)
            category = "general"
            for ev in audit_events:
                if ev.get("score_components") and "category" in ev["score_components"]:
                    category = ev["score_components"]["category"]
                    break
            item["category"] = category
            results.append(item)
        return results

    @app.get("/api/audit", status_code=status.HTTP_200_OK)
    async def list_audit_logs(
        offset: int = 0,
        limit: int = 100,
        ticket_id: Optional[str] = None,
    ):
        """Paginated immutable audit log events."""
        events = app.state.repo.list_audit_log(
            offset=offset, limit=limit, ticket_id=ticket_id
        )
        return events

    return app


# Default singleton app for ASGI servers (e.g. uvicorn api.main:app)
app = create_app()
