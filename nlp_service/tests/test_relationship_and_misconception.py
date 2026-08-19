import numpy as np
import spacy

from app.engines.evaluation.concept_matching import ConceptMatchResult
from app.engines.evaluation.relationship_analysis import _sentence_has_negation, analyze_relationships

_nlp = spacy.load("en_core_web_sm")


def test_negation_detected_via_dependency_parse():
    assert _sentence_has_negation(_nlp, "Supervised learning does not require labelled data.") is True
    assert _sentence_has_negation(_nlp, "Supervised learning isn't using labelled data.") is True


def test_negation_not_falsely_detected():
    assert _sentence_has_negation(_nlp, "Supervised learning uses labelled data.") is False


def _match(concept_id, best_similarity, sentence_similarities):
    return ConceptMatchResult(
        concept_id=concept_id,
        best_similarity=best_similarity,
        best_sentence_index=0,
        best_anchor_text="anchor",
        representative_embedding=np.zeros(4, dtype=np.float32),
        sentence_similarities=np.array(sentence_similarities, dtype=np.float32),
    )


def test_relationship_demonstrated_when_no_negation():
    concepts = [
        {"id": "source", "name": "Supervised Learning"},
        {"id": "target", "name": "Labelled Data"},
    ]
    relationships = [
        {"sourceConcept": "Supervised Learning", "relationship": "uses", "targetConcept": "Labelled Data", "importance": "high"}
    ]
    sentences = ["Supervised learning uses labelled data to train the model."]
    match_results = {
        "source": _match("source", 0.8, [0.8]),
        "target": _match("target", 0.75, [0.75]),
    }

    results, misconceptions = analyze_relationships(relationships, concepts, match_results, sentences, _nlp)

    assert results[0]["status"] == "demonstrated"
    assert misconceptions == []


def test_relationship_flagged_as_potential_misconception_when_negated():
    concepts = [
        {"id": "source", "name": "Supervised Learning"},
        {"id": "target", "name": "Labelled Data"},
    ]
    relationships = [
        {"sourceConcept": "Supervised Learning", "relationship": "uses", "targetConcept": "Labelled Data", "importance": "high"}
    ]
    sentences = ["Supervised learning does not require labelled data."]
    match_results = {
        "source": _match("source", 0.8, [0.8]),
        "target": _match("target", 0.75, [0.75]),
    }

    results, misconceptions = analyze_relationships(relationships, concepts, match_results, sentences, _nlp)

    assert results[0]["status"] == "contradicted"
    assert len(misconceptions) == 1
    assert "Potential misconception" in misconceptions[0]["note"]
    # Conservative wording only -- never an assertion of fact.
    assert "is wrong" not in misconceptions[0]["note"].lower()


def test_relationship_not_evaluated_when_concepts_not_covered():
    concepts = [
        {"id": "source", "name": "Supervised Learning"},
        {"id": "target", "name": "Labelled Data"},
    ]
    relationships = [
        {"sourceConcept": "Supervised Learning", "relationship": "uses", "targetConcept": "Labelled Data", "importance": "high"}
    ]
    sentences = ["This answer is unrelated."]
    match_results = {
        "source": _match("source", 0.1, [0.1]),
        "target": _match("target", 0.05, [0.05]),
    }

    results, misconceptions = analyze_relationships(relationships, concepts, match_results, sentences, _nlp)

    assert results[0]["status"] == "not_evaluated"
    assert misconceptions == []


def test_single_incorrect_relationship_does_not_zero_whole_answer():
    # Section 28: do not give zero to the entire answer merely because
    # one relationship is incorrect. This is enforced at the scoring
    # layer (relationship is only 10% of the weighted score) -- verify
    # here that a contradicted relationship doesn't wipe out concept
    # coverage in the relationship_results structure itself.
    concepts = [
        {"id": "source", "name": "Supervised Learning"},
        {"id": "target", "name": "Labelled Data"},
    ]
    relationships = [
        {"sourceConcept": "Supervised Learning", "relationship": "uses", "targetConcept": "Labelled Data", "importance": "high"}
    ]
    sentences = ["Supervised learning does not require labelled data."]
    match_results = {
        "source": _match("source", 0.8, [0.8]),
        "target": _match("target", 0.75, [0.75]),
    }

    results, _ = analyze_relationships(relationships, concepts, match_results, sentences, _nlp)
    # Relationship is contradicted, but concept-level coverage (handled
    # elsewhere in scoring.py) is untouched by this function.
    assert results[0]["status"] == "contradicted"
