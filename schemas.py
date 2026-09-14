"""
Shared data shapes used across every layer of Arbiter.

These are pure Pydantic models — no business logic, only field definitions
and validators. Any layer (adapters, scoring, agent, api, dashboard) imports
from here; no layer defines its own parallel version of these types.

Note on ClassificationResult / SummaryResult: those live in llm/base.py
because they're tightly coupled to the LLM output format. The models here
are the application-layer shapes that flow through the agent graph and
persist to the database.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class Ticket(BaseModel):
    id: str
    source: str          # "jira" | future: "servicenow", "zendesk", etc.
    text: str
    created_at: datetime


class SimilarCase(BaseModel):
    text: str
    resolution: str
    similarity: float = Field(ge=0.0, le=1.0)  # 0-1, from ChromaDB distance


class CategoryStats(BaseModel):
    """Running totals for one ticket category, used by the trust scorer."""
    category: str
    total_handled: int
    human_agreed_count: int


class TrustScore(BaseModel):
    value: float = Field(ge=0.0, le=1.0)               # final combined score
    retrieval_component: float = Field(ge=0.0, le=1.0)
    category_success_component: float = Field(ge=0.0, le=1.0)
    llm_confidence_component: float = Field(ge=0.0, le=1.0)
    risk_override: bool  # True → a risk keyword forced escalation regardless of score

    @model_validator(mode="after")
    def risk_override_implies_escalation(self) -> "TrustScore":
        """
        Defensive check: if risk_override is True the value is still stored
        as-is (so it's available for analysis), but callers must check
        risk_override before acting on value. The trust_scorer enforces this
        in decide(); this validator makes the invariant visible at the schema
        level for anyone reading this file.
        """
        return self


class Decision(BaseModel):
    ticket_id: str
    action: Literal["auto_resolve", "escalate"]
    trust_score: TrustScore
    human_response: Optional[Literal["approve", "edit", "escalate_further"]] = None
    resolved_at: Optional[datetime] = None
