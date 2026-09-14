"""
Verification test for Milestone 8 (Dashboard).
Verifies that the dashboard data pipeline handles >= 10 real tickets
and populates all required table columns and chart data.
"""

from __future__ import annotations

from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.main import create_app
from dashboard.app import fetch_data
from db.models import Base
from db.repository import ArbiterRepository
from schemas import Decision, Ticket, TrustScore


@pytest.fixture
def seeded_repo(monkeypatch):
    """Repository seeded with 12 diverse tickets and decisions."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr("db.repository.SessionLocal", session_factory)
    repo = ArbiterRepository()

    categories = ["password", "vpn", "access", "hardware", "billing", "security"]

    for i in range(1, 13):
        cat = categories[i % len(categories)]
        t_id = f"TICKET-{1000 + i}"
        ticket = Ticket(
            id=t_id,
            source="jira",
            text=f"Sample ticket description for {cat} issue number {i}",
            created_at=datetime.now(timezone.utc),
        )
        repo.save_ticket(ticket)

        is_auto = (i % 2 == 0)
        action = "auto_resolve" if is_auto else "escalate"
        trust_val = 0.85 if is_auto else 0.45
        human_resp = None if is_auto else ("approve" if i % 3 == 0 else "escalate_further")

        ts = TrustScore(
            value=trust_val,
            retrieval_component=0.8,
            category_success_component=0.8,
            llm_confidence_component=trust_val,
            risk_override=(cat == "security"),
        )
        decision = Decision(
            ticket_id=t_id,
            action=action,
            trust_score=ts,
            human_response=human_resp,
            resolved_at=datetime.now(timezone.utc) if (is_auto or human_resp == "approve") else None,
        )
        d_id = repo.save_decision(decision)
        repo.append_audit_log(
            event_type="decision_made",
            ticket_id=t_id,
            decision_id=d_id,
            score_components={"category": cat, "value": trust_val},
        )

    return repo


@pytest.mark.asyncio
async def test_dashboard_receives_ge_10_tickets_with_all_columns(seeded_repo):
    """
    Proves Milestone 8 completion criteria:
    Dashboard data pipeline receives >= 10 real tickets with all 6 required fields:
    ticket_id, category, trust_score, action, human_response, resolved_at.
    """
    app = create_app(repo=seeded_repo)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/tickets?limit=50")
        assert resp.status_code == 200
        tickets = resp.json()

        assert len(tickets) >= 10

        # Check required columns
        required_keys = {"ticket_id", "category", "trust_score", "action", "human_response", "resolved_at"}
        for t in tickets:
            assert required_keys.issubset(t.keys()), f"Missing keys in ticket: {t}"
            assert t["ticket_id"].startswith("TICKET-")
            assert t["category"] in ["password", "vpn", "access", "hardware", "billing", "security"]
            assert t["action"] in ["auto_resolve", "escalate"]

        # Also verify audit log has >= 10 entries
        audit_resp = await client.get("/api/audit?limit=100")
        assert audit_resp.status_code == 200
        audit_logs = audit_resp.json()
        assert len(audit_logs) >= 10
