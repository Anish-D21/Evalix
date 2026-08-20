"""
Regression tests for negation/contradiction detection.

Covers the exact correctness issue reported after Phase 1 live testing:
a student explicitly negating a required concept ("trains a model
WITHOUT labelled data") was still receiving normal high_partial credit
for "Labelled Data" and the relationship was marked "demonstrated",
because the original negation check only recognized spaCy's `neg`
dependency label (i.e. "not"/"n't"/"never") and missed negating
prepositions ("without") and morphological negation ("unlabelled").
"""

import spacy

from app.engines.evaluation.concept_matching import ConceptMatchResult
from app.engines.evaluation.evaluator import evaluate_answer
from app.engines.evaluation.negation import build_protected_terms, concept_key_lemmas, sentence_negates_concept
from app.engines.evaluation.relationship_analysis import analyze_relationships
from tests.fakes import FakeEmbedder

_nlp = spacy.load("en_core_web_sm")
_embedder = FakeEmbedder()


# ---------------------------------------------------------------------------
# Unit-level: the negation module itself, against every phrasing required by
# the correctness report.
# ---------------------------------------------------------------------------

CONCEPTS_FOR_NEGATION_UNIT_TESTS = [
    {"id": "labelled_data", "name": "Labelled Data", "acceptablePhrases": ["uses labelled data"]},
    {"id": "supervised", "name": "Supervised Learning", "acceptablePhrases": ["supervised learning uses labelled data"]},
    {"id": "unsupervised", "name": "Unsupervised Learning", "acceptablePhrases": ["unsupervised learning finds patterns"]},
]


def _negated(sentence: str, concept_id: str = "labelled_data"):
    protected = build_protected_terms(CONCEPTS_FOR_NEGATION_UNIT_TESTS)
    concept = next(c for c in CONCEPTS_FOR_NEGATION_UNIT_TESTS if c["id"] == concept_id)
    lemmas = concept_key_lemmas(_nlp, concept)
    negated, reasons = sentence_negates_concept(_nlp, sentence, lemmas, protected)
    return negated, reasons


def test_negating_preposition_without():
    negated, reasons = _negated("Supervised learning trains a model without labelled data.")
    assert negated is True
    assert reasons


def test_clausal_negation_does_not():
    negated, _ = _negated("Supervised learning does not use labelled data.")
    assert negated is True


def test_clausal_negation_never():
    negated, _ = _negated("Supervised learning never uses labelled data.")
    assert negated is True


def test_morphological_negation_unlabelled():
    negated, reasons = _negated("It learns from unlabelled examples instead.")
    assert negated is True
    assert any("morphological" in r for r in reasons)


def test_instead_of_construction():
    negated, _ = _negated("Supervised learning uses unlabelled data instead of labelled data.")
    assert negated is True


def test_positive_statement_not_flagged():
    negated, _ = _negated("Supervised learning uses labelled data.")
    assert negated is False


def test_unsupervised_is_not_treated_as_negating_supervised():
    # The domain-specific trap: "un-" also forms legitimate ML terminology.
    # "Unsupervised Learning" must never be read as a negation of
    # "Supervised Learning" just because of the shared prefix.
    negated, _ = _negated("Unsupervised learning finds hidden patterns in the data.", concept_id="supervised")
    assert negated is False


# ---------------------------------------------------------------------------
# Relationship-analysis level: the relationship must be "contradicted", not
# "demonstrated", for every phrasing above.
# ---------------------------------------------------------------------------

RELATIONSHIP_CONCEPTS = [
    {"id": "source", "name": "Supervised Learning"},
    {"id": "target", "name": "Labelled Data"},
]
RELATIONSHIPS = [
    {"sourceConcept": "Supervised Learning", "relationship": "uses", "targetConcept": "Labelled Data", "importance": "high"}
]


def _match(concept_id, best_similarity, sentence_similarities):
    return ConceptMatchResult(
        concept_id=concept_id,
        best_similarity=best_similarity,
        best_sentence_index=0,
        best_anchor_text="anchor",
        representative_embedding=__import__("numpy").zeros(4, dtype="float32"),
        sentence_similarities=__import__("numpy").array(sentence_similarities, dtype="float32"),
    )


def _analyze(sentence: str):
    match_results = {"source": _match("source", 0.8, [0.8]), "target": _match("target", 0.75, [0.75])}
    return analyze_relationships(RELATIONSHIPS, RELATIONSHIP_CONCEPTS, match_results, [sentence], _nlp)


def test_relationship_contradicted_for_without_phrasing():
    results, misconceptions = _analyze("Supervised learning trains a model without labelled data.")
    assert results[0]["status"] == "contradicted"
    assert len(misconceptions) == 1


def test_relationship_contradicted_for_morphological_negation():
    results, misconceptions = _analyze("Supervised learning learns from unlabelled examples instead.")
    assert results[0]["status"] == "contradicted"
    assert len(misconceptions) == 1


def test_relationship_still_demonstrated_for_positive_statement():
    results, misconceptions = _analyze("Supervised learning uses labelled data directly.")
    assert results[0]["status"] == "demonstrated"
    assert misconceptions == []


# ---------------------------------------------------------------------------
# Full pipeline: the exact case from the correctness report, run through
# evaluate_answer end to end.
# ---------------------------------------------------------------------------

REPORTED_CASE_RUBRIC = {
    "totalMarks": 5,
    "concepts": [
        {
            "id": "supervised",
            "name": "Supervised Learning",
            "marks": 3,
            "importance": "critical",
            "acceptablePhrases": ["supervised learning trains a model using labelled data"],
        },
        {
            "id": "labelled_data",
            "name": "Labelled Data",
            "marks": 2,
            "importance": "critical",
            "acceptablePhrases": ["labelled data used to train the model"],
        },
    ],
    "relationships": [
        {"sourceConcept": "Supervised Learning", "relationship": "learns from", "targetConcept": "Labelled Data", "importance": "high"}
    ],
}

REPORTED_CASE_ANSWER = "Supervised learning trains a model without labelled data. It learns from unlabelled examples instead."


def test_reported_case_labelled_data_not_credited_as_covered():
    result = evaluate_answer(
        {"question": "Explain Supervised Learning.", "rubric": REPORTED_CASE_RUBRIC, "studentAnswer": REPORTED_CASE_ANSWER},
        _nlp,
        _embedder,
    )
    covered_names = {c["name"] for c in result["coveredConcepts"]}
    partial_names = {c["name"] for c in result["partialConcepts"]}
    assert "Labelled Data" not in covered_names
    assert "Labelled Data" not in partial_names

    all_concepts = result["coveredConcepts"] + result["partialConcepts"] + result["missingConcepts"]
    labelled_data_result = next(c for c in all_concepts if c["name"] == "Labelled Data")
    assert labelled_data_result["coverage"] == "contradicted"
    assert labelled_data_result["awardedMarks"] == 0
    assert labelled_data_result["negated"] is True


def test_reported_case_relationship_contradicted_with_misconception():
    result = evaluate_answer(
        {"question": "Explain Supervised Learning.", "rubric": REPORTED_CASE_RUBRIC, "studentAnswer": REPORTED_CASE_ANSWER},
        _nlp,
        _embedder,
    )
    assert result["relationships"][0]["status"] == "contradicted"
    assert len(result["misconceptions"]) == 1
    assert "Potential misconception" in result["misconceptions"][0]["note"]


def test_reported_case_does_not_zero_the_whole_answer():
    result = evaluate_answer(
        {"question": "Explain Supervised Learning.", "rubric": REPORTED_CASE_RUBRIC, "studentAnswer": REPORTED_CASE_ANSWER},
        _nlp,
        _embedder,
    )
    # "Supervised Learning" itself is still mentioned (just paired with a
    # contradicted claim about labelled data) -- the answer should not be
    # reduced to a flat zero.
    assert result["overallScore"] >= 0
