# Example 3 — P0 CRITICAL: Security Incident → Escalated (Human Overrides)

**Use case**: Suspected account takeover — user reports unauthorised access  
**Outcome**: Hard safety override, escalated to security team, human *overrides* Arbiter's resolution  
**Scenario type**: Demonstrates the full HITL loop — Arbiter escalates, human disagrees, loop resumes

---

## Input

**Jira webhook payload** (POST `/webhooks/jira`):

```json
{
  "issue": {
    "key": "IT-1019",
    "fields": {
      "summary": "Someone logged into my account from an unrecognised device",
      "description": "I received an email from our SSO provider saying my account was accessed from Lagos, Nigeria at 03:14 UTC. I was asleep. I have already changed my password but want to flag this.",
      "priority": { "name": "High" },
      "issuetype": { "name": "Security" },
      "created": "2026-09-19T06:17:00.000Z"
    }
  }
}
```

---

## LangGraph Agent Execution — First Pass

### Node 1: `retrieve_similar`
```
Query: "account accessed from unrecognised device, changed password..."
ChromaDB results:
  1. IT-0934: "Unusual login alert - user in different country"  cosine=0.89
  2. IT-0812: "Account compromise suspected - 2FA bypass"        cosine=0.81
  3. IT-0755: "SSO login from unknown IP, self-resolved"         cosine=0.77
Top-1 similarity: 0.89
```

### Node 2: `classify_ticket`
```
LLM response:
  category:    "security"
  risk_flags:  ["security"]
  confidence:  0.94
  reasoning:   "Potential account takeover from foreign IP during unusual hours.
                User has already rotated credentials, which is correct first
                response. However, security team must verify no data exfiltration,
                active sessions, or privilege escalation occurred."
```

### Node 3: `compute_trust_score`
```
S_retrieval = 0.89
S_category  = 0.30  (cold-start guard: security < 20 samples)
S_llm       = 0.94

TrustScore = 0.40 × 0.89 + 0.35 × 0.30 + 0.25 × 0.94
           = 0.356 + 0.105 + 0.235
           = 0.696
```

### Node 4: `apply_risk_override`
```
risk_flags = ["security"]
risk_override = True

⚠️  SAFETY OVERRIDE — security flag detected.
    Unconditional ESCALATE regardless of trust score.
```

### Node 5: `decide` → ESCALATE
```
decision      = "escalate"
reason        = "risk_override: security flag"
jira_priority = "Critical"
notify        = ["security-team", "#security-incidents"]
```

---

## Output — Slack Card Posted

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 SECURITY INCIDENT — IT-1019

"Someone logged into my account from an unrecognised device"

Severity:     P0 CRITICAL
Risk flags:   security
Trust score:  0.696 (override active — not used for decision)
Similar case: IT-0934 (89% match — suspected account takeover)

Action recommended: Verify active sessions, check for privilege
escalation, confirm no data exfiltration.

[View IT-1019]  [✓ Agree — Escalate]  [✗ Override — Auto-resolve]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Human Interaction — The Override Path

The security team lead reviews the ticket and determines:

> "User already rotated credentials, SSO shows no active foreign sessions,
>  no data access logs, this appears to be a geo-IP false alarm from VPN usage.
>  Closing as informational."

**Human clicks: `✗ Override — Auto-resolve`**

---

## Slack Interaction Callback (POST `/webhooks/slack/interactions`)

```
payload.actions[0].value = {"ticket_id": "IT-1019", "action": "override"}
payload.user.id          = "U012AB3CD"    (security team lead)
```

Signature verification: HMAC-SHA256 ✓

---

## LangGraph Agent Resume — Second Pass

### LangGraph checkpoint loaded
```
thread_id: "ticket-IT-1019"
State restored from SQLite checkpoint.
```

### Node 6: `process_human_decision`
```
human_response  = "override"
human_user      = "U012AB3CD"
resolution      = "Human override: security team confirmed no active threat,
                   geo-IP false alarm from VPN. Closing as informational.
                   Category success rate updated: security +1 override."
```

### Node 7: `update_jira_and_audit`
```
Jira IT-1019:
  Status:     Escalated → Done
  Resolution: "Closed by security team — informational, no active threat"
  Comment:    "Human override by U012AB3CD. Arbiter MCP learning update applied."

Audit log:
  human_decision    = "override"
  human_user        = "U012AB3CD"
  final_resolution  = "informational"
  category_update   = {"security": {"overrides": +1}}
```

---

## What Arbiter MCP Learned

The human override is **immediately used to update the category success rate**:

```
Before: security — 0 handled, 0 agreed → cold-start (0.30 penalty)
After:  security — 1 handled, 0 agreed → 0.0% agree rate
               (cold-start still active until 20 samples)
```

Over time, as the security team handles more tickets, the `S_category` component
will reflect their actual pattern — and cold-start protection will eventually lift.

---

## Key takeaway

> Arbiter MCP does not just route once and forget. The **human-in-the-loop cycle is
> a learning loop**: every agree/override updates the historical category success rate,
> making future classifications on similar tickets more accurate.

The full cycle:
```
Ticket arrives
    → Arbiter classifies + scores + decides
    → Human reviews (agree or override)
    → Arbiter updates category model
    → Next similar ticket: better calibrated
```

This is what separates Arbiter MCP from a static rule-based router.
