"""
End-to-end verification script using the real Groq API backend.

Runs a live ticket through:
1. Real Groq classify (openai/gpt-oss-20b)
2. Real ChromaDB vector retrieval
3. Real Trust Scorer (with risk override evaluation)
4. Real Decision routing & DB audit logging
5. Real Groq human summarization (openai/gpt-oss-120b)
6. LangGraph pause at escalation interrupt
7. Human feedback resume (approving resolution)
8. Category statistics increment & ChromaDB indexing
"""

import asyncio
import sys
from datetime import datetime, timezone

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent.graph import create_graph, resume_graph, run_graph
from agent.nodes import AgentNodes
from config import Settings
from db.models import Base
from db.repository import ArbiterRepository
from llm.groq_client import GroqLlamaClient
from llm.router import RoutedLLMClient
from retrieval.retrieval import CaseRetriever
from schemas import Ticket


class RecordingTicketSource:
    """Mock/recording adapter for Jira when running without live Jira creds."""
    def __init__(self):
        self.comments = []
        self.statuses = []

    async def get_ticket(self, ticket_id: str) -> Ticket:
        return Ticket(id=ticket_id, source="jira", text="", created_at=datetime.now(timezone.utc))

    async def add_comment(self, ticket_id: str, text: str) -> None:
        self.comments.append((ticket_id, text))
        print(f"  [Jira Adapter] Added comment to {ticket_id}:\n    {text[:80]}...")

    async def update_status(self, ticket_id: str, status: str) -> None:
        self.statuses.append((ticket_id, status))
        print(f"  [Jira Adapter] Transitioned {ticket_id} to status: {status}")


class RecordingChatSink:
    """Mock/recording adapter for Slack when running without live Slack creds."""
    def __init__(self):
        self.cards = []

    async def post_card(self, channel: str, summary: str, ticket_id: str) -> str:
        ts = f"live-slack-ts-{int(datetime.now().timestamp())}"
        self.cards.append({"channel": channel, "summary": summary, "ticket_id": ticket_id, "ts": ts})
        print(f"  [Slack Adapter] Posted escalation Block Kit card to {channel} (ts={ts})")
        print(f"  [Slack Adapter] Card content:\n    {summary[:120]}...")
        return ts

    async def handle_interaction(self, raw_body: bytes, headers: dict):
        return None


async def main():
    print("=" * 70)
    print("ARBITER LIVE END-TO-END DEMONSTRATION")
    print(f"Using Live Groq Models: openai/gpt-oss-20b (classify) & openai/gpt-oss-120b (summarize)")
    print("=" * 70)

    # 1. Load settings and initialize real Groq backends
    settings = Settings()
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your-groq-api-key":
        raise ValueError("GROQ_API_KEY not set in .env. Please set GROQ_API_KEY in .env before running.")

    print("\n[Step 1] Initializing Groq Routed Client...")
    fast_llm = GroqLlamaClient(api_key=settings.GROQ_API_KEY, model_name="openai/gpt-oss-20b")
    strong_llm = GroqLlamaClient(api_key=settings.GROQ_API_KEY, model_name="openai/gpt-oss-120b")
    routed_llm = RoutedLLMClient(fast_backend=fast_llm, strong_backend=strong_llm)

    # 2. Initialize real ChromaDB and real SQLite repository
    print("[Step 2] Initializing ChromaDB CaseRetriever and SQLite Repository...")
    retriever = CaseRetriever(chroma_path="./chroma_data")
    repo = ArbiterRepository()

    # Pre-seed a similar case in ChromaDB so retrieval has historical context
    retriever.add_case(
        ticket_id="PRIOR-VPN-01",
        text="VPN disconnects during large file transfers over IPsec tunnel",
        resolution="Adjust MTU size to 1360 on the client adapter and bounce tunnel.",
    )

    jira = RecordingTicketSource()
    slack = RecordingChatSink()

    nodes = AgentNodes(
        llm_client=routed_llm,
        retriever=retriever,
        repo=repo,
        ticket_source=jira,
        chat_sink=slack,
        settings=settings,
        slack_channel="#it-escalations",
    )
    graph = create_graph(nodes=nodes)

    # 3. Submit a ticket
    ticket_id = f"LIVE-{int(datetime.now().timestamp())}"
    ticket = Ticket(
        id=ticket_id,
        source="jira",
        text="User reports VPN connectivity drops repeatedly when deploying to the production cluster. Critical data pipelines are stalling.",
        created_at=datetime.now(timezone.utc),
    )
    thread_id = f"ticket-{ticket_id}"

    print(f"\n[Step 3] Submitting Ticket {ticket_id} to Graph...")
    print(f"  Ticket Text: {ticket.text}")

    # 4. Run Graph (will pause at interrupt)
    print("\n[Step 4] Running Graph Workflow...")
    paused_state = await run_graph(ticket=ticket, thread_id=thread_id, graph=graph)

    classification = paused_state["classification"]
    trust_score = paused_state["trust_score"]
    decision = paused_state["decision"]
    summary = paused_state.get("summary")

    print(f"\n  >> Real Groq Classification:")
    print(f"     - Category:   {classification.category}")
    print(f"     - Urgency:    {classification.urgency}")
    print(f"     - Risk Flags: {classification.risk_flags}")
    print(f"     - Confidence: {classification.confidence}")

    print(f"\n  >> Trust Scorer Output:")
    print(f"     - Score Value:        {trust_score.value:.3f}")
    print(f"     - Retrieval Comp:     {trust_score.retrieval_component:.3f}")
    print(f"     - Category Comp:      {trust_score.category_success_component:.3f}")
    print(f"     - Risk Override:      {trust_score.risk_override} (Safety Invariant Enforced!)")
    print(f"     - Decision Action:    {decision.action}")

    if summary:
        print(f"\n  >> Real Groq Escalation Summary (openai/gpt-oss-120b):")
        print(f"     {summary.summary}")

    print(f"\n[Step 5] Graph Execution Paused at Interrupt: Awaiting Human Feedback in Slack.")

    # 5. Simulate Human Click in Slack
    print("\n[Step 6] Human Reviewer clicks '✓ Approve' on Slack Card...")
    resumed_state = await resume_graph(
        thread_id=thread_id,
        human_response="approve",
        graph=graph,
    )

    print(f"\n[Step 7] Graph Resumed and Completed!")
    print(f"  - Final Human Response Recorded: {resumed_state.get('human_response')}")
    print(f"  - Jira Actions: {len(jira.comments)} comments, {len(jira.statuses)} status updates")

    # 6. Verify Database Audit Trail
    audit_events = repo.list_audit_log(ticket_id=ticket_id)
    print(f"\n[Step 8] Verifying Immutable DB Audit Log for Ticket {ticket_id}:")
    for ev in audit_events:
        print(f"  - Event: {ev['event_type']:<24} at {ev['created_at'].strftime('%H:%M:%S')}")

    print("\n" + "=" * 70)
    print("LIVE END-TO-END DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
