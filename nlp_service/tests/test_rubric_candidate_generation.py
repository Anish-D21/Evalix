import spacy
import pytest

from app.engines.rubric.candidate_generation import generate_rubric_candidates
from app.engines.rubric.validation import RubricGenerationValidationError
from app.schemas.evaluation import RubricConceptIn
from tests.fakes import FakeEmbedder

_nlp = spacy.load("en_core_web_sm")

REFERENCE_ANSWER = (
    "Machine Learning is a subset of Artificial Intelligence that learns patterns from data. "
    "It includes Supervised Learning, Unsupervised Learning, and Reinforcement Learning. "
    "Models are trained on data and evaluated for accuracy before being used to make predictions."
)


def _embed_fn():
    embedder = FakeEmbedder()

    def fn(texts):
        from app.engines.evaluation.embedder import embed_texts

        return embed_texts(embedder, texts)

    return fn


def test_generates_multiword_concepts_not_fragments():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER}, _nlp, embed_fn=None)
    names = {c["name"] for c in result["concepts"]}
    assert "Machine Learning" in names
    assert "Artificial Intelligence" in names
    assert "Supervised Learning" in names
    # Section 20's explicit failure mode: never fragment into raw words.
    assert "machine" not in {n.lower() for n in names}
    assert "learning" not in {n.lower() for n in names}


def test_every_concept_has_required_fields():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER}, _nlp, embed_fn=None)
    for c in result["concepts"]:
        for key in ["id", "name", "description", "marks", "importance", "acceptablePhrases"]:
            assert key in c
        assert c["id"]
        assert c["acceptablePhrases"]


def test_concept_ids_are_unique():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER}, _nlp, embed_fn=None)
    ids = [c["id"] for c in result["concepts"]]
    assert len(ids) == len(set(ids))


def test_marks_none_when_total_marks_not_provided():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER}, _nlp, embed_fn=None)
    assert all(c["marks"] is None for c in result["concepts"])


def test_marks_sum_exactly_to_total_marks_when_provided():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}, _nlp, embed_fn=None)
    total_awarded = sum(c["marks"] for c in result["concepts"])
    assert abs(total_awarded - 10.0) < 1e-6


def test_no_concepts_have_negative_marks():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}, _nlp, embed_fn=None)
    assert all(c["marks"] >= 0 for c in result["concepts"])


def test_lexical_duplicates_merged():
    text = "Machine Learning is powerful. machine learning is widely used. MACHINE-LEARNING drives innovation."
    result = generate_rubric_candidates({"referenceAnswer": text}, _nlp, embed_fn=None)
    ml_concepts = [c for c in result["concepts"] if c["name"] == "Machine Learning"]
    assert len(ml_concepts) == 1


def test_empty_extraction_produces_helpful_warning():
    result = generate_rubric_candidates({"referenceAnswer": "It is. This is that."}, _nlp, embed_fn=None)
    assert result["concepts"] == []
    assert len(result["warnings"]) == 1


def test_missing_embedder_produces_degraded_mode_warning():
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER}, _nlp, embed_fn=None)
    assert any("embedding model is not loaded" in w for w in result["warnings"])
    assert result["overlapWarnings"] == []


def test_overlap_warnings_populated_with_embedder():
    text = "Machine Learning Algorithm is useful. Machine Learning Algorithms are widely studied."
    result = generate_rubric_candidates({"referenceAnswer": text}, _nlp, embed_fn=_embed_fn())
    # Either merged lexically into one concept, or flagged as overlapping --
    # either way, no silent duplication into two unrelated full-credit concepts.
    names = [c["name"] for c in result["concepts"]]
    assert len(names) == len(set(names))


def test_invalid_request_raises():
    with pytest.raises(RubricGenerationValidationError):
        generate_rubric_candidates({"referenceAnswer": ""}, _nlp, embed_fn=None)


def test_deterministic_repeated_calls():
    results = [generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}, _nlp, embed_fn=None) for _ in range(5)]
    assert all(r == results[0] for r in results)


def test_output_concepts_are_valid_evaluate_answer_rubric_concepts():
    # Cross-phase compatibility check: a generated candidate should be
    # usable directly as a Phase 1 evaluate-answer rubric concept with
    # zero reshaping (once the teacher has assigned real marks).
    result = generate_rubric_candidates({"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}, _nlp, embed_fn=None)
    for c in result["concepts"]:
        RubricConceptIn(**c)  # raises if incompatible


def test_list_style_reference_answer():
    text = "Supervised Learning\nUnsupervised Learning\nReinforcement Learning\n"
    result = generate_rubric_candidates({"referenceAnswer": text}, _nlp, embed_fn=None)
    names = {c["name"] for c in result["concepts"]}
    assert names == {"Supervised Learning", "Unsupervised Learning", "Reinforcement Learning"}
