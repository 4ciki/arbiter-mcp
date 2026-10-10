"""
LLM router — picks the right backend based on LLM_PROVIDER setting.

Provider selection order:
  1. Explicit fast_backend / strong_backend arguments (test injection)
  2. settings.LLM_PROVIDER env var ("groq" or "claude")
  3. Fallback: whichever key is present (groq → claude → error)
"""

from __future__ import annotations

from config import settings
from .base import LLMClient, ClassificationResult, SummaryResult


def _build_default_clients() -> tuple[LLMClient, LLMClient]:
    """Return (fast_client, strong_client) based on configured provider."""
    provider = (settings.LLM_PROVIDER or "groq").lower().strip()

    if provider == "claude":
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError(
                "LLM_PROVIDER=claude but ANTHROPIC_API_KEY is not set. "
                "Set it in .env or via environment variable."
            )
        from .claude_client import ClaudeClient, DEFAULT_FAST_MODEL, DEFAULT_STRONG_MODEL
        fast   = ClaudeClient(model_name=DEFAULT_FAST_MODEL)
        strong = ClaudeClient(model_name=DEFAULT_STRONG_MODEL)

    else:
        # Default: Groq (also fallback if provider unknown)
        if not settings.GROQ_API_KEY and settings.ANTHROPIC_API_KEY:
            # Auto-fallback: no Groq key but Claude key present
            from .claude_client import ClaudeClient, DEFAULT_FAST_MODEL, DEFAULT_STRONG_MODEL
            fast   = ClaudeClient(model_name=DEFAULT_FAST_MODEL)
            strong = ClaudeClient(model_name=DEFAULT_STRONG_MODEL)
        else:
            from .groq_client import GroqLlamaClient
            fast   = GroqLlamaClient(model_name="openai/gpt-oss-20b")
            strong = GroqLlamaClient(model_name="openai/gpt-oss-120b")

    return fast, strong


class RoutedLLMClient(LLMClient):
    """Sends classify (high-volume, low-stakes) to a fast backend and
    summarize_for_human (low-volume, judgment-heavy) to a strong backend.

    The agent graph only ever imports this class — it never knows or cares
    which vendor is behind it.  Swap providers by changing LLM_PROVIDER in .env.
    """

    def __init__(
        self,
        fast_backend: LLMClient | None = None,
        strong_backend: LLMClient | None = None,
    ):
        if fast_backend is None or strong_backend is None:
            _fast, _strong = _build_default_clients()
            fast_backend   = fast_backend   or _fast
            strong_backend = strong_backend or _strong

        self.fast   = fast_backend
        self.strong = strong_backend

    def classify(self, ticket_text: str) -> ClassificationResult:
        return self.fast.classify(ticket_text)

    def summarize_for_human(
        self, ticket_text: str, similar_cases: list[str]
    ) -> SummaryResult:
        return self.strong.summarize_for_human(ticket_text, similar_cases)
