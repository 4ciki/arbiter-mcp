import json

import vertexai
from vertexai.generative_models import GenerativeModel

from .base import LLMClient, ClassificationResult, SummaryResult
from .prompts import CLASSIFY_PROMPT, SUMMARY_PROMPT


def _strip_json_fences(text: str) -> str:
    """Gemini sometimes wraps JSON in ```json ... ``` even when told not to."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


class VertexAIClient(LLMClient):
    """Google Cloud Vertex AI backend. Good fit for the summarize step,
    where a stronger reasoning model is worth the extra latency/cost."""

    def __init__(
        self,
        project_id: str,
        location: str = "us-central1",
        model_name: str = "gemini-3.8-flash",
        # NOTE: gemini-3.8-flash is the current stable Flash-tier model as of
        # September 2026. Check the Vertex AI model garden before assuming this
        # is still current: https://cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash
    ):
        vertexai.init(project=project_id, location=location)
        self.model = GenerativeModel(model_name)

    def classify(self, ticket_text: str) -> ClassificationResult:
        prompt = CLASSIFY_PROMPT.format(ticket_text=ticket_text)
        response = self.model.generate_content(prompt)
        data = json.loads(_strip_json_fences(response.text))
        return ClassificationResult(
            category=data["category"],
            urgency=data["urgency"],
            risk_flags=data.get("risk_flags", []),
            confidence=float(data.get("confidence", 0.0)),
        )

    def summarize_for_human(
        self, ticket_text: str, similar_cases: list[str]
    ) -> SummaryResult:
        cases_text = "\n".join(f"- {c}" for c in similar_cases) or "None found"
        prompt = SUMMARY_PROMPT.format(
            ticket_text=ticket_text, similar_cases=cases_text
        )
        response = self.model.generate_content(prompt)
        return SummaryResult(summary=response.text.strip(), recommended_action="")
