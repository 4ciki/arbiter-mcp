"""
Integration and functional tests for the Arbiter FastAPI endpoints (Milestone 7).

Verifies:
1. /health check
2. POST /webhooks/jira starts graph run and returns decision
3. POST /webhooks/slack/interactions enforces raw signature verification (403 on bad signature)
4. POST /webhooks/slack/interactions with valid signature resumes graph and records human response
5. GET /api/tickets pagination
6. GET /api/audit pagination and ticket_id filtering
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from adapters.base import ChatSink, TicketSource
from agent.graph import create_graph
from agent.nodes import AgentNodes
from api.main import create_app
from config import Settings
from db.models import Base
from db.repository import ArbiterRepository
from llm.base import ClassificationResult, LLMClient, SummaryResult
from retrieval.retrieval import CaseRetriever
from schemas import Decision, Ticket


# ── Fakes ──────────────────────────────────────────────────────────────────────

class FakeLLM(LLMClient):
    def __init__(self, category="vpn", confidence=0.4, risk_flags=None):
        self.category = category
        self.confidence = confidence
        self.risk_flags = risk_flags or []

    def classify(self, ticket_text: str) -> ClassificationResult:
        return ClassificationResult(
            category=self.category,
            urgency="P2",
            risk_flags=self.risk_flags,
            confidence=self.confidence,
        )

    def summarize_for_human(self, ticket_text: str, similar_cases: list[str]) -> SummaryResult:
        return SummaryResult(
            summary="VPN gateway unreachable from subnets",
            recommended_action="Restart AWS DirectConnect gateway",
        )


class FakeJira(TicketSource):
    def __init__(self):
        self.comments = []
        self.statuses = []

    async def get_ticket(self, ticket_id: str) -> Ticket:
        return Ticket(id=ticket_id, source="jira", text="test", created_at=datetime.now(timezone.utc))

    async def add_comment(self, ticket_id: str, text: str) -> None:
        self.comments.append((ticket_id, text))

    async def update_status(self, ticket_id: str, status: str) -> None:
        self.statuses.append((ticket_id, status))


class FakeSlack(ChatSink):
    def __init__(self):
        self.cards = []

    async def post_card(self, channel: str, summary: str, ticket_id: str) -> str:
        ts = f"slack-ts-{ticket_id}"
        self.cards.append({"channel": channel, "summary": summary, "ticket_id": ticket_id, "ts": ts})
        return ts

    async def handle_interaction(self, raw_body: bytes, headers: dict) -> Optional[Decision]:
        return None


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def repo(monkeypatch):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr("db.repository.SessionLocal", session_factory)
    return ArbiterRepository()


@pytest.fixture
def retriever(tmp_path):
    return CaseRetriever(chroma_path=str(tmp_path / "chroma"))


@pytest.fixture
def test_settings():
    return Settings(
        JIRA_SITE_URL="https://test.atlassian.net",
        JIRA_EMAIL="test@example.com",
        JIRA_API_TOKEN="token",
        SLACK_BOT_TOKEN="xoxb-test",
        SLACK_SIGNING_SECRET="secret-123",
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


@pytest.fixture
def test_app(repo, retriever, test_settings):
    llm = FakeLLM(category="vpn", confidence=0.4)
    jira = FakeJira()
    slack = FakeSlack()

    nodes = AgentNodes(
        llm_client=llm,
        retriever=retriever,
        repo=repo,
        ticket_source=jira,
        chat_sink=slack,
        settings=test_settings,
    )
    graph = create_graph(nodes=nodes)
    return create_app(repo=repo, graph=graph, signing_secret="secret-123")


def make_slack_headers(body: bytes, secret: str = "secret-123") -> dict[str, str]:
    """Helper to compute valid Slack signature headers over raw body bytes."""
    ts = str(int(time.time()))
    sig_basestring = b"v0:" + ts.encode("utf-8") + b":" + body
    signature = "v0=" + hmac.new(secret.encode("utf-8"), sig_basestring, hashlib.sha256).hexdigest()
    return {
        "x-slack-request-timestamp": ts,
        "x-slack-signature": signature,
        "content-type": "application/x-www-form-urlencoded",
    }


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(test_app):
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_jira_webhook_starts_graph_and_escalates(test_app, repo):
    payload = {
        "issue": {
            "key": "IT-404",
            "fields": {
                "summary": "VPN connection dropping constantly",
                "description": "User cannot reach intranet",
                "created": "2026-09-12T10:00:00Z",
            },
        }
    }
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        resp = await client.post("/webhooks/jira", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ticket_id"] == "IT-404"
        assert data["action"] == "escalate"

    # Ticket should be saved in repository
    ticket = repo.get_ticket("IT-404")
    assert ticket is not None
    assert "VPN connection dropping" in ticket.text

    # Decision should be saved
    decision = repo.get_decision("IT-404")
    assert decision is not None
    assert decision.action == "escalate"


@pytest.mark.asyncio
async def test_slack_interaction_invalid_signature_returns_403(test_app):
    raw_body = b"payload=%7B%22actions%22%3A%5B%5D%7D"
    headers = {
        "x-slack-request-timestamp": str(int(time.time())),
        "x-slack-signature": "v0=invalid_signature_hash_value_here",
        "content-type": "application/x-www-form-urlencoded",
    }
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        resp = await client.post(
            "/webhooks/slack/interactions",
            content=raw_body,
            headers=headers,
        )
        assert resp.status_code == 403
        assert "Invalid Slack" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_slack_interaction_valid_signature_resumes_graph(test_app, repo):
    # 1. First trigger a Jira ticket so graph runs and pauses at act_escalate
    jira_payload = {
        "ticket_id": "IT-505",
        "text": "VPN tunnel flap",
    }
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        resp = await client.post("/webhooks/jira", json=jira_payload)
        assert resp.status_code == 200
        assert resp.json()["action"] == "escalate"

        # 2. Build Slack interaction payload with embedded ticket_id in button value
        slack_payload = {
            "actions": [
                {
                    "action_id": "arbiter_approve",
                    "value": json.dumps({"ticket_id": "IT-505"}),
                }
            ]
        }
        form_body = urlencode({"payload": json.dumps(slack_payload)}).encode("utf-8")
        headers = make_slack_headers(form_body, secret="secret-123")

        # 3. Post interaction to webhook
        resume_resp = await client.post(
            "/webhooks/slack/interactions",
            content=form_body,
            headers=headers,
        )
        assert resume_resp.status_code == 200
        result = resume_resp.json()
        assert result["status"] == "ok"
        assert result["ticket_id"] == "IT-505"
        assert result["human_response"] == "approve"

    # Verify repository decision was updated
    decision = repo.get_decision("IT-505")
    assert decision is not None
    assert decision.human_response == "approve"


@pytest.mark.asyncio
async def test_api_tickets_and_audit_pagination(test_app, repo):
    # Insert dummy tickets
    t1 = Ticket(id="T-1", source="jira", text="Ticket 1", created_at=datetime.now(timezone.utc))
    t2 = Ticket(id="T-2", source="jira", text="Ticket 2", created_at=datetime.now(timezone.utc))
    repo.save_ticket(t1)
    repo.save_ticket(t2)

    repo.append_audit_log(event_type="test_event_1", ticket_id="T-1")
    repo.append_audit_log(event_type="test_event_2", ticket_id="T-2")

    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        # GET /api/tickets
        t_resp = await client.get("/api/tickets?offset=0&limit=1")
        assert t_resp.status_code == 200
        tickets = t_resp.json()
        assert len(tickets) == 1

        # GET /api/audit
        a_resp = await client.get("/api/audit?offset=0&limit=10")
        assert a_resp.status_code == 200
        audit = a_resp.json()
        assert len(audit) >= 2

        # Filter audit by ticket_id
        filter_resp = await client.get("/api/audit?ticket_id=T-1")
        assert filter_resp.status_code == 200
        filtered = filter_resp.json()
        assert len(filtered) == 1
        assert filtered[0]["ticket_id"] == "T-1"
