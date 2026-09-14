"""
Trust scorer — pure calculation functions for ticket evaluation.

Safety-critical core (§2.6):
Combines retrieval similarity, historical category success rate, and LLM confidence.
Guarantees cold-start safety for new categories and risk-keyword safety overrides.

No I/O or state lives here — all inputs are explicitly passed in.
"""

from __future__ import annotations

from typing import Literal

from config import Settings
from llm.base import ClassificationResult
from schemas import CategoryStats, SimilarCase, TrustScore


def retrieval_component(similar_cases: list[SimilarCase]) -> float:
    """
    Returns similarity of best-matching case, or 0.0 if no cases found.
    """
    if not similar_cases:
        return 0.0
    best_sim = max(case.similarity for case in similar_cases)
    return max(0.0, min(1.0, float(best_sim)))


def category_success_component(
    stats: CategoryStats | None,
    cold_start_rate: float,
    min_samples: int,
) -> float:
    """
    Cold-start guard: if stats is None or total_handled < min_samples,
    return cold_start_rate — never 0.0 or 1.0 for untested categories.
    When total_handled >= min_samples, returns human_agreed_count / total_handled.
    """
    if stats is None or stats.total_handled < min_samples:
        return max(0.0, min(1.0, float(cold_start_rate)))
    if stats.total_handled == 0:
        return max(0.0, min(1.0, float(cold_start_rate)))
    rate = stats.human_agreed_count / stats.total_handled
    return max(0.0, min(1.0, float(rate)))


def llm_confidence_component(classification: ClassificationResult) -> float:
    """
    Returns classification.confidence directly (already 0–1).
    """
    return max(0.0, min(1.0, float(classification.confidence)))


def compute_trust_score(
    similar_cases: list[SimilarCase],
    classification: ClassificationResult,
    category_stats: CategoryStats | None,
    settings: Settings,
) -> TrustScore:
    """
    Combines the three components with configured weights.
    Sets risk_override=True if any risk keyword appears in classification.risk_flags.
    risk_override is computed AFTER the score (so scores are always logged)
    but BEFORE any decision is made.
    """
    r_comp = retrieval_component(similar_cases)
    c_comp = category_success_component(
        category_stats,
        cold_start_rate=settings.COLD_START_SUCCESS_RATE,
        min_samples=settings.COLD_START_MIN_SAMPLES,
    )
    l_comp = llm_confidence_component(classification)

    raw_value = (
        settings.WEIGHT_RETRIEVAL * r_comp
        + settings.WEIGHT_CATEGORY * c_comp
        + settings.WEIGHT_LLM_CONFIDENCE * l_comp
    )
    value = max(0.0, min(1.0, round(raw_value, 4)))

    has_risk = bool(
        classification.risk_flags
        and any(bool(str(flag).strip()) for flag in classification.risk_flags)
    )

    return TrustScore(
        value=value,
        retrieval_component=r_comp,
        category_success_component=c_comp,
        llm_confidence_component=l_comp,
        risk_override=has_risk,
    )


def decide(trust_score: TrustScore, threshold: float) -> Literal["auto_resolve", "escalate"]:
    """
    Returns "escalate" if risk_override is True, regardless of value.
    Returns "auto_resolve" only if value >= threshold AND risk_override is False.
    """
    if trust_score.risk_override:
        return "escalate"
    if trust_score.value >= threshold:
        return "auto_resolve"
    return "escalate"
