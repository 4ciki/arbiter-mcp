"""
llm — provider-agnostic LLM abstraction layer.

The agent graph only ever imports from this package. No other module in
the codebase should import a vendor SDK (vertexai, groq, anthropic, …)
directly. Swapping or mixing providers is a one-line change in the
wiring layer (example_usage.py or wherever the app bootstraps the client)
— nothing in /agent, /scoring, or /adapters ever needs to change.

Public surface:
    LLMClient          — abstract base class every backend must implement
    ClassificationResult — result of the classify() call
    SummaryResult        — result of the summarize_for_human() call
    RoutedLLMClient    — production client: fast backend for classify,
                         strong backend for summarize_for_human
    GroqLlamaClient    — Groq-hosted open-weight backend
    VertexAIClient     — Google Cloud Vertex AI backend
"""

from .base import LLMClient, ClassificationResult, SummaryResult
from .router import RoutedLLMClient
from .groq_client import GroqLlamaClient
from .vertex_client import VertexAIClient

__all__ = [
    "LLMClient",
    "ClassificationResult",
    "SummaryResult",
    "RoutedLLMClient",
    "GroqLlamaClient",
    "VertexAIClient",
]
