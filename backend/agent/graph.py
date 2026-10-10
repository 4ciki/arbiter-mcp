"""
LangGraph graph definition and execution engine for Arbiter (§2.8).

Wires nodes into a StateGraph:
  START -> classify -> retrieve -> score -> decide
  decide -> [conditional edge]:
      -> act_auto -> END
      -> act_escalate -> [interrupt] -> human_feedback -> END

Checkpointer:
  Default production checkpointer is AsyncSqliteSaver backed by settings.DATABASE_URL.
  MemorySaver is used by default in create_graph() if no checkpointer is supplied,
  providing instant isolation for tests and ad-hoc runs.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import aiosqlite
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, StateGraph

from agent.nodes import AgentNodes
from agent.state import AgentState
from config import settings
from schemas import Ticket

log = logging.getLogger(__name__)


def _extract_sqlite_path(database_url: str) -> str:
    """Strip SQLAlchemy prefix to get the raw SQLite file path."""
    if database_url.startswith("sqlite:///"):
        return database_url[len("sqlite:///") :]
    if database_url.startswith("sqlite://"):
        return database_url[len("sqlite://") :]
    return database_url


def create_graph(
    nodes: Optional[AgentNodes] = None,
    checkpointer: Optional[BaseCheckpointSaver] = None,
):
    """
    Construct and compile the Arbiter StateGraph.

    Args:
        nodes: AgentNodes instance containing the business logic and adapters.
               If None, a default AgentNodes instance is created.
        checkpointer: LangGraph checkpointer for state persistence and interrupts.
                      If None, an in-memory MemorySaver is used.
    """
    if nodes is None:
        nodes = AgentNodes()

    if checkpointer is None:
        checkpointer = MemorySaver()

    workflow = StateGraph(AgentState)

    # Register nodes
    workflow.add_node("classify", nodes.classify_node)
    workflow.add_node("retrieve", nodes.retrieve_node)
    workflow.add_node("score", nodes.score_node)
    workflow.add_node("decide", nodes.decide_node)
    workflow.add_node("act_auto", nodes.act_auto_node)
    workflow.add_node("act_escalate", nodes.act_escalate_node)
    workflow.add_node("human_feedback", nodes.human_feedback_node)

    # Wire edges
    workflow.add_edge(START, "classify")
    workflow.add_edge("classify", "retrieve")
    workflow.add_edge("retrieve", "score")
    workflow.add_edge("score", "decide")

    # Conditional branch from decide
    workflow.add_conditional_edges(
        "decide",
        nodes.route_decision,
        {
            "act_auto": "act_auto",
            "act_escalate": "act_escalate",
        },
    )

    # Resolution paths
    workflow.add_edge("act_auto", END)
    workflow.add_edge("act_escalate", "human_feedback")
    workflow.add_edge("human_feedback", END)

    # Compile with interrupt after act_escalate so human review can happen
    app = workflow.compile(
        checkpointer=checkpointer,
        interrupt_after=["act_escalate"],
    )
    return app


# ── Global Default Graph Management ──────────────────────────────────────────

_default_graph: Optional[Any] = None
_default_sqlite_conn: Optional[aiosqlite.Connection] = None


async def get_default_graph():
    """
    Returns the application-level compiled graph with persistent SQLite checkpointer.
    Initializes on first call.
    """
    global _default_graph, _default_sqlite_conn
    if _default_graph is None:
        db_path = "checkpoints.db"
        log.info("Initializing persistent AsyncSqliteSaver at %s", db_path)
        _default_sqlite_conn = await aiosqlite.connect(db_path, timeout=30.0)
        await _default_sqlite_conn.execute("PRAGMA journal_mode=WAL")
        await _default_sqlite_conn.execute("PRAGMA busy_timeout=30000")
        saver = AsyncSqliteSaver(_default_sqlite_conn)
        await saver.setup()
        _default_graph = create_graph(checkpointer=saver)
    return _default_graph


async def run_graph(
    ticket: Ticket,
    thread_id: str,
    graph: Optional[Any] = None,
) -> AgentState:
    """
    Start or continue a ticket run through the Arbiter graph.

    Args:
        ticket: Incoming Ticket schema.
        thread_id: Unique thread ID for LangGraph checkpointing (e.g. ticket-<id>).
        graph: Optional compiled graph to use (defaults to global default graph).

    Returns:
        The final or paused AgentState.
    """
    app = graph or await get_default_graph()
    config = {"configurable": {"thread_id": thread_id}}
    log.info("run_graph: starting run for ticket %s (thread %s)", ticket.id, thread_id)
    result = await app.ainvoke({"ticket": ticket}, config=config)
    return result


async def resume_graph(
    thread_id: str,
    human_response: str,
    graph: Optional[Any] = None,
) -> AgentState:
    """
    Resume an interrupted ticket run after human action in Slack.

    Args:
        thread_id: Unique thread ID matching the paused ticket.
        human_response: Action taken by human ("approve", "edit", "escalate_further").
        graph: Optional compiled graph to use (defaults to global default graph).

    Returns:
        The final AgentState after human_feedback execution.
    """
    app = graph or await get_default_graph()
    config = {"configurable": {"thread_id": thread_id}}
    log.info(
        "resume_graph: resuming thread %s with response %s",
        thread_id,
        human_response,
    )
    await app.aupdate_state(config, {"human_response": human_response})
    result = await app.ainvoke(None, config=config)
    return result
