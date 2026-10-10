# Examples — Arbiter MCP

This directory contains concrete end-to-end examples of how Arbiter MCP
processes IT support tickets. Each example shows the exact input, every
reasoning step, and the resulting output — for both auto-resolved and
escalated cases.

These are real execution traces from `run_benchmark.py` against the live pipeline.

---

## Examples in this directory

| File | Severity | Outcome |
|------|----------|---------|
| [01_production_outage_critical.md](01_production_outage_critical.md) | P0 CRITICAL | Escalated to human (risk_override) |
| [02_vpn_routine_autoresolved.md](02_vpn_routine_autoresolved.md) | P3 LOW | Auto-resolved (trust_score 0.82) |
| [03_security_incident_escalated.md](03_security_incident_escalated.md) | P0 CRITICAL | Escalated to human (risk_override) |

---

## How to run these examples

```bash
git clone https://github.com/4ciki/arbiter-mcp.git
cd arbiter-mcp
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run_benchmark.py   # runs all 40 benchmark tickets
```

Full per-ticket traces are saved to `benchmark_results.json`.
