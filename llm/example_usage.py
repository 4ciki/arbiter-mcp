"""
How the rest of the agent (e.g. agent/nodes.py) uses this module.
Only this one place knows which vendors are involved — everywhere
else just calls `llm.classify(...)` or `llm.summarize_for_human(...)`.
"""

import os

from llm.groq_client import GroqLlamaClient
from llm.vertex_client import VertexAIClient
from llm.router import RoutedLLMClient

llm = RoutedLLMClient(
    fast_backend=GroqLlamaClient(api_key=os.environ["GROQ_API_KEY"]),
    strong_backend=VertexAIClient(project_id=os.environ["GCP_PROJECT_ID"]),
)

# --- classify: fires on every ticket, uses the fast backend ---
result = llm.classify("I can't connect to the office VPN from home.")
print(result.category, result.urgency, result.risk_flags, result.confidence)

# --- summarize: only fires when a ticket is escalated, uses the strong backend ---
summary = llm.summarize_for_human(
    ticket_text="Production payment API is returning 500s intermittently.",
    similar_cases=["Similar spike last month was traced to a expired TLS cert"],
)
print(summary.summary)

# --- swapping backends later takes one line, nothing else changes ---
# llm = RoutedLLMClient(
#     fast_backend=GroqLlamaClient(api_key=os.environ["GROQ_API_KEY"], model_name="openai/gpt-oss-120b"),
#     strong_backend=AnthropicClient(api_key=os.environ["ANTHROPIC_API_KEY"]),  # write this the same way
# )
