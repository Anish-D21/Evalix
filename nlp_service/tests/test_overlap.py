import numpy as np

from app.engines.evaluation.concept_matching import ConceptMatchResult
from app.engines.evaluation.overlap import apply_overlap_suppression, detect_overlapping_concept_groups


def _match(concept_id, similarity, embedding, marks_context=None):
    return ConceptMatchResult(
        concept_id=concept_id,
        best_similarity=similarity,
        best_sentence_index=0,
        best_anchor_text="anchor",
        representative_embedding=np.array(embedding, dtype=np.float32),
        sentence_similarities=np.array([similarity], dtype=np.float32),
    )


def test_detects_near_duplicate_concepts():
    # Spec Section 25's own example: "Machine Learning" / "Machine" / "Learning"
    # should not exist as independent graded concepts.
    concepts = [
        {"id": "c1", "name": "Machine Learning", "marks": 2},
        {"id": "c2", "name": "Machine", "marks": 1},
        {"id": "c3", "name": "Reinforcement Learning", "marks": 1},
    ]
    match_results = {
        "c1": _match("c1", 0.9, [1.0, 0.0, 0.0]),
        "c2": _match("c2", 0.8, [0.99, 0.01, 0.0]),  # near-identical embedding to c1
        "c3": _match("c3", 0.7, [0.0, 0.0, 1.0]),  # unrelated
    }

    groups = detect_overlapping_concept_groups(concepts, match_results, threshold=0.9)

    assert len(groups) == 1
    assert set(groups[0]) == {"c1", "c2"}


def test_no_groups_when_concepts_are_distinct():
    concepts = [
        {"id": "c1", "name": "Supervised Learning", "marks": 2},
        {"id": "c2", "name": "Unsupervised Learning", "marks": 2},
    ]
    match_results = {
        "c1": _match("c1", 0.8, [1.0, 0.0]),
        "c2": _match("c2", 0.8, [0.0, 1.0]),
    }
    groups = detect_overlapping_concept_groups(concepts, match_results, threshold=0.9)
    assert groups == []


def test_suppression_keeps_only_strongest_evidence_in_group():
    concepts_by_id = {
        "c1": {"id": "c1", "name": "Machine Learning", "marks": 2},
        "c2": {"id": "c2", "name": "Machine", "marks": 1},
    }
    match_results = {
        "c1": _match("c1", 0.92, [1.0, 0.0]),
        "c2": _match("c2", 0.75, [0.99, 0.01]),
    }
    groups = [["c1", "c2"]]

    suppressed = apply_overlap_suppression(concepts_by_id, match_results, groups)

    assert suppressed["c1"] is False  # stronger evidence -> kept
    assert suppressed["c2"] is True  # weaker duplicate -> suppressed
