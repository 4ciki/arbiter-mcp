"""
JiraMCPAdapter — talks to Jira via Atlassian's remote MCP server (Rovo).

Endpoint: https://mcp.atlassian.com/v1/mcp
Auth:     HTTP Basic (email:api_token, base64-encoded), via httpx2.AsyncClient
Rate:     500 calls/hour on the free plan.
SDK:      mcp==2.2.0 — uses streamable_http_client (Streamable HTTP transport)
          rather than the legacy SSE client from 1.x.

Why /v1/mcp not /v1/sse?
  Atlassian deprecated the /v1/sse endpoint on June 30 2026. The /v1/mcp
  endpoint is their current Streamable HTTP transport, required for API-token
  (non-OAuth) authentication configurations.

Usage pattern per call:
  Each _call_tool() opens a fresh streamable_http_client context, calls
  session.initialize(), then session.call_tool(), then closes. Connections
  are short-lived (one HTTP round-trip each), which is fine because Jira
  adapter calls are infrequent (once per ticket).

Timeout / retry contract:
  10-second read timeout via session.call_tool(read_timeout_seconds=10).
  On any exception, retried exactly once after 2 seconds. Second failure
  re-raises so the LangGraph node can escalate instead of auto-resolving.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx2
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from adapters.base import TicketSource
from config import settings
from schemas import Ticket

log = logging.getLogger(__name__)

MCP_URL = "https://mcp.atlassian.com/v1/mcp"
TIMEOUT_S = 10.0
RETRY_DELAY_S = 2.0


def _auth_header(email: str, token: str) -> str:
    credentials = base64.b64encode(f"{email}:{token}".encode()).decode()
    return f"Basic {credentials}"


class JiraMCPAdapter(TicketSource):
    """
    Calls Atlassian MCP tools for Jira operations. One instance per
    application lifetime. The httpx2 client is reused across calls
    (connection pooling); the MCP session is opened fresh per call.
    """

    def __init__(self) -> None:
        self._http_client = httpx2.AsyncClient(
            headers={
                "Authorization": _auth_header(
                    settings.JIRA_EMAIL, settings.JIRA_API_TOKEN
                )
            }
        )

    # ── Internal MCP call with one retry ──────────────────────────────────────

    async def _call_tool(self, tool_name: str, arguments: dict) -> Any:
        """
        Open a Streamable HTTP session, initialize it, and call one MCP tool.
        Returns the content list from CallToolResult.
        Retries once on any exception after RETRY_DELAY_S seconds.
        """
        for attempt in range(2):
            try:
                async with streamable_http_client(
                    MCP_URL, http_client=self._http_client
                ) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        result = await session.call_tool(
                            tool_name,
                            arguments,
                            read_timeout_seconds=TIMEOUT_S,
                        )
                if result.is_error:
                    raise RuntimeError(
                        f"MCP tool error from {tool_name}: {result.content}"
                    )
                return result.content
            except Exception as exc:
                if attempt == 0 and "not found" not in str(exc).lower() and "-32602" not in str(exc):
                    log.warning(
                        "JiraMCPAdapter: %s failed (%s), retrying in %ss",
                        tool_name,
                        exc,
                        RETRY_DELAY_S,
                    )
                    await asyncio.sleep(RETRY_DELAY_S)
                else:
                    log.error(
                        "JiraMCPAdapter: %s failed: %s", tool_name, exc
                    )
                    raise

    @staticmethod
    def _text_from_content(content: list) -> str:
        """
        Extract the text from the first TextContent block in a CallToolResult.
        MCP TextContent blocks have a .text attribute (mcp_types.TextContent).
        """
        for block in content:
            text = getattr(block, "text", None)
            if text:
                return text
        return "{}"

    # ── TicketSource interface ─────────────────────────────────────────────────

    async def get_ticket(self, ticket_id: str) -> Ticket:
        """
        Calls MCP tool 'jira_get_issue' with direct REST fallback. Maps the issue to a Ticket.

        Field mapping:
          key                               → Ticket.id
          fields.summary + fields.description → Ticket.text (concatenated)
          fields.created                    → Ticket.created_at
        """
        issue = None
        try:
            content = await self._call_tool(
                "jira_get_issue", {"issue_id_or_key": ticket_id}
            )
            raw_text = self._text_from_content(content)
            issue = json.loads(raw_text) if isinstance(raw_text, str) else raw_text
        except Exception as exc:
            log.warning("JiraMCPAdapter: MCP get_issue failed (%s), trying direct Jira REST API", exc)
            url = f"{settings.JIRA_SITE_URL.rstrip('/')}/rest/api/2/issue/{ticket_id}"
            resp = await self._http_client.get(url)
            resp.raise_for_status()
            issue = resp.json()

        fields = issue.get("fields", {})
        summary = fields.get("summary", "")
        description = fields.get("description", "") or ""
        text = f"{summary}\n\n{description}".strip()

        created_raw = fields.get("created", "")
        try:
            created_at = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            created_at = datetime.now(timezone.utc)

        return Ticket(
            id=issue.get("key", ticket_id),
            source="jira",
            text=text,
            created_at=created_at,
        )

    async def add_comment(self, ticket_id: str, text: str) -> None:
        """Calls MCP tool 'jira_add_comment' with direct REST fallback."""
        try:
            await self._call_tool(
                "jira_add_comment",
                {"issue_id_or_key": ticket_id, "body": text},
            )
            log.info("JiraMCPAdapter: comment added to %s via MCP", ticket_id)
        except Exception as exc:
            log.warning("JiraMCPAdapter: MCP add_comment failed (%s), trying direct REST API", exc)
            url = f"{settings.JIRA_SITE_URL.rstrip('/')}/rest/api/2/issue/{ticket_id}/comment"
            resp = await self._http_client.post(url, json={"body": text})
            resp.raise_for_status()
            log.info("JiraMCPAdapter: comment added to %s via direct REST API", ticket_id)

    async def update_status(self, ticket_id: str, status: str) -> None:
        """
        Calls MCP tool 'jira_transition_issue' with direct REST fallback.
        """
        try:
            await self._call_tool(
                "jira_transition_issue",
                {"issue_id_or_key": ticket_id, "transition_name": status},
            )
            log.info("JiraMCPAdapter: %s transitioned to %s via MCP", ticket_id, status)
        except Exception as exc:
            log.warning("JiraMCPAdapter: MCP transition failed (%s), trying direct REST API", exc)
            url_trans = f"{settings.JIRA_SITE_URL.rstrip('/')}/rest/api/2/issue/{ticket_id}/transitions"
            resp = await self._http_client.get(url_trans)
            resp.raise_for_status()
            transitions = resp.json().get("transitions", [])
            target_id = None
            for t in transitions:
                name_match = t.get("name", "").strip().lower() == status.strip().lower()
                to_match = t.get("to", {}).get("name", "").strip().lower() == status.strip().lower()
                if name_match or to_match:
                    target_id = t.get("id")
                    break
            if target_id:
                post_resp = await self._http_client.post(url_trans, json={"transition": {"id": target_id}})
                post_resp.raise_for_status()
                log.info("JiraMCPAdapter: %s transitioned to %s (id=%s) via direct REST API", ticket_id, status, target_id)
            else:
                log.error("Could not find transition %s for %s among %s", status, ticket_id, [t.get('name') for t in transitions])

    async def aclose(self) -> None:
        """Close the underlying httpx2 client. Call on FastAPI lifespan shutdown."""
        await self._http_client.aclose()
