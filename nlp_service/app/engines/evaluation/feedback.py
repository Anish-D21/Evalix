"""
Deterministic feedback generation (spec Section 34). No external LLM —
plain template-based composition from the already-computed concept and
relationship results.
"""

from __future__ import annotations

from typing import List

from app.engines.evaluation.scoring import ConceptScoreResult


def generate_feedback(
    concept_scores: List[ConceptScoreResult],
    relationship_results: List[dict],
    misconceptions: List[dict],
    overall_ratio: float,
) -> dict:
    covered = [c for c in concept_scores if c.coverage in ("full", "high_partial")]
    partial = [c for c in concept_scores if c.coverage in ("partial", "low_evidence")]
    missing = [c for c in concept_scores if c.coverage == "not_covered"]
    contradicted = [c for c in concept_scores if c.coverage == "contradicted"]

    strengths = [f"Demonstrated understanding of {c.name}." for c in covered]
    if not strengths and partial:
        strengths.append("Shows partial understanding of some expected concepts.")

    improvement_areas = [f"Coverage of {c.name} was weak or unclear — consider elaborating." for c in partial]
    for c in missing:
        importance = (c.importance or "medium").lower()
        if importance in ("critical", "high"):
            improvement_areas.append(f"{c.name} was not addressed and is an important part of the expected answer.")
    for c in contradicted:
        improvement_areas.append(
            f"{c.name} appears to be explicitly contradicted rather than simply missing — please review this part "
            f"of your answer."
        )

    revision_recommendations = []
    critical_missing = [c.name for c in missing if (c.importance or "").lower() in ("critical", "high")]
    if critical_missing:
        revision_recommendations.append(
            "Review the following important concepts before your next attempt: " + ", ".join(critical_missing) + "."
        )
    other_missing = [c.name for c in missing if c.name not in critical_missing]
    if other_missing:
        revision_recommendations.append(
            "It would also help to revisit: " + ", ".join(other_missing) + "."
        )
    if contradicted:
        revision_recommendations.append(
            "Double-check the following, since your answer appears to state the opposite of what's expected: "
            + ", ".join(c.name for c in contradicted)
            + "."
        )
    for m in misconceptions:
        revision_recommendations.append(
            f"Double-check the relationship between '{m['sourceConcept']}' and '{m['targetConcept']}' — "
            f"your answer may have stated it incorrectly."
        )

    if overall_ratio >= 0.85:
        overall_feedback = (
            "Your answer demonstrates strong conceptual understanding and covers most of the "
            "expected material."
        )
    elif overall_ratio >= 0.55:
        overall_feedback = (
            "Your answer demonstrates a good understanding of the fundamental concept but does "
            "not cover all important components of the expected response."
        )
    elif overall_ratio > 0:
        overall_feedback = (
            "Your answer shows some understanding, but several important concepts expected in "
            "the rubric are missing or only weakly demonstrated."
        )
    else:
        overall_feedback = (
            "Your answer does not yet demonstrate the concepts expected for this question. "
            "Review the missing concepts below and try again."
        )

    return {
        "overallFeedback": overall_feedback,
        "strengths": strengths,
        "improvementAreas": improvement_areas,
        "revisionRecommendations": revision_recommendations,
    }
