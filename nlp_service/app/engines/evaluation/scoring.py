"""
Scoring engine (spec Sections 23, 24, 29, 30, 31, 32).

Deliberately keeps every magic number sourced from app.core.config so
thresholds/weights can be tuned in one place, per Section 23's explicit
instruction.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from app.core.config import settings


def coverage_label(similarity: float) -> str:
    s = settings
    if similarity >= s.threshold_full_coverage:
        return "full"
    if similarity >= s.threshold_high_partial:
        return "high_partial"
    if similarity >= s.threshold_partial:
        return "partial"
    if similarity >= s.threshold_low_evidence:
        return "low_evidence"
    return "not_covered"


def credit_factor(similarity: float) -> float:
    s = settings
    if similarity >= s.threshold_full_coverage:
        return s.credit_factor_full
    if similarity >= s.threshold_high_partial:
        return s.credit_factor_high_partial
    if similarity >= s.threshold_partial:
        return s.credit_factor_partial
    if similarity >= s.threshold_low_evidence:
        return s.credit_factor_low_evidence
    return s.credit_factor_not_covered


@dataclass
class ConceptScoreResult:
    concept_id: str
    name: str
    marks: float
    awarded_marks: float
    similarity: float
    coverage: str
    importance: str
    evidence_sentence: Optional[str]
    suppressed_overlap_with: Optional[str] = None


def score_concepts(
    concepts: List[dict],
    match_results: dict,
    sentences: List[str],
    suppressed: Dict[str, bool],
    overlap_winner_by_suppressed: Dict[str, str],
) -> List[ConceptScoreResult]:
    """Turns raw similarity matches into marks-aware, explainable per-concept results."""
    results: List[ConceptScoreResult] = []

    for concept in concepts:
        cid = concept["id"]
        match = match_results.get(cid)
        similarity = match.best_similarity if match else 0.0
        label = coverage_label(similarity)
        factor = credit_factor(similarity)
        marks = float(concept.get("marks", 0))

        evidence_sentence = None
        if match and match.best_sentence_index is not None and match.best_sentence_index < len(sentences):
            evidence_sentence = sentences[match.best_sentence_index]

        is_suppressed = suppressed.get(cid, False)
        awarded = 0.0 if is_suppressed else round(marks * factor, 3)

        results.append(
            ConceptScoreResult(
                concept_id=cid,
                name=concept.get("name", cid),
                marks=marks,
                awarded_marks=awarded,
                similarity=round(similarity, 4),
                coverage="not_covered" if is_suppressed else label,
                importance=concept.get("importance", "medium"),
                evidence_sentence=evidence_sentence if not is_suppressed else None,
                suppressed_overlap_with=overlap_winner_by_suppressed.get(cid) if is_suppressed else None,
            )
        )

    return results


def compute_concept_coverage_ratio(concept_scores: List[ConceptScoreResult]) -> float:
    total_possible = sum(c.marks for c in concept_scores)
    if total_possible <= 0:
        return 0.0
    total_awarded = sum(c.awarded_marks for c in concept_scores)
    return max(0.0, min(1.0, total_awarded / total_possible))


def compute_completeness_ratio(student_answer: str, total_marks: float) -> float:
    """Heuristic only (Section 31) — never used to withhold conceptual
    credit, just contributes a small slice of the final weighted score."""
    word_count = len(student_answer.split())
    expected = max(1.0, total_marks * settings.expected_words_per_mark)
    return max(0.0, min(1.0, word_count / expected))


def compute_readability_ratio(sentences: List[str]) -> float:
    """Light-touch heuristic — Section 31 explicitly says not to heavily
    penalize wording/grammar. Only flags near-empty or wildly repetitive
    answers."""
    if not sentences:
        return 0.0

    lengths = [len(s.split()) for s in sentences]
    avg_len = sum(lengths) / len(lengths)

    length_score = 1.0
    if avg_len < 3:
        length_score = 0.5
    elif avg_len > 60:
        length_score = 0.75

    unique_ratio = len(set(s.lower().strip() for s in sentences)) / len(sentences)
    repetition_score = 0.5 + 0.5 * unique_ratio  # fully unique -> 1.0, all duplicate -> 0.5

    return max(0.0, min(1.0, (length_score + repetition_score) / 2))


def compute_relationship_ratio(relationship_results: List[dict]) -> float:
    if not relationship_results:
        return 1.0  # no relationships defined in rubric -> don't penalize
    demonstrated = sum(1 for r in relationship_results if r["status"] == "demonstrated")
    return demonstrated / len(relationship_results)


def compute_semantic_understanding_score(concept_scores: List[ConceptScoreResult]) -> float:
    """Supplementary metric (Section 30) — average raw similarity across
    concepts, NOT the grade. Reported separately so it can never be
    mistaken for the rubric-based score."""
    if not concept_scores:
        return 0.0
    return round(sum(c.similarity for c in concept_scores) / len(concept_scores) * 100, 1)


def compute_overall_score(
    concept_coverage_ratio: float,
    relationship_ratio: float,
    completeness_ratio: float,
    readability_ratio: float,
    max_score: float,
) -> float:
    s = settings
    weighted = (
        s.weight_concept_coverage * concept_coverage_ratio
        + s.weight_relationship * relationship_ratio
        + s.weight_completeness * completeness_ratio
        + s.weight_readability * readability_ratio
    )
    return round(weighted * max_score, 2)


def compute_confidence(
    concept_scores: List[ConceptScoreResult],
    relationship_results: List[dict],
    student_answer: str,
    rubric_has_content: bool,
) -> str:
    """
    Rule-based confidence (Section 32). Starts optimistic and is
    downgraded by concrete risk signals rather than asserted outright —
    the system should not claim certainty when evidence is weak.
    """
    if not rubric_has_content:
        return "Low"

    word_count = len(student_answer.split())
    if word_count < 5:
        return "Low"

    s = settings
    # "Ambiguous" = similarity sitting within a hair of a threshold
    # boundary, where a tiny wording change would flip the coverage label.
    boundary_margin = 0.02
    boundaries = [s.threshold_low_evidence, s.threshold_partial, s.threshold_high_partial, s.threshold_full_coverage]
    ambiguous_count = sum(
        1 for c in concept_scores if any(abs(c.similarity - b) <= boundary_margin for b in boundaries)
    )
    ambiguous_ratio = ambiguous_count / len(concept_scores) if concept_scores else 1.0

    any_evidence = any(c.similarity >= s.threshold_low_evidence for c in concept_scores)

    risk_points = 0
    if word_count < 15:
        risk_points += 1
    if ambiguous_ratio > 0.4:
        risk_points += 1
    if not any_evidence:
        risk_points += 2

    if risk_points >= 2:
        return "Low"
    if risk_points == 1:
        return "Medium"
    return "High"
