"""
Shared interface every model backend must implement.

Nothing else in the codebase should import a vendor SDK (vertexai, groq,
anthropic, openai...) directly. The agent graph only ever talks to
LLMClient, so swapping or mixing providers never touches calling code.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ClassificationResult:
    category: str          # e.g. "password", "vpn", "hardware", "access", "other"
    urgency: str            # "P1" (most urgent) to "P4" (least urgent)
    risk_flags: list[str] = field(default_factory=list)  # e.g. ["production", "security"]
    confidence: float = 0.0  # model's self-reported certainty, 0-1


@dataclass
class SummaryResult:
    summary: str
    recommended_action: str


class LLMClient(ABC):
    @abstractmethod
    def classify(self, ticket_text: str) -> ClassificationResult:
        """Fast, cheap call: category + urgency + risk keywords + confidence.
        Called on every single ticket, so this should be the small/quick model."""
        raise NotImplementedError

    @abstractmethod
    def summarize_for_human(
        self, ticket_text: str, similar_cases: list[str]
    ) -> SummaryResult:
        """Slower, higher-quality call: only used on the escalation path,
        so it's fine to spend more time/cost here for a better result."""
        raise NotImplementedError
