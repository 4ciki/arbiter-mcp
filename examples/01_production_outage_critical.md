# Example 1 — P0 CRITICAL: Production Outage → Escalated to Human

**Use case**: Production login completely down for all customers  
**Outcome**: Hard safety override, Jira incident created, on-call notified via Slack  
**Scenario type**: The most important case — Arbiter MCP must NEVER auto-resolve this

---

## Input

**Jira webhook payload** (POST `/webhooks/jira`):

```json
{
  "issue": {
    "key": "IT-1024",
    "fields": {
      "summary": "Production login is completely down for all customers",
      "description": "All users are unable to log in to the production environment. Error: 500 Internal Server Error on /auth/login. Started 14 minutes ago. Customer Success team is receiving multiple reports.",
      "priority": { "name": "Critical" },
      "issuetype": { "name": "Incident" },
      "created": "2026-09-19T07:44:00.000Z"
    }
  }
}
```

---

## LangGraph Agent Execution

### Node 1: `retrieve_similar`
```
Query embedding: all-MiniLM-L6-v2("Production login is completely down...")
ChromaDB results:
  1. IT-0823: "Login page 500 error for enterprise customers"  cosine=0.91
  2. IT-0711: "Auth service degraded - subset of users"         cosine=0.74
  3. IT-0650: "Password reset broken - affects all users"       cosine=0.69
Top-1 similarity: 0.91
```

### Node 2: `classify_ticket`
```
LLM: Groq openai/gpt-oss-20b

Prompt input:
  ticket_text = "Production login is completely down for all customers..."
  similar_cases = [IT-0823, IT-0711, IT-0650]

LLM response:
  category:    "security"
  risk_flags:  ["production", "security"]
  confidence:  0.96
  reasoning:   "Production-wide authentication failure affecting all customers.
                Explicit 'production' keyword and complete service outage indicate
                P0 incident. Prior resolved case IT-0823 is highly similar."
```

### Node 3: `compute_trust_score`
```
S_retrieval = 0.91  (cosine similarity of best match)
S_category  = 0.30  (cold-start guard: security has < 20 samples)
S_llm       = 0.96  (model confidence)

TrustScore = 0.40 × 0.91 + 0.35 × 0.30 + 0.25 × 0.96
           = 0.364 + 0.105 + 0.240
           = 0.709
```

### Node 4: `apply_risk_override`
```
risk_flags detected: ["production", "security"]
risk_override = True

⚠️  SAFETY OVERRIDE ACTIVE
    Trust score (0.709) is IRRELEVANT.
    Decision is ESCALATE regardless of score.
    This is a mathematical guarantee, not a prompt instruction.
```

### Node 5: `decide` → ESCALATE
```
decision     = "escalate"
reason       = "risk_override: production + security flags detected"
jira_priority = "Blocker"
notify        = ["on-call", "#incidents"]
```

---

## Output

### Jira issue updated
```
IT-1024
  Status:   In Progress → Escalated
  Priority: Critical → Blocker
  Label:    production-incident
  Comment:  "Arbiter MCP: risk_override triggered.
             risk_flags=[production, security].
             Assigned to on-call team. Human review required."
  Assignee: on-call-engineer@company.com
```

### Slack Block Kit card posted to `#incidents`
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL INCIDENT — IT-1024

Production login is completely down for all customers

Severity:     P0 CRITICAL
Risk flags:   production, security
Trust score:  0.709 (override active)
Similar case: IT-0823 (91% match)

[View Jira: IT-1024]  [✓ Agree]  [✗ Override]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Jira link posted back to originating thread
```
Slack thread reply:
  "Incident IT-1024 created [Blocker / Critical].
   On-call team notified. Review required: <jira-link>"
```

### Audit log entry (SQLite)
```json
{
  "ticket_id": "IT-1024",
  "timestamp": "2026-09-19T07:44:01.203Z",
  "category": "security",
  "risk_override": true,
  "risk_flags": ["production", "security"],
  "trust_score": 0.709,
  "retrieval_score": 0.91,
  "llm_confidence": 0.96,
  "decision": "escalate",
  "jira_priority": "Blocker",
  "latency_ms": 1034
}
```

---

## Key takeaway

> Even though the trust score (0.709) is above some thresholds, **the risk_override
> unconditionally escalates**. No configuration, no prompt tuning, and no LLM output
> can bypass this. It is enforced in [`scoring/trust_scorer.py`](../scoring/trust_scorer.py)
> as a code-level invariant.

This is the core safety property that differentiates Arbiter MCP from
prompt-only routing approaches.
