# Example 2 — P3 LOW: Routine VPN Issue → Auto-Resolved

**Use case**: VPN disconnects for one user, workaround available  
**Outcome**: Auto-resolved — no human needed, Jira task created and closed automatically  
**Scenario type**: The high-volume routine case Arbiter MCP handles without any human involvement

---

## Input

**Jira webhook payload** (POST `/webhooks/jira`):

```json
{
  "issue": {
    "key": "IT-1031",
    "fields": {
      "summary": "VPN keeps disconnecting for me, using hotspot as workaround",
      "description": "My VPN client disconnects every ~20 minutes. I am using my mobile hotspot in the meantime so it is not blocking me. Running Windows 11, Cisco AnyConnect 4.10.",
      "priority": { "name": "Low" },
      "issuetype": { "name": "Service Request" },
      "created": "2026-09-19T09:11:00.000Z"
    }
  }
}
```

---

## LangGraph Agent Execution

### Node 1: `retrieve_similar`
```
Query embedding: all-MiniLM-L6-v2("VPN keeps disconnecting, using hotspot as workaround...")
ChromaDB results:
  1. IT-0891: "VPN timeout errors on Windows, reboot fixed it"       cosine=0.87
  2. IT-0743: "Cisco AnyConnect drops after 15 min - DNS fix"        cosine=0.83
  3. IT-0602: "VPN intermittent on corporate wifi - resolved by IT"  cosine=0.79
Top-1 similarity: 0.87
```

### Node 2: `classify_ticket`
```
LLM: Groq openai/gpt-oss-20b

Prompt input:
  ticket_text = "VPN keeps disconnecting for me, using hotspot as workaround..."
  similar_cases = [IT-0891, IT-0743, IT-0602]

LLM response:
  category:    "network"
  risk_flags:  []          ← no production, security, billing, data_loss
  confidence:  0.91
  reasoning:   "Single user affected. Workaround in place. No production impact.
                Multiple similar historical cases resolved with standard VPN
                troubleshooting steps. Low risk, high confidence."
```

### Node 3: `compute_trust_score`
```
S_retrieval = 0.87  (strong match to prior resolved VPN tickets)
S_category  = 0.71  (network category: 34 handled, 24 agreed = 70.6%)
S_llm       = 0.91  (high model confidence)

TrustScore = 0.40 × 0.87 + 0.35 × 0.71 + 0.25 × 0.91
           = 0.348 + 0.249 + 0.228
           = 0.825
```

### Node 4: `apply_risk_override`
```
risk_flags = []
risk_override = False

No override. Proceeding to trust threshold check.
Auto-resolve threshold: 0.75
TrustScore (0.825) ≥ 0.75 → AUTO-RESOLVE
```

### Node 5: `decide` → AUTO-RESOLVE
```
decision      = "auto_resolve"
resolution    = "Standard VPN reconnect troubleshooting applied based on
                 similar resolved tickets IT-0891 and IT-0743. Steps:
                 1. Update Cisco AnyConnect to latest version.
                 2. Flush DNS: ipconfig /flushdns.
                 3. Reconnect on corporate WiFi, not external network.
                 4. If persists, submit new ticket with VPN logs attached."
```

---

## Output

### Jira task resolved automatically
```
IT-1031
  Status:   Open → Done
  Resolution: Done
  Comment: "Arbiter MCP auto-resolved (trust_score=0.825).
            Similar cases: IT-0891 (87% match), IT-0743 (83% match).
            Resolution steps posted to ticket. No human review required."
```

### Slack reply to originating thread (if Slack-originated)
```
Slack thread reply:
  "✅ IT-1031 auto-resolved.
   Resolution: Standard VPN troubleshooting steps applied.
   See Jira IT-1031 for details. Let us know if the issue persists."
```

### Audit log entry (SQLite)
```json
{
  "ticket_id": "IT-1031",
  "timestamp": "2026-09-19T09:11:01.044Z",
  "category": "network",
  "risk_override": false,
  "risk_flags": [],
  "trust_score": 0.825,
  "retrieval_score": 0.87,
  "category_success_rate": 0.706,
  "llm_confidence": 0.91,
  "decision": "auto_resolve",
  "latency_ms": 987
}
```

---

## Key takeaway

> No human was involved. The ticket was classified, scored, and resolved in **987ms**.
> The resolution was grounded in **three similar resolved tickets** retrieved from
> ChromaDB — not hallucinated. Arbiter MCP cites its sources in the Jira comment.

This is the economic case for Arbiter MCP: the **80% of tickets** that are routine
VPN issues, password resets, and software requests are handled autonomously.
The on-call engineer only sees the 20% that matter.
