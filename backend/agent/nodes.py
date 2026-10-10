"""
Graph nodes for the Arbiter LangGraph workflow (§2.8).

Each function is a pure node that accepts and returns an AgentState dictionary.
Nodes delegate to the appropriate subsystems:
  - classify_node:        llm/
  - retrieve_node:        retrieval/
  - score_node:           scoring/
  - decide_node:          scoring/ + db/
  - act_auto_node:        adapters/ + db/ + retrieval/
  - act_escalate_node:    llm/ + adapters/ + db/
  - human_feedback_node:  adapters/ + db/ + retrieval/
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal, Optional

from adapters.base import ChatSink, TicketSource
from adapters.jira_adapter import JiraMCPAdapter
from adapters.slack_adapter import SlackMCPAdapter
from agent.state import AgentState
from config import Settings, settings as default_settings
from db.repository import ArbiterRepository
from llm.base import ClassificationResult, LLMClient, SummaryResult
from llm.router import RoutedLLMClient
from retrieval.retrieval import CaseRetriever
from schemas import Decision, SimilarCase, Ticket, TrustScore
from scoring.trust_scorer import compute_trust_score, decide

log = logging.getLogger(__name__)


class AgentNodes:
    """
    Encapsulates all node actions with injected dependencies.
    Allows easy unit and integration testing with mocked backends.
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        retriever: Optional[CaseRetriever] = None,
        repo: Optional[ArbiterRepository] = None,
        ticket_source: Optional[TicketSource] = None,
        chat_sink: Optional[ChatSink] = None,
        settings: Optional[Settings] = None,
        slack_channel: Optional[str] = None,
    ) -> None:
        self.settings = settings or default_settings
        self.llm_client = llm_client
        self.retriever = retriever
        self.repo = repo or ArbiterRepository()
        self.ticket_source = ticket_source
        self.chat_sink = chat_sink
        self.slack_channel = slack_channel or getattr(self.settings, "SLACK_CHANNEL", "#it-escalations")

    def _get_llm_client(self) -> LLMClient:
        if self.llm_client is None:
            self.llm_client = RoutedLLMClient()
        return self.llm_client

    def _get_retriever(self) -> CaseRetriever:
        if self.retriever is None:
            self.retriever = CaseRetriever(chroma_path=self.settings.CHROMA_PATH)
        return self.retriever

    def _get_ticket_source(self) -> TicketSource:
        if self.ticket_source is None:
            self.ticket_source = JiraMCPAdapter()
        return self.ticket_source

    def _get_chat_sink(self) -> ChatSink:
        if self.chat_sink is None:
            self.chat_sink = SlackMCPAdapter()
        return self.chat_sink

    # ── Node Implementations ──────────────────────────────────────────────────

    async def classify_node(self, state: AgentState) -> dict:
        """Calls LLMClient.classify and records ticket to DB."""
        ticket: Ticket = state["ticket"]
        log.info("classify_node: classifying ticket %s", ticket.id)
        llm = self._get_llm_client()
        classification: ClassificationResult = llm.classify(ticket.text)

        # Ensure ticket is stored in DB
        self.repo.save_ticket(ticket)
        return {"classification": classification}

    async def retrieve_node(self, state: AgentState) -> dict:
        """Finds top-k similar historical cases from ChromaDB."""
        ticket: Ticket = state["ticket"]
        log.info("retrieve_node: searching similar cases for %s", ticket.id)
        retriever = self._get_retriever()
        similar_cases: list[SimilarCase] = retriever.find_similar(
            ticket.text, n_results=5
        )
        return {"similar_cases": similar_cases}

    async def score_node(self, state: AgentState) -> dict:
        """Computes combined trust score and evaluates risk flags."""
        classification = state["classification"]
        if classification is None:
            raise ValueError("State is missing classification result.")
        similar_cases = state.get("similar_cases", [])

        category_stats = self.repo.get_category_stats(classification.category)
        trust_score: TrustScore = compute_trust_score(
            similar_cases=similar_cases,
            classification=classification,
            category_stats=category_stats,
            settings=self.settings,
        )
        log.info(
            "score_node: ticket %s got score=%.3f (risk_override=%s)",
            state["ticket"].id,
            trust_score.value,
            trust_score.risk_override,
        )
        return {"trust_score": trust_score}

    async def decide_node(self, state: AgentState) -> dict:
        """
        Decides whether to auto-resolve or escalate.
        Writes decision and audit log BEFORE taking any external action.
        """
        ticket: Ticket = state["ticket"]
        trust_score: TrustScore = state["trust_score"]  # type: ignore[assignment]
        action = decide(trust_score, threshold=self.settings.TRUST_THRESHOLD)

        decision = Decision(
            ticket_id=ticket.id,
            action=action,
            trust_score=trust_score,
        )
        decision_id = self.repo.save_decision(decision)
        category = state["classification"].category if state.get("classification") else "general"
        self.repo.append_audit_log(
            event_type="decision_made",
            ticket_id=ticket.id,
            decision_id=decision_id,
            score_components={**trust_score.model_dump(), "category": category},
        )
        log.info(
            "decide_node: ticket %s action=%s (decision_id=%d)",
            ticket.id,
            action,
            decision_id,
        )
        return {"decision": decision, "decision_id": decision_id}

    def route_decision(
        self, state: AgentState
    ) -> Literal["act_auto", "act_escalate"]:
        """Conditional edge: routes to act_auto or act_escalate based on decision."""
        decision = state.get("decision")
        if decision and decision.action == "auto_resolve":
            return "act_auto"
        return "act_escalate"

    async def act_auto_node(self, state: AgentState) -> dict:
        """
        Auto-resolves the ticket:
        Adds resolution comment, transitions ticket to Done,
        records resolution in DB and audit log, and indexes resolved case in ChromaDB.
        """
        ticket: Ticket = state["ticket"]
        trust_score: TrustScore = state["trust_score"]  # type: ignore[assignment]
        classification: ClassificationResult = state["classification"]  # type: ignore[assignment]
        similar_cases: list[SimilarCase] = state.get("similar_cases", [])

        ticket_src = self._get_ticket_source()
        retriever = self._get_retriever()

        resolution = (
            similar_cases[0].resolution
            if similar_cases
            else f"Automated resolution applied for {classification.category}."
        )
        comment = (
            f"Auto-resolved by Arbiter (trust score: {trust_score.value:.2f}).\n"
            f"Resolution: {resolution}"
        )

        log.info("act_auto_node: executing auto-resolve for %s", ticket.id)
        await ticket_src.add_comment(ticket.id, comment)
        await ticket_src.update_status(ticket.id, "Done")

        now_utc = datetime.now(timezone.utc)
        decision_id = state.get("decision_id")
        if decision_id is not None:
            self.repo.mark_decision_resolved(decision_id, resolved_at=now_utc)
        resolved_decision = Decision(
            ticket_id=ticket.id,
            action="auto_resolve",
            trust_score=trust_score,
            resolved_at=now_utc,
        )

        self.repo.append_audit_log(
            event_type="auto_resolved",
            ticket_id=ticket.id,
            decision_id=state.get("decision_id"),
            score_components={
                "resolution": resolution,
                "trust_value": trust_score.value,
            },
        )

        # Index into ChromaDB so system learns from this case
        retriever.add_case(
            ticket_id=ticket.id,
            text=ticket.text,
            resolution=resolution,
        )

        return {"decision": resolved_decision}

    async def act_escalate_node(self, state: AgentState) -> dict:
        """
        Escalates ticket to human review:
        Generates summary, posts interactive Slack card, and writes audit log.
        Graph interrupts after this node to wait for human interaction.
        """
        ticket: Ticket = state["ticket"]
        similar_cases: list[SimilarCase] = state.get("similar_cases", [])
        case_resolutions = [c.resolution for c in similar_cases]

        llm = self._get_llm_client()
        chat_sink = self._get_chat_sink()

        log.info("act_escalate_node: generating human summary for %s", ticket.id)
        summary = llm.summarize_for_human(ticket.text, case_resolutions)

        log.info("act_escalate_node: posting Slack card for %s", ticket.id)
        slack_ts = await chat_sink.post_card(
            channel=self.slack_channel,
            summary=summary.summary,
            ticket_id=ticket.id,
        )

        self.repo.append_audit_log(
            event_type="escalated_to_human",
            ticket_id=ticket.id,
            decision_id=state.get("decision_id"),
            score_components={
                "slack_ts": slack_ts,
                "recommended_action": summary.recommended_action,
            },
        )

        return {"summary": summary, "slack_ts": slack_ts}

    async def human_feedback_node(self, state: AgentState) -> dict:
        """
        Resumed node after human clicks Approve, Edit, or Escalate Further in Slack.
        Updates DB, category statistics, Jira status, and audit log.
        """
        ticket: Ticket = state["ticket"]
        human_response = state.get("human_response")
        classification = state.get("classification")
        summary = state.get("summary")

        log.info(
            "human_feedback_node: processing human_response=%s for %s",
            human_response,
            ticket.id,
        )

        if not human_response:
            return {}

        ticket_src = self._get_ticket_source()
        retriever = self._get_retriever()

        # Update decision row
        decision_id = state.get("decision_id") or ticket.id
        self.repo.update_human_response(decision_id, human_response)

        if human_response == "approve":
            rec = (
                summary.recommended_action
                if summary
                else "Resolution approved by human agent."
            )
            await ticket_src.add_comment(
                ticket.id, f"Resolution approved by human reviewer.\nAction: {rec}"
            )
            await ticket_src.update_status(ticket.id, "Done")

            if classification:
                self.repo.increment_category_stats(
                    classification.category, human_agreed=True
                )

            self.repo.append_audit_log(
                event_type="human_approved",
                ticket_id=ticket.id,
                decision_id=state.get("decision_id"),
                score_components={"human_response": "approve"},
            )
            retriever.add_case(ticket.id, ticket.text, rec)

        elif human_response == "escalate_further":
            await ticket_src.add_comment(
                ticket.id, "Ticket escalated further by human reviewer."
            )
            if classification:
                self.repo.increment_category_stats(
                    classification.category, human_agreed=False
                )

            self.repo.append_audit_log(
                event_type="human_escalated_further",
                ticket_id=ticket.id,
                decision_id=state.get("decision_id"),
                score_components={"human_response": "escalate_further"},
            )

        elif human_response == "edit":
            await ticket_src.add_comment(
                ticket.id, "Resolution edited and approved by human reviewer."
            )
            await ticket_src.update_status(ticket.id, "Done")
            if classification:
                self.repo.increment_category_stats(
                    classification.category, human_agreed=False
                )

            self.repo.append_audit_log(
                event_type="human_edited",
                ticket_id=ticket.id,
                decision_id=state.get("decision_id"),
                score_components={"human_response": "edit"},
            )

        return {}
