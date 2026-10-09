# Contributing to Arbiter MCP

> **Thank you for helping make Arbiter MCP better.**
> This document is the single source of truth for contributors — read it once, save it, and refer back whenever you open a PR.

---

## Table of Contents

1. [What you can contribute](#1-what-you-can-contribute)
2. [What is off-limits](#2-what-is-off-limits)
3. [Before you start](#3-before-you-start)
4. [Local development setup](#4-local-development-setup)
5. [Branching strategy](#5-branching-strategy)
6. [Commit conventions](#6-commit-conventions)
7. [Opening a pull request](#7-opening-a-pull-request)
8. [Review and merge process](#8-review-and-merge-process)
9. [Reporting bugs](#9-reporting-bugs)
10. [Proposing new features](#10-proposing-new-features)
11. [Code style](#11-code-style)
12. [Tests](#12-tests)
13. [Community expectations](#13-community-expectations)

---

## 1. What you can contribute

These areas are **explicitly open** for community contribution.

### Core Agent Logic

| Area | Location | Notes |
|---|---|---|
| New LangGraph nodes | `agent/nodes.py` | Must include unit test |
| Graph edge conditions | `agent/graph.py` | Must not weaken the `risk_override` safety rule |
| State schema extensions | `agent/state.py` | Backwards-compatible additions only |

### Adapters (Integrations)

| Area | Location | Notes |
|---|---|---|
| New ticketing adapters | `adapters/` (new file, e.g. `zendesk_adapter.py`) | Must extend `adapters/base.py` |
| ServiceNow / Linear / GitHub Issues adapters | `adapters/` | See existing Jira adapter as reference |
| Slack Block Kit improvements | `adapters/slack_adapter.py` | UI-only, no logic changes |
| PagerDuty / OpsGenie escalation adapters | `adapters/` | New file; escalation path only |

### Retrieval and Scoring

| Area | Location | Notes |
|---|---|---|
| Alternative embedding models | `retrieval/` | Must benchmark against existing baseline |
| Trust score formula tuning | `scoring/trust_scorer.py` | Must include benchmark comparison in PR |
| ChromaDB to alternative vector store | `retrieval/` | Must be togglable via env var, not breaking |

### LLM / Model Support

| Area | Location | Notes |
|---|---|---|
| New LLM provider wrappers | `llm/` | Must be togglable via `LLM_PROVIDER` env var |
| Local model support (Ollama, LM Studio) | `llm/` | Offline-first; no API key required |
| Prompt template improvements | `llm/` | Must not change classification output schema |

### API and MCP Server

| Area | Location | Notes |
|---|---|---|
| New REST endpoints | `api/` | Follow existing FastAPI patterns |
| MCP tool definitions | `mcp_server.py` | Additive only; no breaking changes to existing tools |
| OpenAPI schema improvements | `api/` | Documentation only |

### Tests

| Area | Location | Notes |
|---|---|---|
| New unit tests | `tests/` | Always welcome; target uncovered code paths |
| Benchmark ground truth entries | `benchmark_ground_truth.csv` | Must include rationale in PR description |
| Integration test improvements | `tests/` | Must run offline (no live API calls) |

### Documentation

| Area | Location | Notes |
|---|---|---|
| README improvements | `README.md`, `README_zh.md`, `README_ar.md` | Factual corrections, clarity, typos |
| New worked examples | `examples/` | Follow the existing `.md` format |
| Architecture diagrams | `story/` | Use Mermaid or clean SVG |
| Translation PRs | `README_*.md` | New language translations welcome |

### Dashboard (Admin UI)

| Area | Location | Notes |
|---|---|---|
| New dashboard pages | `dashboard/admin/src/pages/` | React + Vite; match existing design system |
| Bug fixes in existing pages | `dashboard/admin/src/` | Always welcome |
| Landing page improvements | `dashboard/admin/src/pages/LoginScreen.jsx` | Cosmetic and UX only |

### DevOps and Tooling

| Area | Location | Notes |
|---|---|---|
| Docker / docker-compose improvements | `Dockerfile`, `docker-compose.yml` | Must not break existing `docker compose up` |
| CI pipeline enhancements | `.github/workflows/ci.yml` | Must not remove existing test steps |
| Dependabot / security tooling | `.github/` | Always welcome |

---

## 2. What is off-limits

Do **not** open PRs for the following. They will be closed without review.

| Category | Reason |
|---|---|
| Weakening `risk_override` — the hard escalation rule for `production`, `security`, `billing`, `data_loss` | Zero-tolerance safety guarantee. Not negotiable. |
| Removing or bypassing trust score thresholds | Core to the auto-resolution safety model. |
| Replacing the LangGraph graph structure entirely | The directed graph is the architecture; forks that replace it are separate projects. |
| Changing the Jira/Slack credential format in `.env.example` without a migration path | Breaking existing deployments. |
| Adding telemetry, analytics, or any call-home tracking code | Arbiter MCP is privacy-first. |
| Promoting commercial services inside code or docs | Open-source, not an ad platform. |
| Modifying `.env` or `firebase_creds.env` files | Never commit credentials. Auto-rejected. |
| Changes to `LICENSE` | Apache 2.0 is fixed. |
| Dashboard authentication logic (Supabase RLS, LoginScreen auth flow) | Security-critical; maintainer-only. |

---

## 3. Before you start

**For bug fixes:** Check [open issues](https://github.com/4ciki/arbiter-mcp/issues) to avoid duplicate work.

**For new features:** Open a [feature request issue](https://github.com/4ciki/arbiter-mcp/issues/new?template=feature_request.yml) first and wait for an `approved` label before writing code.

**For adapters:** Comment on an existing issue or open a new one. We will give you a quick yes/no within 48 hours.

This prevents wasted effort on contributions that will not be merged.

---

## 4. Local development setup

```bash
# 1. Fork then clone your fork
git clone https://github.com/<your-username>/arbiter-mcp.git
cd arbiter-mcp

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 3. Install all dependencies
pip install -r requirements.txt

# 4. Copy environment template and fill in your keys
cp .env.example .env
# Edit .env with your credentials

# 5. Run the full test suite (all 51 tests should pass)
python -m pytest tests/ -v

# 6. Run the API server locally
uvicorn api.main:app --reload --port 8000
```

> **Tip:** All 51 tests run **fully offline** — no live Jira, Slack, or LLM API calls in the test suite.
> If your contribution requires an external API call in a test, mock it.

---

## 5. Branching strategy

```
main                                 <- production; protected; direct pushes blocked
  your-fork/feature/short-description    <- features
  your-fork/fix/short-description        <- bug fixes
  your-fork/docs/short-description       <- documentation
  your-fork/adapter/service-name         <- new adapters
  your-fork/test/short-description       <- new tests
  your-fork/refactor/short-description   <- refactors
```

**Rules:**
- Always branch off the latest `main`
- One logical change per branch
- Delete your branch after merge
- Never force-push to `main`

**Branch naming:**

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<slug>` | `feature/zendesk-adapter` |
| Bug fix | `fix/<slug>` | `fix/trust-score-division-zero` |
| Documentation | `docs/<slug>` | `docs/arabic-translation-update` |
| New adapter | `adapter/<service>` | `adapter/pagerduty` |
| Tests | `test/<slug>` | `test/retrieval-edge-cases` |
| Refactor | `refactor/<slug>` | `refactor/nodes-split-classify` |

---

## 6. Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/). This feeds our changelog automatically.

```
<type>(<scope>): <short imperative description>

[optional body — explain WHY, not what]

[optional footer: Closes #123 | BREAKING CHANGE: ...]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New capability or adapter |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvement |
| `chore` | Dependency bumps, CI tweaks, build scripts |
| `style` | Formatting only (whitespace, linting) |

### Scope (optional but encouraged)

`agent`, `adapter`, `retrieval`, `scoring`, `llm`, `api`, `mcp`, `dashboard`, `ci`, `docs`

### Examples

```
feat(adapter): add Zendesk ticketing adapter

Implements ZendeskAdapter extending base.py. Uses OAuth2 token auth.
Adds 8 unit tests covering create/update/close operations.

Closes #47
```

```
fix(scoring): prevent division-by-zero in trust scorer when history is empty

Category success rate returned NaN on first-run cold-start.
Added guard clause; returns 0.0 instead.

Closes #83
```

```
docs: add Arabic translation corrections for README_ar.md
```

**Do not:**
- Use past tense (`"Added Zendesk"` — use `"add Zendesk"` imperative)
- Write vague messages (`"fix stuff"`, `"update"`, `"wip"`)
- Commit secrets or `.env` files

---

## 7. Opening a pull request

1. Push your branch to your fork
2. Open a PR against `4ciki/arbiter-mcp:main`
3. Fill in the PR template completely — every section matters; incomplete PRs are returned
4. Link the issue your PR resolves: `Closes #<number>` in the description
5. Confirm CI passes — the `Arbiter CI` check must be green before review begins
6. Do not mark Ready for Review until your own self-review is done

### PR title format (same as commit format)

```
feat(adapter): add Zendesk ticketing adapter
fix(scoring): prevent division-by-zero in trust scorer
docs: add Arabic translation corrections
```

### PR checklist (enforced by template)

- [ ] I have read `CONTRIBUTING.md`
- [ ] My branch is up to date with `main`
- [ ] All existing 51 tests pass (`pytest tests/ -v`)
- [ ] I have added tests for new code (target: 80%+ coverage on new paths)
- [ ] I have not committed any secrets or credentials
- [ ] I have not modified the `risk_override` safety rule
- [ ] I have updated documentation where relevant

---

## 8. Review and merge process

```
PR opened
  |
  +-- CI runs automatically (pytest suite, ~60s)
  |       FAIL: author must fix; no review until green
  |
  +-- Maintainer review within 5 business days
  |       Requests changes: author addresses, re-requests review
  |       Approved: 1 approval required
  |       Merged via Squash and Merge -> clean linear history
  |
  +-- Branch deleted (maintainer or author)
```

**What we review:**

| Dimension | What we check |
|---|---|
| **Correctness** | Does it do what it claims? Edge cases handled? |
| **Safety** | `risk_override` intact? No credentials leaked? |
| **Tests** | New logic has tests. No untested paths in core modules. |
| **Style** | Follows code style guide. No dead code. |
| **Scope** | One logical change. No unrelated sprawl. |
| **Docs** | README / docstrings updated where needed. |

**Merge strategy:** All PRs use **Squash and Merge**. Your commits are squashed into one clean commit on `main`. Write a clean PR title and description — that becomes the permanent record.

**SLA:** First comment within 5 business days. If silent for 7 days, ping in the comments.

---

## 9. Reporting bugs

Use the [Bug Report template](https://github.com/4ciki/arbiter-mcp/issues/new?template=bug_report.yml).

Include:
- Python version and OS
- Exact error message / traceback
- Steps to reproduce (minimal, numbered)
- Expected vs actual behavior
- Relevant env vars (never paste real keys — use `JIRA_URL=<redacted>`)

Good bug reports get fixed fast. Vague reports get closed.

---

## 10. Proposing new features

Use the [Feature Request template](https://github.com/4ciki/arbiter-mcp/issues/new?template=feature_request.yml).

Include:
- Problem statement — what workflow is broken or missing?
- Proposed solution — what should Arbiter do differently?
- Alternatives considered
- Category: adapter / new node / scoring change / UI change?

Feature requests follow: `needs-discussion` → `approved` → `in progress`.
**Wait for `approved` before writing code.**

---

## 11. Code style

**Python (backend)**
- [Ruff](https://docs.astral.sh/ruff/) for linting and formatting
- Line length: 100 characters
- Type hints on all public functions
- Docstrings on all public classes and methods (Google style)

```bash
pip install ruff
ruff check .
ruff format .
```

**JavaScript/JSX (dashboard)**
- ESLint with the existing project config
- No inline styles on new components — use the existing design system tokens
- No emojis in UI strings (use SVG icons or colored dot indicators)

```bash
cd dashboard/admin
npm run lint
```

**General**
- No commented-out code in PRs
- No `print()` or `console.log()` debug statements left in
- Remove all `TODO: remove` and `FIXME` comments before marking ready

---

## 12. Tests

The test suite lives in `tests/`. All tests must run **fully offline**.

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --cov=. --cov-report=term-missing

# Run a specific file
python -m pytest tests/test_trust_scorer.py -v
```

**Rules:**
- Every new function in `agent/`, `adapters/`, `scoring/`, `retrieval/`, `llm/` must have at least one test
- Mock all external API calls (Jira, Slack, LLM endpoints)
- Tests must be deterministic — no flakiness tolerated
- Do not modify `benchmark_ground_truth.csv` without including a rationale and updated `benchmark_results.json`

---

## 13. Community expectations

- Be direct and technical in PRs and issues
- Critique the code, not the author
- English is the working language for all issues and PRs
- PRs that do not follow this guide will be returned with a link to the relevant section

---

**Questions?** Open an issue with the `question` label.
**Security issues?** Do not open a public issue — email the maintainer (see `CITATION.cff`).

---

*Arbiter MCP is maintained by [4ciki](https://github.com/4ciki). Apache 2.0 Licensed.*
