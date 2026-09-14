import json
import logging
import time

from groq import Groq

from config import settings
from .base import LLMClient, ClassificationResult, SummaryResult
from .prompts import CLASSIFY_PROMPT, SUMMARY_PROMPT

log = logging.getLogger(__name__)


class GroqLlamaClient(LLMClient):
    """Groq-hosted open-weight Llama backend. Very low latency and cost,
    which makes it the right fit for the classify step that runs on
    every single ticket."""

    def __init__(self, api_key: str | None = None, model_name: str = "openai/gpt-oss-20b"):
        key = api_key or getattr(settings, "GROQ_API_KEY", "")
        self.client = Groq(api_key=key)
        self.model_name = model_name

    def classify(self, ticket_text: str) -> ClassificationResult:
        prompt = CLASSIFY_PROMPT.format(ticket_text=ticket_text)
        max_attempts = 4
        for attempt in range(max_attempts):
            try:
                completion = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                )
                data = json.loads(completion.choices[0].message.content)
                return ClassificationResult(
                    category=data["category"],
                    urgency=data["urgency"],
                    risk_flags=data.get("risk_flags", []),
                    confidence=float(data.get("confidence", 0.0)),
                )
            except Exception as exc:
                if ("429" in str(exc) or "rate_limit" in str(exc).lower()) and attempt < max_attempts - 1:
                    wait_s = 2 ** (attempt + 1)
                    log.warning("Groq rate limit hit during classify, waiting %ds (attempt %d): %s", wait_s, attempt + 1, exc)
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
                completion = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = completion.choices[0].message.content.strip()
                return SummaryResult(summary=content, recommended_action="")
            except Exception as exc:
                if ("429" in str(exc) or "rate_limit" in str(exc).lower()) and attempt < max_attempts - 1:
                    wait_s = 2 ** (attempt + 1)
                    log.warning("Groq rate limit hit during summarize, waiting %ds (attempt %d): %s", wait_s, attempt + 1, exc)
                    time.sleep(wait_s)
                else:
                    raise
