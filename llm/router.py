from .base import LLMClient, ClassificationResult, SummaryResult


class RoutedLLMClient(LLMClient):
    """Sends the high-volume, low-stakes call (classify) to a fast/cheap
    backend, and the low-volume, judgment-heavy call (summarize_for_human)
    to a stronger backend. The agent graph only ever imports this class —
    it never knows or cares which vendors are behind it.

    Swap either backend, or point both at the same one, with a one-line
    change here. Nothing else in the codebase changes.
    """

    def __init__(
        self,
        fast_backend: LLMClient | None = None,
        strong_backend: LLMClient | None = None,
    ):
        if fast_backend is None:
            from .groq_client import GroqLlamaClient
            fast_backend = GroqLlamaClient(model_name="openai/gpt-oss-20b")
        if strong_backend is None:
            from .groq_client import GroqLlamaClient
            strong_backend = GroqLlamaClient(model_name="openai/gpt-oss-120b")
        self.fast = fast_backend
        self.strong = strong_backend

    def classify(self, ticket_text: str) -> ClassificationResult:
        return self.fast.classify(ticket_text)

    def summarize_for_human(
        self, ticket_text: str, similar_cases: list[str]
    ) -> SummaryResult:
        return self.strong.summarize_for_human(ticket_text, similar_cases)
