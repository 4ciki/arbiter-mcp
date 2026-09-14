"""
Abstract base classes for all external I/O adapters.

Design contract:
  - The agent graph (/agent) and scoring (/scoring) modules import ONLY from
    this file, never from any concrete adapter. No Jira/Slack/GCP symbol ever
    leaks into those layers.
  - All methods are async. Concrete adapters that wrap sync SDKs use
    asyncio.to_thread() internally; callers do not need to know this.

ChatSink.handle_interaction note on Slack security
---------------------------------------------------
handle_interaction intentionally accepts raw_body (bytes) and headers (dict)
rather than a parsed payload dict. Slack signature verification (HMAC-SHA256
over the exact bytes Slack sent) must happen BEFORE JSON parsing. If a FastAPI
handler parses the body first and re-serialises it for verification, the
re-serialised bytes will not byte-for-byte match what was signed, and
verification will fail on every request. The correct pattern is:

    raw = await request.body()           # read raw bytes
    result = await slack.handle_interaction(raw, dict(request.headers))

The concrete adapter (SlackMCPAdapter) is responsible for:
  1. Verifying the signature against raw_body.
  2. Only then parsing raw_body as JSON.
  3. Returning None immediately and logging if verification fails.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from schemas import Decision, Ticket


class TicketSource(ABC):
    """Read tickets from and write back to the ticketing system."""

    @abstractmethod
    async def get_ticket(self, ticket_id: str) -> Ticket:
        """Fetch one ticket by id. Raises ValueError if not found."""
        raise NotImplementedError

    @abstractmethod
    async def add_comment(self, ticket_id: str, text: str) -> None:
        """Append a comment to the ticket (auto-resolution message or escalation note)."""
        raise NotImplementedError

    @abstractmethod
    async def update_status(self, ticket_id: str, status: str) -> None:
        """Transition the ticket to the named status (e.g. 'Done', 'In Progress')."""
        raise NotImplementedError


class ChatSink(ABC):
    """Post and receive interactive Slack cards."""

    @abstractmethod
    async def post_card(self, channel: str, summary: str, ticket_id: str) -> str:
        """
        Post a Block Kit escalation card to channel. Returns the Slack message
        timestamp (ts), which the graph stores as the Slack reference for this
        ticket.

        IMPORTANT: ticket_id MUST be embedded in every button's value field so
        that handle_interaction can recover it from the interaction payload
        without any external lookup. The thread_id used to resume the LangGraph
        run is derived from ticket_id (see agent/graph.py).
        """
        raise NotImplementedError

    @abstractmethod
    async def handle_interaction(
        self, raw_body: bytes, headers: dict
    ) -> Optional[Decision]:
        """
        Verify the Slack signature against raw_body and headers, then parse
        the interaction payload and return a Decision.

        Returns None if signature verification fails (the FastAPI endpoint
        should respond 200 OK with an empty body to avoid retries, while
        logging the failure for alerting).

        The ticket_id must be extracted from payload["actions"][0]["value"],
        which post_card embeds at card-creation time.
        """
        raise NotImplementedError
