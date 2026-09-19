<p align="right">
  <a href="https://www.producthunt.com/products/arbiter-mcp?utm_source=badge-follow&utm_medium=badge&utm_source=badge-arbiter&#0045;mcp" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=1320651&theme=dark" alt="arbiter&#0045;mcp - AI&#0032;agent&#0032;that&#0032;triages&#0032;IT&#0032;tickets&#0044;&#0032;not&#0032;just&#0032;routes&#0032;them | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</p>

<p align="center">
  <img src="arbiter-mcp-ai-agent-icon-transparent.png" alt="Arbiter MCP Logo" width="200" />
</p>

<h1 align="center">Arbiter</h1>

<p align="center">
  <strong>Autonomous IT helpdesk triage and safety-critical resolution engine.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/LangGraph-1.x-1C3C3C?logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Streamlit-1.38-FF4B4B?logo=streamlit&logoColor=white" alt="Streamlit" />
  <img src="https://img.shields.io/badge/ChromaDB-1.x-F97316?logoColor=white" alt="ChromaDB" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue?logo=apache&logoColor=white" alt="License" />
  <img src="https://img.shields.io/badge/Tests-51%20passed-22C55E?logo=pytest&logoColor=white" alt="Tests" />
</p>

<p align="center">
  <img src="arbiter-ai-agent-it-ticket-triage-product-hunt-cover.png" alt="Arbiter — AI Agent for IT Ticket Triage" width="100%" />
</p>

Arbiter is an open-source, provider-agnostic IT ticket resolution agent built with LangGraph, FastAPI, ChromaDB, and Streamlit. It demonstrates an enterprise-grade agentic architecture that combines semantic retrieval, historical category success rates, and multi-tier LLM reasoning to safely automate IT support tickets while strictly routing high-risk and low-confidence cases to humans.

> [!NOTE]
> **Portfolio / Open-Source Project**: This repository is a technical demonstration of resilient, provider-agnostic agent patterns, deterministic trust scoring, and human-in-the-loop workflows — not a commercial SaaS product.

---

## Architecture

Arbiter decouples reasoning from infrastructure:
- **Ticketing Source**: Integrates with Jira via Atlassian's remote Rovo MCP protocol (`/v1/mcp`).
- **Chat Sink**: Posts interactive Block Kit cards to Slack with HMAC-SHA256 raw signature verification.
- **Provider-Agnostic LLM Layer**: Cheap/fast open-weights (Groq `openai/gpt-oss-20b`) for classification; strong frontier models (Google Vertex AI `gemini-3.8-flash`) for escalation summaries.
- **Orchestration**: Stateful LangGraph graph with `AsyncSqliteSaver` checkpointer supporting process-safe pause and resume.
- **Audit & Analytics**: Append-only SQLite audit log and a real-time Streamlit operations dashboard.

![Arbiter Agent Architecture](enterprise_ticket_agent_flow.png)

---

## How the Trust Score Works

At the core of Arbiter is a deterministic, safety-critical trust calculation implemented in pure functions ([`scoring/trust_scorer.py`](scoring/trust_scorer.py)).

Every incoming ticket is evaluated across three weighted dimensions:

$$\text{TrustScore} = w_{\text{retrieval}} \cdot S_{\text{retrieval}} + w_{\text{category}} \cdot S_{\text{category}} + w_{\text{llm}} \cdot S_{\text{llm}}$$

| Component | Default Weight | Calculation & Safety Invariant |
|---|---|---|
| **Retrieval Component** ($S_{\text{retrieval}}$) | `0.40` | Cosine similarity ($0.0 - 1.0$) of the best-matching resolved case from ChromaDB. Returns `0.0` if no similar cases exist. |
| **Category Success Component** ($S_{\text{category}}$) | `0.35` | Historical human agreement rate (`human_agreed_count / total_handled`). **Cold-Start Guard**: If `total_handled < 20`, defaults strictly to `0.30` so unproven categories cannot auto-resolve. |
| **LLM Confidence Component** ($S_{\text{llm}}$) | `0.25` | Self-reported model confidence ($0.0 - 1.0$) from the classification prompt. |

### Safety-Critical Risk Override

Arbiter enforces an absolute safety guarantee: **no ticket bearing high-risk keywords may ever be auto-resolved**, regardless of its numerical trust score.

If the classification detects any risk flags (`production`, `security`, `billing`, `data_loss`):
1. `risk_override` is set to `True`.
2. The decision function (`decide()`) unconditionally routes the ticket to `"escalate"`.
3. An interactive card is posted to Slack for human review.
4. The numerical score is preserved in the database and audit trail for operational analytics.

---

## Quickstart & Local Setup

### 1. Prerequisites
- Python 3.11 or 3.12
- Git
- Free-tier accounts for Jira, Slack, and Google Cloud / Groq (optional; tests run with zero external credentials)

### 2. Clone & Environment
```bash
git clone https://github.com/4ciki/arbiter-mcp.git
cd arbiter-mcp

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure `.env`
Copy the template configuration:
```bash
cp .env.example .env
```
Populate `.env` with your API credentials (see [.env.example](.env.example) for exact field definitions):
- **Jira Rovo MCP**: `JIRA_SITE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
- **Slack**: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- **Vertex AI**: `GOOGLE_APPLICATION_CREDENTIALS`, `GCP_PROJECT_ID`
- **Groq**: `GROQ_API_KEY`

---

## Running with Docker

<img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" height="20" /> Run the entire system (FastAPI backend + Streamlit dashboard + persistent storage) with a single command:

```bash
docker-compose up --build
```

Services exposed:
- **FastAPI Backend & Webhooks**: [http://localhost:8000](http://localhost:8000)
  - Interactive Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
  - Health Probe: [http://localhost:8000/health](http://localhost:8000/health)
- **Streamlit Operations Dashboard**: [http://localhost:8501](http://localhost:8501)

To run locally without Docker:
```bash
# Terminal 1: Run API
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Run Dashboard
streamlit run dashboard/app.py --server.port 8501
```

---

## Running the Test Suite

<img src="https://img.shields.io/badge/pytest-51%20passed-22C55E?logo=pytest&logoColor=white" height="20" /> Arbiter maintains a test suite covering pure scoring math, ORM persistence, vector retrieval isolation, LangGraph state checkpoints, and webhook signature security:

```bash
python -m pytest tests/ -v
```

All 51 tests run locally without requiring external credentials or network access.

---

## Performance & Metrics

The following metrics were empirically measured using Arbiter's benchmark runner ([`run_benchmark.py`](run_benchmark.py)) against the fixed evaluation dataset ([`benchmark_ground_truth.csv`](benchmark_ground_truth.csv), $N = 40$) through the live pipeline (Groq `openai/gpt-oss-20b` for classification, ChromaDB `all-MiniLM-L6-v2` semantic retrieval, deterministic trust scoring, and SQLite persistence):

| Metric | Measured Value ($N = 40$) | Notes & Operational Context |
|---|---|---|
| **Classification Accuracy** | **31 / 40** (77.5%) | Top-1 accuracy against fixed ground truth. 5 of the 9 mismatches were a 0% success rate on the "other" label (T36–T40); the remaining 4 were dual-domain boundary cases. |
| **Auto-Resolution Rate** | **8 / 40** (20.0%) | Exactly 8 of 40 tickets auto-resolved under the current prompt, with routine tickets T03 and T09 specifically no longer blocked by false risk flags. |
| **Escalation to Human Rate** | **32 / 40** (80.0%) | High-risk (8 tickets), cold-start (<20 samples), or low-similarity tickets routed to Slack for human review. |
| **Mean Time to Triage (MTTT)** | **1.19s** (Median: 1.03s) | End-to-end latency from ingestion through classification, vector retrieval, trust scoring, and decision routing on Groq LPUs. |
| **False-Positive Auto-Resolutions** | **0 / 40** (0.0%) | **Absolute safety invariant preserved**. Zero risk-bearing or unverified tickets auto-resolved. |

### Risk Calibration, Named Limitations & Trap Analysis
- **Named Limitation — Catch-All Category (`other`, 0/5 success rate)**: All 5 tickets designed for the `other` category (`T36`–`T40`) were misclassified into more specific functional categories (`software` for Outlook/Teams/expense apps, `hardware` for desk monitor arms, `access` for 2FA policy). The model exhibits a 0% success rate on the catch-all label when any concrete domain keyword is present. The remaining 4 mismatches (`T04`, `T05`, `T11`, `T33`) were dual-domain boundary cases (e.g., VPN client password, ethernet port vs. network).
- **Risk Traps Cleared (6 / 6, 100%)**: Explicit negative prompt boundaries in `CLASSIFY_PROMPT` successfully stopped all 6 trap tickets (`T03`, `T09`, `T13`, `T20`, `T25`, `T32`) from triggering false risk overrides. In particular, routine tickets `T03` (account lockout) and `T09` (VPN handshake error) were no longer blocked by false risk flags and achieved scores above 0.75, allowing them to safely auto-resolve.
- **Genuine Risks Caught (8 / 8, 100%)**: All 8 genuine risk tickets (`T04`, `T08`, `T14`, `T17`, `T21`, `T26`, `T31`, `T35` covering account takeover, production pipeline failures, billing anomalies, physical battery hazards, and data loss) triggered `risk_override = True` and were escalated to humans.
- **Cold-Start Protection**: Categories with insufficient historical volume (`access`, `network`, `other`) strictly applied the cold-start penalty ($0.30$), preventing unproven categories from premature auto-resolution.
- **Reproducibility**: Run `python run_benchmark.py` to re-execute the 40-ticket benchmark locally. Full per-ticket logs and telemetry are saved to `benchmark_results.json`.

---

## License

Licensed under the [Apache License 2.0](LICENSE). Copyright © 2026 4ciki.
