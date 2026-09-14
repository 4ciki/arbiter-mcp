"""
Integration tests for the LangGraph agent workflow (Milestone 6).

Verifies the entire lifecycle of tickets flowing through the graph:
1. Auto-resolution flow (end-to-end)
2. Escalation + interrupt + human resume flow (end-to-end)
3. Safety risk-override invariant (high confidence ticket with risk flag escalates)
4. Persistent AsyncSqliteSaver checkpointer persistence across resume
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import aiosqlite
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from adapters.base import ChatSink, TicketSource
from agent.graph import create_graph, resume_graph, run_graph
from agent.nodes import AgentNodes
from config import Settings
from db.models import Base
from db.repository import ArbiterRepository
from llm.base import ClassificationResult, LLMClient, SummaryResult
from retrieval.retrieval import CaseRetriever
from schemas import Decision, SimilarCase, Ticket


# ── Test Mocks ─────────────────────────────────────────────────────────────────

class FakeLLMClient(LLMClient):
    """Deterministic LLM for testing graph behaviors."""

    def __init__(
        self,
        category: str = "password",
        urgency: str = "P3",
        risk_flags: Optional[list[str]] = None,
        confidence: float = 0.95,
        summary_text: str = "Test summary",
        recommended_action: str = "Perform password reset",
    ) -> None:
        self.category = category
        self.urgency = urgency
        self.risk_flags = risk_flags or []
        self.confidence = confidence
        self.summary_text = summary_text
        self.recommended_action = recommended_action

    def classify(self, ticket_text: str) -> ClassificationResult:
        return ClassificationResult(
            category=self.category,
            urgency=self.urgency,
            risk_flags=self.risk_flags,
            confidence=self.confidence,
        )

    def summarize_for_human(
        self, ticket_text: str, similar_cases: list[str]
    ) -> SummaryResult:
        return SummaryResult(
            summary=self.summary_text,
            recommended_action=self.recommended_action,
        )


class FakeTicketSource(TicketSource):
    """In-memory ticket source tracking comments and status changes."""

    def __init__(self) -> None:
        self.comments: list[tuple[str, str]] = []  # (ticket_id, text)
        self.statuses: list[tuple[str, str]] = []  # (ticket_id, status)

    async def get_ticket(self, ticket_id: str) -> Ticket:
        return Ticket(
            id=ticket_id,
            source="jira",
            text="Need help with access",
            created_at=datetime.now(timezone.utc),
        )

    async def add_comment(self, ticket_id: str, text: str) -> None:
        self.comments.append((ticket_id, text))

    async def update_status(self, ticket_id: str, status: str) -> None:
        self.statuses.append((ticket_id, status))


class FakeChatSink(ChatSink):
    """In-memory chat sink tracking posted Slack cards."""

    def __init__(self) -> None:
        self.cards: list[dict] = []

    async def post_card(self, channel: str, summary: str, ticket_id: str) -> str:
        ts = f"slack-ts-{len(self.cards) + 1}"
        self.cards.append({"channel": channel, "summary": summary, "ticket_id": ticket_id, "ts": ts})
        return ts

    async def handle_interaction(self, raw_body: bytes, headers: dict) -> Optional[Decision]:
        return None


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def in_memory_repo(monkeypatch):
    """Isolated repository pointing to an in-memory SQLite database."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    test_session_local = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )
    monkeypatch.setattr("db.repository.SessionLocal", test_session_local)
    return ArbiterRepository()


@pytest.fixture
def temp_retriever(tmp_path):
    """CaseRetriever in an isolated temp directory."""
    return CaseRetriever(chroma_path=str(tmp_path / "chroma"))


@pytest.fixture
def test_settings() -> Settings:
    return Settings(
        JIRA_SITE_URL="https://test.atlassian.net",
        JIRA_EMAIL="test@example.com",
        JIRA_API_TOKEN="token",
        SLACK_BOT_TOKEN="xoxb-test",
        SLACK_SIGNING_SECRET="secret",
        GOOGLE_APPLICATION_CREDENTIALS="/dummy/creds.json",
        GCP_PROJECT_ID="test-project",
        GROQ_API_KEY="gsk-test",
        TRUST_THRESHOLD=0.75,
        COLD_START_SUCCESS_RATE=0.3,
        COLD_START_MIN_SAMPLES=20,
        WEIGHT_RETRIEVAL=0.40,
        WEIGHT_CATEGORY=0.35,
        WEIGHT_LLM_CONFIDENCE=0.25,
    )


# ── Milestone 6 Tests ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_end_to_end_auto_resolve(
    in_memory_repo: ArbiterRepository,
    temp_retriever: CaseRetriever,
    test_settings: Settings,
):
    """
    Validates end-to-end auto-resolve flow:
    - High confidence + high historical similarity + high category success
    - Score exceeds threshold (0.75) and no risk flags
    - Produces logged ClassificationResult and Decision
    - Transitions ticket to Done in Jira
    - Indexes resolved case into ChromaDB
    """
    # Prime retrieval with a similar resolved case
    temp_retriever.add_case(
        ticket_id="PRIOR-1",
        text="Cannot log in to portal forgot password",
        resolution="Reset password via self-service portal.",
    )

    # Prime category stats so category component is high (e.g. 50/50 = 1.0)
    for _ in range(25):
        in_memory_repo.increment_category_stats("password", human_agreed=True)

    llm = FakeLLMClient(
        category="password",
        urgency="P3",
        risk_flags=[],
        confidence=0.95,
    )
    jira = FakeTicketSource()
    slack = FakeChatSink()

    nodes = AgentNodes(
        llm_client=llm,
        retriever=temp_retriever,
        repo=in_memory_repo,
        ticket_source=jira,
        chat_sink=slack,
        settings=test_settings,
    )
    app = create_graph(nodes=nodes)

    ticket = Ticket(
        id="JIRA-101",
        source="jira",
        text="User forgot password and cannot log in to portal",
        created_at=datetime.now(timezone.utc),
    )

    result = await run_graph(ticket, thread_id="ticket-JIRA-101", graph=app)

    # Verify state output
    assert result["classification"].category == "password"
    assert result["classification"].confidence == 0.95
    assert result["trust_score"].value >= 0.75
    assert result["trust_score"].risk_override is False
    assert result["decision"].action == "auto_resolve"
    assert result["decision"].resolved_at is not None

    # Verify Jira actions
    assert len(jira.comments) == 1
    assert "Auto-resolved by Arbiter" in jira.comments[0][1]
    assert len(jira.statuses) == 1
    assert jira.statuses[0] == ("JIRA-101", "Done")

    # Verify Slack was NOT notified (no escalation)
    assert len(slack.cards) == 0

    # Verify DB persistence
    saved_ticket = in_memory_repo.get_ticket("JIRA-101")
    assert saved_ticket is not None
    assert saved_ticket.text == ticket.text

    saved_decision = in_memory_repo.get_decision("JIRA-101")
    assert saved_decision is not None
    assert saved_decision.action == "auto_resolve"

    audit_logs = in_memory_repo.list_audit_log(ticket_id="JIRA-101")
    event_types = [log["event_type"] for log in audit_logs]
    assert "decision_made" in event_types
    assert "auto_resolved" in event_types


@pytest.mark.asyncio
async def test_end_to_end_escalate_and_resume_approve(
    in_memory_repo: ArbiterRepository,
    temp_retriever: CaseRetriever,
    test_settings: Settings,
):
    """
    Validates end-to-end escalation and human resume:
    - Low confidence ticket causes decision="escalate"
    - Graph posts Slack card and interrupts
    - Human approves in Slack -> resume_graph completes run
    - Category stats incremented, Jira updated, resolution indexed
    """
    llm = FakeLLMClient(
        category="vpn",
        urgency="P2",
        risk_flags=[],
        confidence=0.40,  # low confidence forces escalation
        summary_text="User cannot connect to corporate VPN from remote office",
        recommended_action="Restart VPN gateway service on host",
    )
    jira = FakeTicketSource()
    slack = FakeChatSink()

    nodes = AgentNodes(
        llm_client=llm,
        retriever=temp_retriever,
        repo=in_memory_repo,
        ticket_source=jira,
        chat_sink=slack,
        settings=test_settings,
    )
    app = create_graph(nodes=nodes)

    ticket = Ticket(
        id="JIRA-202",
        source="jira",
        text="VPN disconnects repeatedly when connecting to AWS",
        created_at=datetime.now(timezone.utc),
    )

    # ── Step 1: Initial run pauses at interrupt ────────────────────────────────
    paused_result = await run_graph(ticket, thread_id="ticket-JIRA-202", graph=app)

    assert paused_result["decision"].action == "escalate"
    assert len(slack.cards) == 1
    assert slack.cards[0]["ticket_id"] == "JIRA-202"
    assert len(jira.comments) == 0  # no resolution yet

    # Verify initial decision is written to DB
    saved_decision = in_memory_repo.get_decision("JIRA-202")
    assert saved_decision is not None
    assert saved_decision.action == "escalate"
    assert saved_decision.human_response is None

    # ── Step 2: Human clicks Approve ───────────────────────────────────────────
    resumed_result = await resume_graph(
        thread_id="ticket-JIRA-202",
        human_response="approve",
        graph=app,
    )

    assert resumed_result["human_response"] == "approve"

    # Verify Jira resolution
    assert len(jira.comments) == 1
    assert "Resolution approved by human reviewer" in jira.comments[0][1]
    assert len(jira.statuses) == 1
    assert jira.statuses[0] == ("JIRA-202", "Done")

    # Verify DB updated
    updated_decision = in_memory_repo.get_decision("JIRA-202")
    assert updated_decision is not None
    assert updated_decision.human_response == "approve"

    # Category stats should reflect human agreement
    stats = in_memory_repo.get_category_stats("vpn")
    assert stats is not None
    assert stats.total_handled == 1
    assert stats.human_agreed_count == 1

    # Case should now be indexed in retrieval
    similar = temp_retriever.find_similar("VPN disconnects repeatedly")
    assert len(similar) >= 1


@pytest.mark.asyncio
async def test_end_to_end_escalate_and_resume_escalate_further(
    in_memory_repo: ArbiterRepository,
    temp_retriever: CaseRetriever,
    test_settings: Settings,
):
    """
    Validates human clicking "Escalate Further":
    - Category stats increments total_handled but NOT human_agreed_count
    - Audit log records human_escalated_further
    """
    llm = FakeLLMClient(
        category="hardware",
        confidence=0.30,
        summary_text="Server motherboard blinking red",
        recommended_action="Dispatch field technician",
    )
    jira = FakeTicketSource()
    slack = FakeChatSink()

    nodes = AgentNodes(
        llm_client=llm,
        retriever=temp_retriever,
        repo=in_memory_repo,
        ticket_source=jira,
        chat_sink=slack,
        settings=test_settings,
    )
    app = create_graph(nodes=nodes)

    ticket = Ticket(
        id="JIRA-303",
        source="jira",
        text="Physical server rack 4 motherboard dead",
        created_at=datetime.now(timezone.utc),
    )

    await run_graph(ticket, thread_id="ticket-JIRA-303", graph=app)

    resumed_result = await resume_graph(
        thread_id="ticket-JIRA-303",
        human_response="escalate_further",
        graph=app,
    )

    assert resumed_result["human_response"] == "escalate_further"
    assert len(jira.comments) == 1
    assert "escalated further" in jira.comments[0][1].lower()

    # Category stats: disagreement
    stats = in_memory_repo.get_category_stats("hardware")
    assert stats is not None
    assert stats.total_handled == 1
    assert stats.human_agreed_count == 0

    audit_logs = in_memory_repo.list_audit_log(ticket_id="JIRA-303")
    events = [entry["event_type"] for entry in audit_logs]
    assert "human_escalated_further" in events


@pytest.mark.asyncio
async def test_safety_risk_override_forces_escalation(
    in_memory_repo: ArbiterRepository,
    temp_retriever: CaseRetriever,
    test_settings: Settings,
):
    """
    SAFETY-CRITICAL TEST (§2.6, §2.8):
    Even if confidence=1.0, similarity=1.0, and category stats=100%,
    a risk keyword in risk_flags ("production", "security", "data_loss")
    MUST FORCE ESCALATION. No auto-resolution is ever permitted.
    """
    # Prime retrieval with identical case (1.0 similarity)
    temp_retriever.add_case(
        ticket_id="PRIOR-RISK",
        text="Production database disk full deleting logs",
        resolution="Expand volume and archive WAL logs.",
    )
    # Prime category stats (100% agreement)
    for _ in range(25):
        in_memory_repo.increment_category_stats("database", human_agreed=True)

    llm = FakeLLMClient(
        category="database",
        urgency="P1",
        risk_flags=["production", "data_loss"],  # Safety risk flags!
        confidence=1.0,
    )
    jira = FakeTicketSource()
    slack = FakeChatSink()

    nodes = AgentNodes(
        llm_client=llm,
        retriever=temp_retriever,
        repo=in_memory_repo,
        ticket_source=jira,
        chat_sink=slack,
        settings=test_settings,
    )
    app = create_graph(nodes=nodes)

    ticket = Ticket(
        id="JIRA-RISK-999",
        source="jira",
        text="Production database disk full deleting logs immediately",
        created_at=datetime.now(timezone.utc),
    )

    result = await run_graph(ticket, thread_id="ticket-JIRA-RISK-999", graph=app)

    # Invariants:
    # 1. TrustScore indicates risk_override
    assert result["trust_score"].risk_override is True
    # 2. Decision MUST be escalate
    assert result["decision"].action == "escalate"
    # 3. Jira ticket was NOT marked Done
    assert len(jira.statuses) == 0
    # 4. Slack card WAS posted for human review
    assert len(slack.cards) == 1
    assert slack.cards[0]["ticket_id"] == "JIRA-RISK-999"


@pytest.mark.asyncio
async def test_persistent_sqlite_checkpointer(
    in_memory_repo: ArbiterRepository,
    temp_retriever: CaseRetriever,
    test_settings: Settings,
    tmp_path,
):
    """
    Validates that AsyncSqliteSaver persists graph state to disk
    so interrupts survive process lifecycles.
    """
    db_file = str(tmp_path / "checkpoints.db")
    async with aiosqlite.connect(db_file) as conn:
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
        saver = AsyncSqliteSaver(conn)
        await saver.setup()

        llm = FakeLLMClient(confidence=0.2)
        jira = FakeTicketSource()
        slack = FakeChatSink()

        nodes = AgentNodes(
            llm_client=llm,
            retriever=temp_retriever,
            repo=in_memory_repo,
            ticket_source=jira,
            chat_sink=slack,
            settings=test_settings,
        )
        app = create_graph(nodes=nodes, checkpointer=saver)

        ticket = Ticket(
            id="JIRA-SQLITE-1",
            source="jira",
            text="Need database restore",
            created_at=datetime.now(timezone.utc),
        )

        thread_id = "thread-sqlite-1"
        paused = await run_graph(ticket, thread_id=thread_id, graph=app)
        assert paused["decision"].action == "escalate"

        # Resume using the same checkpointer
        resumed = await resume_graph(
            thread_id=thread_id,
            human_response="approve",
            graph=app,
        )
        assert resumed["human_response"] == "approve"
        assert len(jira.comments) == 1
