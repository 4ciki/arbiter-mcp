"""
Prompts live here, separate from any vendor client, so every backend
asks the model the exact same question in the exact same way. That's
what makes results comparable when you benchmark providers against
each other later.
"""

CLASSIFY_PROMPT = """You are triaging an IT support ticket. Return ONLY valid JSON, no other text, no markdown fences.

Ticket: {ticket_text}

Risk Flag Definitions and Negative Boundaries:
- "production": Active IT production systems, live production servers, databases, or critical deployment pipelines. DO NOT flag for physical office/factory locations (e.g. "production floor", "warehouse"), local printers, or personal devices.
- "security": Actual account takeover, unauthorized login, credential breach, malware, unusual exfiltration traffic, or physical hardware fire/safety hazards (e.g. swollen battery). DO NOT flag for routine password resets, self-lockouts after wrong password attempts, VPN connection handshake timeouts, internal SSL certificate warnings, or office badge access.
- "billing": Fraudulent, incorrect, or duplicate financial charges on corporate cards or invoices. DO NOT flag for routine license renewal lag or normal subscription expirations.
- "data_loss": Irrecoverable deletion, corruption, or catastrophic loss of business data, client contracts, or databases. DO NOT flag for routine file edits or cache clearing.

Return JSON with exactly these keys:
{{
  "category": one of ["password", "vpn", "hardware", "access", "software", "network", "other"],
  "urgency": one of ["P1", "P2", "P3", "P4"],
  "risk_flags": array of any of the 4 risk keywords that strictly meet the definitions above: ["production", "security", "billing", "data_loss"],
  "confidence": a number between 0 and 1 for how certain you are of this classification
}}"""

SUMMARY_PROMPT = """A support ticket needs human review because it's either unclear or potentially risky.
Write a short, plain-language summary a busy person can read in five seconds, plus a recommended action.

Ticket: {ticket_text}

Similar past cases found:
{similar_cases}

Respond in 3-4 sentences: what the issue is, what's uncertain or risky about it, and what you'd recommend doing."""
