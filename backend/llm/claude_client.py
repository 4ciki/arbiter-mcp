"""
Anthropic Claude LLM client for Arbiter.

Mirrors the GroqLlamaClient interface exactly so the RoutedLLMClient
can swap between providers without any changes in the agent graph.
"""

import json
import logging
import time

from config import settings
from .base import LLMClient, ClassificationResult, SummaryResult
from .prompts import CLASSIFY_PROMPT, SUMMARY_PROMPT

log = logging.getLogger(__name__)

# Default models: fast/cheap for classify, stronger for summarize
DEFAULT_FAST_MODEL   = "claude-haiku-4-5"
DEFAULT_STRONG_MODEL = "claude-sonnet-4-5"


class ClaudeClient(LLMClient):
    """Anthropic Claude backend. Provides the same classify / summarize_for_human
    interface as GroqLlamaClient so the router is completely transparent."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str = DEFAULT_FAST_MODEL,
    ):
        try:
            import anthropic as _anthropic
        except ImportError as exc:
            raise ImportError(
                "anthropic package is required to use ClaudeClient. "
                "Install it with: pip install anthropic"
            ) from exc

        key = api_key or getattr(settings, "ANTHROPIC_API_KEY", "")
        self._anthropic = _anthropic
        self.client     = _anthropic.Anthropic(api_key=key)
        self.model_name = model_name

    def classify(self, ticket_text: str) -> ClassificationResult:
        prompt = CLASSIFY_PROMPT.format(ticket_text=ticket_text)
        max_attempts = 4
        for attempt in range(max_attempts):
            try:
                msg = self.client.messages.create(
                    model=self.model_name,
                    max_tokens=512,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = msg.content[0].text.strip()
                # Strip markdown code fences if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                data = json.loads(content)
                return ClassificationResult(
                    category=data["category"],
                    urgency=data["urgency"],
                    risk_flags=data.get("risk_flags", []),
                    confidence=float(data.get("confidence", 0.0)),
                )
            except Exception as exc:
                err = str(exc)
                is_rate = "429" in err or "rate_limit" in err.lower() or "overloaded" in err.lower()
                if is_rate and attempt < max_attempts - 1:
                    wait_s = 2 ** (attempt + 1)
                    log.warning(
                        "Claude rate-limit/overload during classify, waiting %ds (attempt %d): %s",
                        wait_s, attempt + 1, exc,
                    )
                    time.sleep(wait_s)
                else:
                    raise

    def summarize_for_human(
        self, ticket_text: str, similar_cases: list[str]
    ) -> SummaryResult:
        cases_text = "\n".join(f"- {c}" for c in similar_cases) or "None found"
        prompt = SUMMARY_PROMPT.format(
            ticket_text=ticket_text, similar_cases=cases_text
        )
        max_attempts = 4
        for attempt in range(max_attempts):
            try:
                msg = self.client.messages.create(
                    model=self.model_name,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = msg.content[0].text.strip()
                return SummaryResult(summary=content, recommended_action="")
            except Exception as exc:
                err = str(exc)
                is_rate = "429" in err or "rate_limit" in err.lower() or "overloaded" in err.lower()
                if is_rate and attempt < max_attempts - 1:
                    wait_s = 2 ** (attempt + 1)
                    log.warning(
                        "Claude rate-limit/overload during summarize, waiting %ds (attempt %d): %s",
                        wait_s, attempt + 1, exc,
                    )
                    time.sleep(wait_s)
                else:
                    raise
