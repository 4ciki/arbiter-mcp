"""
Round-trip write/read tests for all four DB tables.

All tests run against an in-memory SQLite database that is created fresh
for each test function (via the `repo` fixture). No .env file is required —
required Settings fields are injected as environment variables by the
`env_setup` fixture before any import of config.py occurs.

Milestone 2 is DONE when every test in this file passes.
"""

from __future__ import annotations

import os
import pytest

# ── Inject dummy env vars BEFORE config.py is imported ────────────────────────
# pydantic-settings reads env at import time, so these must be set first.
os.environ.setdefault("JIRA_SITE_URL", "https://test.atlassian.net")
os.environ.setdefault("JIRA_EMAIL", "test@example.com")
os.environ.setdefault("JIRA_API_TOKEN", "dummy-token")
os.environ.setdefault("SLACK_BOT_TOKEN", "xoxb-dummy")
os.environ.setdefault("SLACK_SIGNING_SECRET", "dummy-secret")
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "/tmp/dummy.json")
os.environ.setdefault("GCP_PROJECT_ID", "dummy-project")
os.environ.setdefault("GROQ_API_KEY", "dummy-groq-key")

from datetime import datetime, timezone

from sqlalchemy import create_engine, event as sa_event
from sqlalchemy.orm import sessionmaker

from db.models import Base
from db.repository import ArbiterRepository
from schemas import Decision, Ticket, TrustScore


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def repo(monkeypatch):
    """
    Yield an ArbiterRepository backed by a fresh in-memory SQLite database.
    Each test gets a completely isolated schema — no cross-test contamination.
    """
    in_memory_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    # Enable FK enforcement for in-memory SQLite too
    @sa_event.listens_for(in_memory_engine, "connect")
    def _enable_fk(conn, _rec):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(bind=in_memory_engine)
    InMemorySession = sessionmaker(bind=in_memory_engine, autocommit=False, autoflush=False)

    # Patch SessionLocal inside the repository module for this test
    monkeypatch.setattr("db.repository.SessionLocal", InMemorySession)

    return ArbiterRepository()


def _make_ticket(ticket_id: str = "TEST-1") -> Ticket:
    return Ticket(
        id=ticket_id,
        source="jira",
        text="User cannot reset their password via the self-service portal.",
        created_at=datetime(2026, 9, 12, 10, 0, 0, tzinfo=timezone.utc),
    )


def _make_trust_score(risk_override: bool = False, value: float = 0.82) -> TrustScore:
    return TrustScore(
        value=value,
        retrieval_component=0.90,
        category_success_component=0.80,
        llm_confidence_component=0.70,
        risk_override=risk_override,
    )


def _make_decision(ticket_id: str = "TEST-1", action: str = "auto_resolve") -> Decision:
    return Decision(
        ticket_id=ticket_id,
        action=action,  # type: ignore[arg-type]
        trust_score=_make_trust_score(),
    )


# ── tickets table ──────────────────────────────────────────────────────────────

class TestTickets:
    def test_save_and_get(self, repo):
        ticket = _make_ticket()
        repo.save_ticket(ticket)
        fetched = repo.get_ticket("TEST-1")
        assert fetched is not None
        assert fetched.id == "TEST-1"
        assert fetched.source == "jira"
        assert fetched.text == ticket.text
        # Timezone must be restored on read
        assert fetched.created_at.tzinfo is not None

    def test_get_nonexistent_returns_none(self, repo):
        assert repo.get_ticket("DOES-NOT-EXIST") is None

    def test_save_is_idempotent(self, repo):
        """Saving the same ticket twice should update, not duplicate."""
        repo.save_ticket(_make_ticket())
        updated = Ticket(
            id="TEST-1",
            source="jira",
            text="Updated text",
            created_at=datetime(2026, 9, 12, 11, 0, 0, tzinfo=timezone.utc),
        )
        repo.save_ticket(updated)
        fetched = repo.get_ticket("TEST-1")
        assert fetched.text == "Updated text"


# ── decisions table ───────────────────────────────────────────────────────────

class TestDecisions:
    def test_save_and_get(self, repo):
        repo.save_ticket(_make_ticket())
        decision_id = repo.save_decision(_make_decision())
        assert isinstance(decision_id, int)
        fetched = repo.get_decision(decision_id)
        assert fetched is not None
        assert fetched.ticket_id == "TEST-1"
        assert fetched.action == "auto_resolve"
        assert fetched.trust_score.value == pytest.approx(0.82)
        assert fetched.trust_score.risk_override is False

    def test_get_nonexistent_returns_none(self, repo):
        assert repo.get_decision(99999) is None

    def test_trust_score_fields_round_trip(self, repo):
        """All five TrustScore fields must survive the ORM round-trip."""
        repo.save_ticket(_make_ticket())
        ts = TrustScore(
            value=0.55,
            retrieval_component=0.60,
            category_success_component=0.50,
            llm_confidence_component=0.55,
            risk_override=True,
        )
        decision = Decision(ticket_id="TEST-1", action="escalate", trust_score=ts)
        decision_id = repo.save_decision(decision)
        fetched = repo.get_decision(decision_id)
        assert fetched.trust_score.retrieval_component == pytest.approx(0.60)
        assert fetched.trust_score.category_success_component == pytest.approx(0.50)
        assert fetched.trust_score.llm_confidence_component == pytest.approx(0.55)
        assert fetched.trust_score.risk_override is True

    def test_update_human_response(self, repo):
        repo.save_ticket(_make_ticket())
        decision_id = repo.save_decision(_make_decision(action="escalate"))
        repo.update_human_response(decision_id, "approve")
        fetched = repo.get_decision(decision_id)
        assert fetched.human_response == "approve"
        assert fetched.resolved_at is not None

    def test_list_decisions_paginated(self, repo):
        repo.save_ticket(_make_ticket())
        for _ in range(5):
            repo.save_decision(_make_decision())
        page1 = repo.list_decisions(offset=0, limit=3)
        page2 = repo.list_decisions(offset=3, limit=3)
        assert len(page1) == 3
        assert len(page2) == 2


# ── category_stats table ──────────────────────────────────────────────────────

class TestCategoryStats:
    def test_cold_start_returns_none(self, repo):
        """A category with no data must return None, not a zero row."""
        assert repo.get_category_stats("password") is None

    def test_first_increment_creates_row(self, repo):
        repo.increment_category_stats("password", human_agreed=True)
        row = repo.get_category_stats("password")
        assert row is not None
        assert row.total_handled == 1
        assert row.human_agreed_count == 1

    def test_increment_accumulates(self, repo):
        for agreed in [True, True, False, True]:
            repo.increment_category_stats("vpn", human_agreed=agreed)
        row = repo.get_category_stats("vpn")
        assert row.total_handled == 4
        assert row.human_agreed_count == 3

    def test_human_disagreement_not_counted(self, repo):
        repo.increment_category_stats("hardware", human_agreed=False)
        row = repo.get_category_stats("hardware")
        assert row.total_handled == 1
        assert row.human_agreed_count == 0


# ── audit_log table ───────────────────────────────────────────────────────────

class TestAuditLog:
    def test_append_and_list(self, repo):
        event_id = repo.append_audit_log(
            event_type="decision_made",
            ticket_id="TEST-1",
            decision_id=42,
            score_components={"value": 0.82, "risk_override": False},
        )
        assert isinstance(event_id, int)
        entries = repo.list_audit_log()
        assert len(entries) == 1
        entry = entries[0]
        assert entry["event_type"] == "decision_made"
        assert entry["ticket_id"] == "TEST-1"
        assert entry["score_components"]["value"] == pytest.approx(0.82)
        assert entry["created_at"].tzinfo is not None  # UTC restored on read

    def test_multiple_events_ordered_oldest_first(self, repo):
        repo.append_audit_log(event_type="first")
        repo.append_audit_log(event_type="second")
        repo.append_audit_log(event_type="third")
        entries = repo.list_audit_log()
        assert [e["event_type"] for e in entries] == ["first", "second", "third"]

    def test_audit_log_has_no_mutating_methods(self):
        """
        The repository must not expose update or delete methods for audit_log.
        This is a static check — if someone adds them, this test breaks and
        forces a deliberate code review.
        """
        public_methods = [m for m in dir(ArbiterRepository) if not m.startswith("_")]
        audit_mutators = [
            m for m in public_methods
            if "audit" in m and any(verb in m for verb in ("update", "delete", "remove", "clear"))
        ]
        assert audit_mutators == [], (
            f"audit_log must be append-only. Found mutating methods: {audit_mutators}"
        )

    def test_pagination(self, repo):
        for i in range(10):
            repo.append_audit_log(event_type=f"event_{i}")
        page1 = repo.list_audit_log(offset=0, limit=4)
        page2 = repo.list_audit_log(offset=4, limit=4)
        page3 = repo.list_audit_log(offset=8, limit=4)
        assert len(page1) == 4
        assert len(page2) == 4
        assert len(page3) == 2
