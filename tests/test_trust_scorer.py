"""
Unit tests for scoring/trust_scorer.py.

Safety-critical test suite (§2.6). All 8 required spec tests plus
boundary and invariant assertions are defined here.
"""

import pytest

from config import Settings
from llm.base import ClassificationResult
from schemas import CategoryStats, SimilarCase, TrustScore
from scoring.trust_scorer import (
    category_success_component,
    compute_trust_score,
    decide,
    llm_confidence_component,
    retrieval_component,
)


@pytest.fixture
def test_settings() -> Settings:
    """Provides a controlled Settings instance for testing."""
    return Settings(
        JIRA_SITE_URL="https://test.atlassian.net",
        JIRA_EMAIL="test@example.com",
        JIRA_API_TOKEN="token",
        SLACK_BOT_TOKEN="xoxb-test",
        SLACK_SIGNING_SECRET="secret",
        GOOGLE_APPLICATION_CREDENTIALS="/dummy/creds.json",
        GCP_PROJECT_ID="test-project",
        GROQ_API_KEY="gsk-test",
        TRUST_THRESHOLD=0.75,
        COLD_START_SUCCESS_RATE=0.3,
        COLD_START_MIN_SAMPLES=20,
        WEIGHT_RETRIEVAL=0.40,
        WEIGHT_CATEGORY=0.35,
        WEIGHT_LLM_CONFIDENCE=0.25,
    )


class TestTrustScorerSpecRequired:
    """The 8 required tests specified in spec §2.6 / Milestone 5."""

    def test_risk_override_always_escalates(self, test_settings: Settings):
        """
        A ticket with all three components = 1.0 but a risk flag still produces action="escalate".
        """
        classification = ClassificationResult(
            category="password",
            urgency="P1",
            risk_flags=["production", "data_loss"],
            confidence=1.0,
        )
        similar_cases = [
            SimilarCase(
                text="Resolved password ticket",
                resolution="Reset password via portal",
                similarity=1.0,
            )
        ]
        category_stats = CategoryStats(
            category="password",
            total_handled=100,
            human_agreed_count=100,  # 100% success rate
        )

        score = compute_trust_score(
            similar_cases=similar_cases,
            classification=classification,
            category_stats=category_stats,
            settings=test_settings,
        )

        # Value should be 1.0 (score is still calculated and logged)
        assert score.value == 1.0
        assert score.risk_override is True

        # Despite score 1.0 >= threshold 0.75, decide must escalate
        action = decide(score, threshold=test_settings.TRUST_THRESHOLD)
        assert action == "escalate"

    def test_cold_start_zero_samples(self, test_settings: Settings):
        """
        A category with 0 samples never produces category_success_component > cold_start_rate.
        """
        stats_none = category_success_component(
            stats=None,
            cold_start_rate=test_settings.COLD_START_SUCCESS_RATE,
            min_samples=test_settings.COLD_START_MIN_SAMPLES,
        )
        assert stats_none == test_settings.COLD_START_SUCCESS_RATE
        assert stats_none <= test_settings.COLD_START_SUCCESS_RATE

        zero_stats = CategoryStats(
            category="new_cat",
            total_handled=0,
            human_agreed_count=0,
        )
        stats_zero = category_success_component(
            stats=zero_stats,
            cold_start_rate=test_settings.COLD_START_SUCCESS_RATE,
            min_samples=test_settings.COLD_START_MIN_SAMPLES,
        )
        assert stats_zero == test_settings.COLD_START_SUCCESS_RATE
        assert stats_zero <= test_settings.COLD_START_SUCCESS_RATE

    def test_cold_start_min_samples_boundary(self, test_settings: Settings):
        """
        A category with exactly min_samples - 1 records still uses cold-start rate.
        """
        min_samples = test_settings.COLD_START_MIN_SAMPLES
        # Even if human agreement is 100% on min_samples - 1 records
        boundary_stats = CategoryStats(
            category="untested_cat",
            total_handled=min_samples - 1,
            human_agreed_count=min_samples - 1,
        )
        rate = category_success_component(
            stats=boundary_stats,
            cold_start_rate=test_settings.COLD_START_SUCCESS_RATE,
            min_samples=min_samples,
        )
        assert rate == test_settings.COLD_START_SUCCESS_RATE

    def test_weights_sum_check(self, test_settings: Settings):
        """
        w1 + w2 + w3 == 1.0 using configured defaults.
        """
        total_weight = (
            test_settings.WEIGHT_RETRIEVAL
            + test_settings.WEIGHT_CATEGORY
            + test_settings.WEIGHT_LLM_CONFIDENCE
        )
        assert total_weight == pytest.approx(1.0)

    def test_weighted_combination_correct(self, test_settings: Settings):
        """
        Known inputs produce the exactly expected output value.
        Weights: retrieval 0.40, category 0.35, llm 0.25
        Inputs: retrieval 0.80, category 0.60 (30/50), llm 0.90
        Expected: 0.40*0.80 + 0.35*0.60 + 0.25*0.90 = 0.32 + 0.21 + 0.225 = 0.755
        """
        similar_cases = [
            SimilarCase(
                text="Case 1",
                resolution="Resolved",
                similarity=0.80,
            )
        ]
        classification = ClassificationResult(
            category="vpn",
            urgency="P3",
            risk_flags=[],
            confidence=0.90,
        )
        category_stats = CategoryStats(
            category="vpn",
            total_handled=50,
            human_agreed_count=30,  # 30/50 = 0.60
        )

        score = compute_trust_score(
            similar_cases=similar_cases,
            classification=classification,
            category_stats=category_stats,
            settings=test_settings,
        )

        assert score.retrieval_component == 0.80
        assert score.category_success_component == 0.60
        assert score.llm_confidence_component == 0.90
        assert score.value == 0.755
        assert score.risk_override is False

    def test_no_similar_cases_returns_zero_retrieval(self, test_settings: Settings):
        """
        Empty similar_cases → retrieval_component == 0.0.
        """
        assert retrieval_component([]) == 0.0

        classification = ClassificationResult(
            category="vpn",
            urgency="P3",
            risk_flags=[],
            confidence=0.8,
        )
        score = compute_trust_score(
            similar_cases=[],
            classification=classification,
            category_stats=None,
            settings=test_settings,
        )
        assert score.retrieval_component == 0.0

    def test_above_threshold_no_risk_auto_resolves(self, test_settings: Settings):
        """
        Score ≥ threshold + no risk flags → "auto_resolve".
        """
        trust_score = TrustScore(
            value=0.76,
            retrieval_component=0.8,
            category_success_component=0.8,
            llm_confidence_component=0.7,
            risk_override=False,
        )
        action = decide(trust_score, threshold=test_settings.TRUST_THRESHOLD)
        assert action == "auto_resolve"

        # Boundary: exactly equal to threshold
        boundary_score = TrustScore(
            value=0.75,
            retrieval_component=0.8,
            category_success_component=0.8,
            llm_confidence_component=0.7,
            risk_override=False,
        )
        assert decide(boundary_score, threshold=0.75) == "auto_resolve"

    def test_below_threshold_no_risk_escalates(self, test_settings: Settings):
        """
        Score < threshold + no risk flags → "escalate".
        """
        trust_score = TrustScore(
            value=0.749,
            retrieval_component=0.7,
            category_success_component=0.7,
            llm_confidence_component=0.7,
            risk_override=False,
        )
        action = decide(trust_score, threshold=test_settings.TRUST_THRESHOLD)
        assert action == "escalate"


class TestTrustScorerAdditionalCases:
    """Additional edge cases and boundary assertions."""

    def test_cold_start_at_exact_min_samples_uses_historical_rate(
        self, test_settings: Settings
    ):
        """
        When total_handled reaches exactly min_samples, cold start is lifted
        and the real historical rate is used.
        """
        min_samples = test_settings.COLD_START_MIN_SAMPLES
        stats = CategoryStats(
            category="hardware",
            total_handled=min_samples,
            human_agreed_count=min_samples,  # 100%
        )
        rate = category_success_component(
            stats=stats,
            cold_start_rate=test_settings.COLD_START_SUCCESS_RATE,
            min_samples=min_samples,
        )
        assert rate == 1.0

    def test_retrieval_component_selects_maximum_similarity(self):
        """
        When multiple similar cases are present, the highest similarity is used.
        """
        cases = [
            SimilarCase(text="T1", resolution="R1", similarity=0.45),
            SimilarCase(text="T2", resolution="R2", similarity=0.92),
            SimilarCase(text="T3", resolution="R3", similarity=0.78),
        ]
        assert retrieval_component(cases) == 0.92

    def test_empty_or_blank_risk_flags_do_not_override(
        self, test_settings: Settings
    ):
        """
        Empty list or whitespace-only items in risk_flags do not trigger risk override.
        """
        classification = ClassificationResult(
            category="access",
            urgency="P3",
            risk_flags=["", "   "],
            confidence=0.9,
        )
        score = compute_trust_score(
            similar_cases=[],
            classification=classification,
            category_stats=None,
            settings=test_settings,
        )
        assert score.risk_override is False
