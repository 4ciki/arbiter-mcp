"""
mcp_server.py — Arbiter MCP stdio server for Smithery / Claude Desktop / Cursor.

Exposes Arbiter's IT helpdesk triage capabilities as MCP tools:

  triage_ticket    — classify, trust-score and route a support ticket
  get_ticket       — retrieve a ticket's status and audit record
  list_tickets     — list recent tickets from the audit log
  get_metrics      — return operational metrics and benchmarks

This module is the MCP transport layer only. All reasoning, scoring,
and safety logic lives in agent/, scoring/, retrieval/, and adapters/.

Run:
    python -m mcp_server           # stdio (used by Smithery / Claude Desktop)

Or install as a package entry point and run via:
    uvx arbiter-mcp
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    TextContent,
    Tool,
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "WARNING"))
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MCP server definition
# ---------------------------------------------------------------------------

app = Server("arbiter-mcp")

# ---------------------------------------------------------------------------
# Tool definitions — these are what Smithery indexes and shows to users
# ---------------------------------------------------------------------------

TRIAGE_TICKET_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["ticket_id", "ticket_text"],
    "properties": {
        "ticket_id": {
            "type": "string",
            "description": (
                "Unique identifier for the ticket (e.g. 'IT-1024', 'JIRA-42', "
                "or any string). Used for audit trail and Jira/Slack references."
            ),
        },
        "ticket_text": {
            "type": "string",
            "description": (
                "Full text of the IT support ticket or Slack message to triage. "
                "Include any context such as error messages, affected users, or "
                "environment (production/staging/dev)."
            ),
        },
        "created_at": {
            "type": "string",
            "description": "ISO 8601 timestamp when the ticket was created. Defaults to now.",
        },
    },
}

GET_TICKET_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["ticket_id"],
    "properties": {
        "ticket_id": {
            "type": "string",
            "description": "Ticket ID to retrieve (e.g. 'IT-1024').",
        }
    },
}

LIST_TICKETS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "limit": {
            "type": "integer",
            "description": "Maximum number of tickets to return (default: 10, max: 50).",
            "default": 10,
        },
        "decision_filter": {
            "type": "string",
            "enum": ["auto_resolve", "escalate", "all"],
            "description": "Filter tickets by decision outcome. Default: all.",
            "default": "all",
        },
    },
}

GET_METRICS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {},
}


@app.list_tools()
async def list_tools() -> list[Tool]:
    """Return the full list of Arbiter MCP tools."""
    return [
        Tool(
            name="triage_ticket",
            description=(
                "Triage an IT support ticket using Arbiter MCP's AI reasoning engine. "
                "The agent:\n"
                "1. Retrieves semantically similar resolved tickets from ChromaDB\n"
                "2. Classifies the ticket category and severity (P0/P1/P2/P3)\n"
                "3. Calculates a deterministic trust score\n"
                "4. Applies a hard safety override for production/security/billing/data-loss tickets\n"
                "5. Returns the decision: 'auto_resolve' (P2/P3, high confidence) or "
                "'escalate' (P0/P1 or risk override)\n\n"
                "Unlike LLM-only classifiers, Arbiter's risk_override rule unconditionally "
                "escalates any ticket with production, security, billing, or data_loss "
                "keywords — regardless of the trust score. Zero false-positive auto-resolutions "
                "on 40-ticket benchmark."
            ),
            inputSchema=TRIAGE_TICKET_SCHEMA,
        ),
        Tool(
            name="get_ticket",
            description=(
                "Retrieve the current status, trust score, decision, and audit record "
                "for a previously triaged ticket. Returns the full decision trace including "
                "retrieval similarity, category success rate, LLM confidence, risk flags, "
                "and the final routing decision."
            ),
            inputSchema=GET_TICKET_SCHEMA,
        ),
        Tool(
            name="list_tickets",
            description=(
                "List recent IT support tickets from Arbiter MCP's audit log. "
                "Returns ticket ID, text summary, category, severity, trust score, "
                "decision (auto_resolve/escalate), and timestamp for each ticket. "
                "Useful for reviewing triage history or building dashboards."
            ),
            inputSchema=LIST_TICKETS_SCHEMA,
        ),
        Tool(
            name="get_metrics",
            description=(
                "Return Arbiter MCP's operational metrics and benchmark results:\n"
                "- Classification accuracy (77.5% on N=40 benchmark)\n"
                "- Auto-resolution rate (20%)\n"
                "- False-positive auto-resolutions (0%)\n"
                "- Mean time to triage (1.19s, median 1.03s)\n"
                "- Genuine risk tickets caught (8/8, 100%)\n"
                "- Risk trap tickets cleared (6/6, 100%)\n"
                "Also returns live counts from the current audit log."
            ),
            inputSchema=GET_METRICS_SCHEMA,
        ),
    ]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Dispatch MCP tool calls to Arbiter's agent layer."""

    if name == "triage_ticket":
        return await _triage_ticket(arguments)
    elif name == "get_ticket":
        return await _get_ticket(arguments)
    elif name == "list_tickets":
        return await _list_tickets(arguments)
    elif name == "get_metrics":
        return await _get_metrics()
    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]


async def _triage_ticket(args: dict[str, Any]) -> list[TextContent]:
    """Run the full Arbiter triage pipeline on a ticket."""
    from schemas import Ticket

    ticket_id = args["ticket_id"]
    ticket_text = args["ticket_text"]
    created_at = args.get("created_at") or datetime.now(timezone.utc).isoformat()

    ticket = Ticket(
        id=ticket_id,
        text=ticket_text,
        created_at=created_at,
    )

    try:
        from agent.graph import get_default_graph, run_graph

        graph = get_default_graph()
        result = await run_graph(graph, ticket)

        output = {
            "ticket_id": ticket_id,
            "category": result.get("category"),
            "severity": _severity_label(result.get("trust_score", 0.0), result.get("risk_override", False)),
            "trust_score": round(result.get("trust_score", 0.0), 3),
            "risk_override": result.get("risk_override", False),
            "risk_flags": result.get("risk_flags", []),
            "decision": result.get("decision"),
            "retrieval_score": round(result.get("retrieval_score", 0.0), 3),
            "llm_confidence": round(result.get("llm_confidence", 0.0), 3),
            "reasoning": result.get("reasoning", ""),
            "jira_priority": _jira_priority(result.get("risk_override", False), result.get("trust_score", 0.0)),
        }
    except Exception as exc:
        log.warning("Full pipeline unavailable (offline mode): %s", exc)
        # Offline / test mode — return a deterministic mock for development
        output = _offline_triage(ticket_id, ticket_text)

    return [TextContent(type="text", text=json.dumps(output, indent=2))]


async def _get_ticket(args: dict[str, Any]) -> list[TextContent]:
    """Retrieve a ticket from the audit log."""
    ticket_id = args["ticket_id"]

    try:
        from db.repository import ArbiterRepository
        repo = ArbiterRepository()
        async with repo:
            record = await repo.get_ticket(ticket_id)
        if record:
            return [TextContent(type="text", text=json.dumps(record, indent=2, default=str))]
        return [TextContent(type="text", text=json.dumps({"error": f"Ticket {ticket_id!r} not found"}))]
    except Exception as exc:
        return [TextContent(type="text", text=json.dumps({"error": str(exc)}))]


async def _list_tickets(args: dict[str, Any]) -> list[TextContent]:
    """List recent tickets from the audit log."""
    limit = min(int(args.get("limit", 10)), 50)
    decision_filter = args.get("decision_filter", "all")

    try:
        from db.repository import ArbiterRepository
        repo = ArbiterRepository()
        async with repo:
            tickets = await repo.list_tickets(limit=limit, decision_filter=decision_filter)
        return [TextContent(type="text", text=json.dumps(tickets, indent=2, default=str))]
    except Exception as exc:
        return [TextContent(type="text", text=json.dumps({"error": str(exc), "tickets": []}))]


async def _get_metrics() -> list[TextContent]:
    """Return benchmark metrics and live audit stats."""
    benchmark = {
        "benchmark_dataset": "benchmark_ground_truth.csv",
        "benchmark_n": 40,
        "classification_accuracy": "77.5% (31/40)",
        "auto_resolution_rate": "20.0% (8/40)",
        "escalation_rate": "80.0% (32/40)",
        "false_positive_auto_resolutions": "0/40 (0.0%)",
        "genuine_risk_tickets_caught": "8/8 (100%)",
        "risk_trap_tickets_cleared": "6/6 (100%)",
        "mean_time_to_triage_seconds": 1.19,
        "median_time_to_triage_seconds": 1.03,
        "llm_classification": "Groq openai/gpt-oss-20b",
        "embedding_model": "all-MiniLM-L6-v2 (ChromaDB)",
    }

    live: dict[str, Any] = {"live_stats": "database unavailable in offline mode"}
    try:
        from db.repository import ArbiterRepository
        repo = ArbiterRepository()
        async with repo:
            live = await repo.get_summary_stats()
    except Exception:
        pass

    return [TextContent(type="text", text=json.dumps({**benchmark, **live}, indent=2))]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _severity_label(trust_score: float, risk_override: bool) -> str:
    if risk_override:
        return "P0_CRITICAL"
    if trust_score < 0.50:
        return "P1_HIGH"
    if trust_score < 0.75:
        return "P2_MEDIUM"
    return "P3_LOW"


def _jira_priority(risk_override: bool, trust_score: float) -> str:
    if risk_override:
        return "Blocker"
    if trust_score < 0.50:
        return "High"
    if trust_score < 0.75:
        return "Medium"
    return "Low"


def _offline_triage(ticket_id: str, ticket_text: str) -> dict[str, Any]:
    """
    Deterministic offline mock — used when no credentials are configured.
    Detects risk keywords to demonstrate the safety override logic.
    """
    text_lower = ticket_text.lower()
    risk_flags = [
        kw for kw in ("production", "security", "billing", "data_loss", "data loss")
        if kw in text_lower
    ]
    risk_override = bool(risk_flags)
    trust_score = 0.0 if risk_override else 0.82
    decision = "escalate" if risk_override else "auto_resolve"

    return {
        "ticket_id": ticket_id,
        "mode": "offline_demo",
        "note": (
            "Running in offline/demo mode — no Jira/Groq/ChromaDB credentials configured. "
            "Risk keyword detection is active; full semantic retrieval and LLM classification "
            "require credentials."
        ),
        "category": "unknown (offline)",
        "severity": _severity_label(trust_score, risk_override),
        "trust_score": trust_score,
        "risk_override": risk_override,
        "risk_flags": risk_flags,
        "decision": decision,
        "retrieval_score": 0.0,
        "llm_confidence": 0.0,
        "reasoning": (
            f"Offline mode: risk_override={'True' if risk_override else 'False'}. "
            f"Detected risk flags: {risk_flags or 'none'}."
        ),
        "jira_priority": _jira_priority(risk_override, trust_score),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
