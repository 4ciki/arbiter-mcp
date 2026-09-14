"""
Empirical Benchmark Suite for Arbiter IT Resolution Pipeline.

Evaluates the exact 40 tickets from benchmark_ground_truth.csv against the live pipeline:
- Real Groq LLM (openai/gpt-oss-20b for classification, openai/gpt-oss-120b for summarization)
- Real ChromaDB semantic vector retrieval (all-MiniLM-L6-v2)
- Real deterministic Trust Scorer & Risk Override
- Realistic historical category success baselines

Tracks:
1. Classification Accuracy (pred_category vs expected_category)
2. Auto-Resolution Rate vs Human Escalation Rate
3. Mean Time to Triage (MTTT) in seconds
4. False-Positive Auto-Resolutions (0.0% safety invariant)
5. 6 Risk Trap tickets (T03, T09, T13, T20, T25, T32) -> verify false risk flags stopped
6. 8 Genuine Risk tickets (T04, T08, T14, T17, T21, T26, T31, T35) -> verify true risk flags triggered
"""

import asyncio
import csv
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from agent.nodes import AgentNodes
from config import Settings
from db.models import CategoryStatsRow, SessionLocal
from db.repository import ArbiterRepository
from llm.groq_client import GroqLlamaClient
from llm.router import RoutedLLMClient
from retrieval.retrieval import CaseRetriever
from schemas import Ticket


# ── Canonical Reference Knowledge Base ─────────────────────────────────────────
CANONICAL_KB = [
    {
        "id": "KB-PWD-01",
        "text": "User cannot log into Okta after password expiration. Self-service password reset procedure.",
        "resolution": "Direct user to the Okta self-service reset portal at identity.company.com/recovery to reset password via SMS/email OTP.",
    },
    {
        "id": "KB-PWD-02",
        "text": "Temporary unlock for Active Directory account locked out due to multiple failed login attempts.",
        "resolution": "Verified user identity and executed AD account unlock script. Advised clearing stored credentials in Windows Credential Manager.",
    },
    {
        "id": "KB-VPN-01",
        "text": "AnyConnect VPN client fails with 'Connection attempt failed due to network issue' on corporate WiFi.",
        "resolution": "Flush DNS cache using ipconfig /flushdns, set Cisco AnyConnect adapter MTU to 1360, and reconnect.",
    },
    {
        "id": "KB-VPN-02",
        "text": "WireGuard VPN client handshake timeout when connecting from home ISP.",
        "resolution": "Updated endpoint configuration to use port 51820 UDP and confirmed ISP is not blocking UDP traffic.",
    },
    {
        "id": "KB-SW-01",
        "text": "Request for Figma Enterprise editor license for new product designer.",
        "resolution": "Verified manager approval in Workday and provisioned Figma Enterprise seat via Okta SCIM integration.",
    },
    {
        "id": "KB-SW-02",
        "text": "JetBrains IntelliJ IDEA license expired or invalid activation code.",
        "resolution": "Reassigned JetBrains floating license from corporate license server at jetbrains.internal.corp.",
    },
    {
        "id": "KB-HW-01",
        "text": "External Dell monitor not detected when connected via CalDigit USB-C dock.",
        "resolution": "Power-cycle the USB-C dock, unplug all display cables for 30 seconds, and update DisplayLink driver.",
    },
    {
        "id": "KB-HW-02",
        "text": "MacBook keyboard backlight not turning on or unresponsive ambient light sensor.",
        "resolution": "Reset SMC (System Management Controller) and verified keyboard illumination toggle in macOS Control Center.",
    },
    {
        "id": "KB-ACC-01",
        "text": "Developer needs read-only access to staging RDS Postgres database.",
        "resolution": "Added user to rds-staging-ro Okta group and granted IAM database authentication role in AWS.",
    },
    {
        "id": "KB-NET-01",
        "text": "Office workstation unable to obtain IP address from DHCP on 3rd floor LAN.",
        "resolution": "Patched ethernet cable to alternate wall port and bounced switch port on floor 3 access switch.",
    },
]

RISK_TRAP_IDS = {"T03", "T09", "T13", "T20", "T25", "T32"}
GENUINE_RISK_IDS = {"T04", "T08", "T14", "T17", "T21", "T26", "T31", "T35"}


# ── Recording Sinks ────────────────────────────────────────────────────────────
class BenchmarkRecordingTicketSource:
    def __init__(self):
        self.comments: list[tuple[str, str]] = []
        self.statuses: list[tuple[str, str]] = []

    async def get_ticket(self, ticket_id: str) -> Ticket:
        return Ticket(id=ticket_id, source="jira", text="", created_at=datetime.now(timezone.utc))

    async def add_comment(self, ticket_id: str, text: str) -> None:
        self.comments.append((ticket_id, text))

    async def update_status(self, ticket_id: str, status: str) -> None:
        self.statuses.append((ticket_id, status))


class BenchmarkRecordingChatSink:
    def __init__(self):
        self.cards: list[dict[str, Any]] = []

    async def post_card(self, channel: str, summary: str, ticket_id: str) -> str:
        ts = f"bench-slack-{int(datetime.now().timestamp())}-{ticket_id}"
        self.cards.append({"channel": channel, "summary": summary, "ticket_id": ticket_id, "ts": ts})
        return ts

    async def handle_interaction(self, raw_body: bytes, headers: dict):
        return None


def seed_database_category_baselines():
    """Seed realistic category stats for mature and cold-start categories."""
    baselines = [
        {"category": "password", "total": 50, "agreed": 48},  # 96.0% mature
        {"category": "software", "total": 40, "agreed": 37},  # 92.5% mature
        {"category": "vpn", "total": 30, "agreed": 27},       # 90.0% mature
        {"category": "hardware", "total": 25, "agreed": 21},  # 84.0% mature
        {"category": "access", "total": 8, "agreed": 7},      # Cold start (<20) -> 0.30 guard
        {"category": "network", "total": 7, "agreed": 6},     # Cold start (<20) -> 0.30 guard
        {"category": "other", "total": 4, "agreed": 3},       # Cold start (<20) -> 0.30 guard
    ]
    with SessionLocal() as s:
        for b in baselines:
            row = s.get(CategoryStatsRow, b["category"])
            if row is None:
                row = CategoryStatsRow(
                    category=b["category"],
                    total_handled=b["total"],
                    human_agreed_count=b["agreed"],
                )
                s.add(row)
            else:
                row.total_handled = b["total"]
                row.human_agreed_count = b["agreed"]
        s.commit()
    print("✓ Category baselines seeded in SQLite (arbiter.db)")


def seed_vector_store(retriever: CaseRetriever):
    """Seed the 10 canonical resolved IT cases into ChromaDB."""
    for case in CANONICAL_KB:
        retriever.add_case(
            ticket_id=case["id"],
            text=case["text"],
            resolution=case["resolution"],
        )
    print(f"✓ Seeded {len(CANONICAL_KB)} canonical reference cases in ChromaDB (total={retriever.count()})")


def load_ground_truth(csv_path: str = "benchmark_ground_truth.csv") -> list[dict[str, Any]]:
    """Load the fixed 40-ticket ground truth set without modifying any rows."""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Ground truth file not found: {csv_path}")

    tickets = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tickets.append({
                "ticket_id": row["ticket_id"].strip(),
                "category": row["category"].strip(),
                "expected_category": row["expected_category"].strip(),
                "ground_truth_risky": row["ground_truth_risky"].strip().lower() == "yes",
                "design_note": row["design_note"].strip(),
                "ticket_text": row["ticket_text"].strip(),
            })
    return tickets


async def run_benchmark():
    print("=" * 90)
    print("ARBITER BENCHMARK: 40 FIXED GROUND-TRUTH TICKETS")
    print("Source: benchmark_ground_truth.csv")
    print("=" * 90)

    settings = Settings()
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is required to run the empirical benchmark.")

    # 1. Load exact 40 tickets from CSV
    tickets = load_ground_truth("benchmark_ground_truth.csv")
    print(f"✓ Loaded {len(tickets)} tickets from benchmark_ground_truth.csv")

    # 2. Seed DB category baselines
    seed_database_category_baselines()

    # 3. Initialize Retriever and seed canonical KB
    retriever = CaseRetriever(chroma_path=settings.CHROMA_PATH)
    seed_vector_store(retriever)

    # 4. Setup LLMs and AgentNodes
    fast_llm = GroqLlamaClient(api_key=settings.GROQ_API_KEY, model_name="openai/gpt-oss-20b")
    strong_llm = GroqLlamaClient(api_key=settings.GROQ_API_KEY, model_name="openai/gpt-oss-120b")
    routed_llm = RoutedLLMClient(fast_backend=fast_llm, strong_backend=strong_llm)

    repo = ArbiterRepository()
    jira_sink = BenchmarkRecordingTicketSource()
    slack_sink = BenchmarkRecordingChatSink()

    nodes = AgentNodes(
        llm_client=routed_llm,
        retriever=retriever,
        repo=repo,
        ticket_source=jira_sink,
        chat_sink=slack_sink,
        settings=settings,
    )

    results = []
    print("\nExecuting live pipeline on all 40 ground-truth tickets...")
    print("-" * 90)

    for i, item in enumerate(tickets, start=1):
        ticket_id = item["ticket_id"]
        ticket_text = item["ticket_text"]
        expected_cat = item["expected_category"]
        gt_risky = item["ground_truth_risky"]
        design_note = item["design_note"]

        ticket = Ticket(
            id=ticket_id,
            source="jira",
            text=ticket_text,
            created_at=datetime.now(timezone.utc),
        )

        state = {"ticket": ticket}

        # Measure wall-clock Time to Triage (classify -> retrieve -> score -> decide)
        t0 = time.perf_counter()

        # Step 1: Classify
        c_res = await nodes.classify_node(state)
        state.update(c_res)

        # Step 2: Retrieve
        r_res = await nodes.retrieve_node(state)
        state.update(r_res)

        # Step 3: Score
        s_res = await nodes.score_node(state)
        state.update(s_res)

        # Step 4: Decide
        d_res = await nodes.decide_node(state)
        state.update(d_res)

        t1 = time.perf_counter()
        mttt_seconds = t1 - t0

        # Step 5: Execute action
        decision = state["decision"]
        if decision.action == "auto_resolve":
            act_res = await nodes.act_auto_node(state)
            state.update(act_res)
        else:
            act_res = await nodes.act_escalate_node(state)
            state.update(act_res)

        classification = state["classification"]
        trust_score = state["trust_score"]

        cat_correct = (classification.category == expected_cat)
        has_risk = trust_score.risk_override

        # False-positive auto-resolution: a ground_truth_risky ticket that auto-resolved
        is_false_positive_auto = (decision.action == "auto_resolve" and gt_risky)

        record = {
            "ticket_id": ticket_id,
            "ticket_text": ticket_text,
            "design_note": design_note,
            "pred_category": classification.category,
            "expected_category": expected_cat,
            "cat_correct": cat_correct,
            "confidence": classification.confidence,
            "retrieval_similarity": trust_score.retrieval_component,
            "category_component": trust_score.category_success_component,
            "trust_score": trust_score.value,
            "risk_flags": classification.risk_flags,
            "risk_override": has_risk,
            "ground_truth_risky": gt_risky,
            "action": decision.action,
            "is_false_positive_auto": is_false_positive_auto,
            "mttt_s": mttt_seconds,
        }
        results.append(record)

        tag = ""
        if ticket_id in RISK_TRAP_IDS:
            tag = " [TRAP]"
        elif ticket_id in GENUINE_RISK_IDS:
            tag = " [TRUE RISK]"

        print(
            f"[{i:02d}/40] {ticket_id:<4}{tag:<11} | "
            f"Cat: {classification.category:<8} ({'✓' if cat_correct else '✗'}) [exp:{expected_cat:<8}] | "
            f"Score: {trust_score.value:.3f} | "
            f"Risk: {str(has_risk):<5} (gt:{str(gt_risky):<5}) | "
            f"Action: {decision.action:<12} | "
            f"MTTT: {mttt_seconds:.2f}s"
        )

        # 1.5s sleep to respect Groq rate limits
        await asyncio.sleep(1.5)

    print("-" * 90)

    # ── Summary Calculations ───────────────────────────────────────────────────
    total = len(results)
    cat_correct_count = sum(1 for r in results if r["cat_correct"])
    classification_accuracy = (cat_correct_count / total) * 100.0

    auto_resolve_count = sum(1 for r in results if r["action"] == "auto_resolve")
    escalate_count = sum(1 for r in results if r["action"] == "escalate")
    auto_resolve_rate = (auto_resolve_count / total) * 100.0

    false_positive_count = sum(1 for r in results if r["is_false_positive_auto"])
    false_positive_rate = (false_positive_count / total) * 100.0

    latencies = [r["mttt_s"] for r in results]
    mean_mttt = sum(latencies) / total
    sorted_latencies = sorted(latencies)
    median_mttt = sorted_latencies[total // 2]
    min_mttt = min(latencies)
    max_mttt = max(latencies)

    # Risk Trap Analysis (T03, T09, T13, T20, T25, T32)
    trap_results = [r for r in results if r["ticket_id"] in RISK_TRAP_IDS]
    trap_cleared_count = sum(1 for r in trap_results if not r["risk_override"])

    # Genuine Risk Analysis (T04, T08, T14, T17, T21, T26, T31, T35)
    genuine_risk_results = [r for r in results if r["ticket_id"] in GENUINE_RISK_IDS]
    genuine_caught_count = sum(1 for r in genuine_risk_results if r["risk_override"])

    print("\n" + "=" * 90)
    print("EMPIRICAL BENCHMARK SUMMARY (N = 40)")
    print("=" * 90)
    print(f"Sample Size (N):                         {total} tickets (from benchmark_ground_truth.csv)")
    print(f"Classification Accuracy:                 {classification_accuracy:.1f}% ({cat_correct_count}/{total})")
    print(f"Auto-Resolution Rate:                    {auto_resolve_rate:.1f}% ({auto_resolve_count}/{total})")
    print(f"Escalation Rate:                         {(escalate_count / total) * 100.0:.1f}% ({escalate_count}/{total})")
    print(f"Mean Time to Triage (MTTT):              {mean_mttt:.2f}s (Median: {median_mttt:.2f}s, Min: {min_mttt:.2f}s, Max: {max_mttt:.2f}s)")
    print(f"False-Positive Auto-Resolutions:         {false_positive_rate:.1f}% ({false_positive_count}/{total})")
    print("-" * 90)
    print(f"Risk Trap Tickets (Target: Risk=False):  {trap_cleared_count} / {len(RISK_TRAP_IDS)} cleared (not flagged as risk)")
    for tr in trap_results:
        print(f"  - {tr['ticket_id']}: risk_override={tr['risk_override']} | risk_flags={tr['risk_flags']} | {tr['design_note']}")
    print("-" * 90)
    print(f"Genuine Risk Tickets (Target: Risk=True): {genuine_caught_count} / {len(GENUINE_RISK_IDS)} caught (correctly flagged)")
    for gr in genuine_risk_results:
        print(f"  - {gr['ticket_id']}: risk_override={gr['risk_override']} | risk_flags={gr['risk_flags']} | action={gr['action']} | {gr['design_note']}")
    print("=" * 90)

    # Save benchmark results to JSON
    benchmark_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "benchmark_ground_truth.csv",
        "sample_size": total,
        "classification_accuracy_pct": round(classification_accuracy, 2),
        "classification_correct_count": cat_correct_count,
        "auto_resolution_rate_pct": round(auto_resolve_rate, 2),
        "auto_resolution_count": auto_resolve_count,
        "escalation_rate_pct": round((escalate_count / total) * 100.0, 2),
        "escalation_count": escalate_count,
        "mean_mttt_seconds": round(mean_mttt, 3),
        "median_mttt_seconds": round(median_mttt, 3),
        "min_mttt_seconds": round(min_mttt, 3),
        "max_mttt_seconds": round(max_mttt, 3),
        "false_positive_auto_resolutions_pct": round(false_positive_rate, 2),
        "false_positive_count": false_positive_count,
        "risk_traps_cleared": f"{trap_cleared_count}/{len(RISK_TRAP_IDS)}",
        "genuine_risks_caught": f"{genuine_caught_count}/{len(GENUINE_RISK_IDS)}",
        "tickets": results,
    }
    with open("benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(benchmark_payload, f, indent=2)
    print("✓ Full benchmark details saved to benchmark_results.json")

    return benchmark_payload


if __name__ == "__main__":
    asyncio.run(run_benchmark())
