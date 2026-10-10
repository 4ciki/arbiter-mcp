"""
State definition for Arbiter LangGraph workflow.
"""

from __future__ import annotations

from typing import Optional, TypedDict

from llm.base import ClassificationResult, SummaryResult
from schemas import Decision, SimilarCase, Ticket, TrustScore


class AgentState(TypedDict, total=False):
    """
    Mutable state passed between nodes in the Arbiter graph.
    All fields are optional / total=False so nodes can incrementally
    populate state.
    """
    ticket: Ticket
    classification: Optional[ClassificationResult]
    similar_cases: list[SimilarCase]
    trust_score: Optional[TrustScore]
    decision: Optional[Decision]
    decision_id: Optional[int]
    summary: Optional[SummaryResult]
    slack_ts: Optional[str]
    human_response: Optional[str]
    error: Optional[str]
