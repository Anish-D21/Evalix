from app.core.config import settings
from app.engines.evaluation.scoring import (
    compute_completeness_ratio,
    compute_overall_score,
    compute_readability_ratio,
    compute_relationship_ratio,
    coverage_label,
    credit_factor,
)


def test_coverage_label_boundaries():
    assert coverage_label(0.90) == "full"
    assert coverage_label(0.85) == "full"
    assert coverage_label(0.80) == "high_partial"
    assert coverage_label(0.70) == "high_partial"
    assert coverage_label(0.60) == "partial"
    assert coverage_label(0.55) == "partial"
    assert coverage_label(0.45) == "low_evidence"
    assert coverage_label(0.40) == "low_evidence"
    assert coverage_label(0.10) == "not_covered"


def test_credit_factor_matches_spec_example():
    # Spec Section 24 worked example: concept marks = 2, similarity = 0.76
    # -> high_partial band -> factor 0.75 -> awarded 1.5
    factor = credit_factor(0.76)
    assert factor == settings.credit_factor_high_partial
    assert round(2 * factor, 2) == 1.5


def test_credit_factor_not_covered_is_zero():
    assert credit_factor(0.05) == 0.0


def test_relationship_ratio_no_relationships_does_not_penalize():
    assert compute_relationship_ratio([]) == 1.0


def test_relationship_ratio_partial_demonstration():
    results = [
        {"status": "demonstrated"},
        {"status": "contradicted"},
        {"status": "not_demonstrated"},
        {"status": "demonstrated"},
    ]
    assert compute_relationship_ratio(results) == 0.5


def test_completeness_ratio_scales_with_answer_length():
    short_ratio = compute_completeness_ratio("Machine Learning is AI.", total_marks=10)
    long_answer = " ".join(["word"] * 200)
    long_ratio = compute_completeness_ratio(long_answer, total_marks=10)
    assert 0 <= short_ratio <= 1
    assert long_ratio == 1.0
    assert long_ratio > short_ratio


def test_readability_ratio_penalizes_pure_repetition():
    unique = ["Machine learning learns from data.", "It uses supervised and unsupervised methods."]
    repeated = ["Machine learning is good.", "Machine learning is good.", "Machine learning is good."]
    assert compute_readability_ratio(unique) > compute_readability_ratio(repeated)


def test_readability_ratio_empty_is_zero():
    assert compute_readability_ratio([]) == 0.0


def test_overall_score_weights_sum_to_max_when_everything_perfect():
    score = compute_overall_score(
        concept_coverage_ratio=1.0, relationship_ratio=1.0, completeness_ratio=1.0, readability_ratio=1.0, max_score=10
    )
    assert score == 10.0


def test_overall_score_zero_when_nothing_covered():
    score = compute_overall_score(
        concept_coverage_ratio=0.0, relationship_ratio=0.0, completeness_ratio=0.0, readability_ratio=0.0, max_score=10
    )
    assert score == 0.0


def test_overall_score_concept_coverage_dominates():
    # Full concept coverage but nothing else should still score close to
    # max, since concept_coverage carries 80% of the weight (Section 29).
    score = compute_overall_score(
        concept_coverage_ratio=1.0, relationship_ratio=0.0, completeness_ratio=0.0, readability_ratio=0.0, max_score=10
    )
    assert score == 8.0
