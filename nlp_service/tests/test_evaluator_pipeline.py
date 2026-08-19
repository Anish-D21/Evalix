"""
End-to-end pipeline test.

Uses the real spaCy pipeline (offline, already downloaded) together with
the offline FakeEmbedder (see tests/fakes.py) instead of the real MiniLM
model, since this sandbox has no network path to huggingface.co. This
verifies the full pipeline wiring, scoring math, missing-concept
detection, and feedback generation are all correct — it does NOT verify
true semantic paraphrase tolerance, which needs the real embedding
model. See the Phase 1 report for how to re-run this against the real
model once network access is available.
"""

import spacy

from app.engines.evaluation.evaluator import evaluate_answer
from tests.fakes import FakeEmbedder

_nlp = spacy.load("en_core_web_sm")
_embedder = FakeEmbedder()

RUBRIC = {
    "totalMarks": 9,
    "concepts": [
        {
            "id": "ml_def",
            "name": "Machine Learning definition",
            "description": "",
            "marks": 2,
            "importance": "critical",
            "acceptablePhrases": ["branch of artificial intelligence"],
        },
        {
            "id": "learn_data",
            "name": "Learning from data",
            "description": "",
            "marks": 2,
            "importance": "critical",
            "acceptablePhrases": ["models learn patterns from data"],
        },
        {
            "id": "supervised",
            "name": "Supervised Learning",
            "description": "",
            "marks": 1,
            "importance": "high",
            "acceptablePhrases": ["supervised learning uses labelled data"],
        },
        {
            "id": "unsupervised",
            "name": "Unsupervised Learning",
            "description": "",
            "marks": 1,
            "importance": "high",
            "acceptablePhrases": ["unsupervised learning finds hidden patterns"],
        },
        {
            "id": "reinforcement",
            "name": "Reinforcement Learning",
            "description": "",
            "marks": 1,
            "importance": "medium",
            "acceptablePhrases": ["reinforcement learning uses rewards and penalties"],
        },
        {
            "id": "training",
            "name": "Model Training",
            "description": "",
            "marks": 0.5,
            "importance": "medium",
            "acceptablePhrases": ["the model is trained"],
        },
        {
            "id": "evaluation",
            "name": "Model Evaluation",
            "description": "",
            "marks": 0.5,
            "importance": "medium",
            "acceptablePhrases": ["evaluated for accuracy"],
        },
        {
            "id": "prediction",
            "name": "Prediction",
            "description": "",
            "marks": 1,
            "importance": "high",
            "acceptablePhrases": ["used to predict outcomes"],
        },
        {
            # Zero-mark concept that exists purely to anchor a relationship
            # check (Section 27) — a rubric can define a relationship
            # endpoint without it being independently graded.
            "id": "labelled_data",
            "name": "Labelled Data",
            "description": "",
            "marks": 0,
            "importance": "medium",
            "acceptablePhrases": ["uses labelled data"],
        },
    ],
    "relationships": [
        {
            "sourceConcept": "Supervised Learning",
            "relationship": "uses",
            "targetConcept": "Labelled Data",
            "importance": "medium",
        }
    ],
}

STUDENT_ANSWER = (
    "Machine Learning is a branch of artificial intelligence where models learn patterns from data. "
    "Supervised learning uses labelled data. "
    "Unsupervised learning finds hidden patterns without labels. "
    "The model is trained and then evaluated for accuracy. "
    "It is used to predict outcomes."
)


def _run():
    request_data = {"question": "Explain Machine Learning.", "rubric": RUBRIC, "studentAnswer": STUDENT_ANSWER}
    return evaluate_answer(request_data, _nlp, _embedder)


def test_pipeline_runs_without_error_and_has_expected_shape():
    result = _run()
    for key in [
        "overallScore",
        "maxScore",
        "conceptCoverageScore",
        "relationshipScore",
        "semanticUnderstandingScore",
        "coveredConcepts",
        "partialConcepts",
        "missingConcepts",
        "relationships",
        "misconceptions",
        "overallFeedback",
        "strengths",
        "improvementAreas",
        "revisionRecommendations",
        "confidence",
        "rubricWarnings",
    ]:
        assert key in result

    assert result["maxScore"] == 9


def test_reinforcement_learning_correctly_reported_missing():
    result = _run()
    missing_names = [c["name"] for c in result["missingConcepts"]]
    assert "Reinforcement Learning" in missing_names


def test_covered_concepts_are_not_reported_missing():
    result = _run()
    missing_names = {c["name"] for c in result["missingConcepts"]}
    # Every concept whose phrasing literally appears in the answer should
    # NOT be in the missing list (bag-of-words overlap guarantees this
    # even with the fake embedder).
    for expected_covered in [
        "Machine Learning definition",
        "Learning from data",
        "Supervised Learning",
        "Model Training",
        "Prediction",
    ]:
        assert expected_covered not in missing_names


def test_missing_concepts_are_never_reported_as_raw_keywords():
    # Section 26: missing output must be concept-level, never individual
    # keywords like "machine"/"learning"/"data".
    result = _run()
    for c in result["missingConcepts"]:
        assert c["name"] in {rc["name"] for rc in RUBRIC["concepts"]}


def test_overall_score_is_between_zero_and_max():
    result = _run()
    assert 0 <= result["overallScore"] <= result["maxScore"]
    # Not a perfect answer (Reinforcement Learning missing) -> not full marks.
    assert result["overallScore"] < result["maxScore"]


def test_relationship_between_covered_concepts_is_demonstrated():
    result = _run()
    rel = result["relationships"][0]
    assert rel["status"] == "demonstrated"
    assert rel["evidence"] is not None


def test_no_answer_produces_all_missing_and_low_confidence():
    request_data = {"question": "Explain Machine Learning.", "rubric": RUBRIC, "studentAnswer": ""}
    result = evaluate_answer(request_data, _nlp, _embedder)
    assert result["overallScore"] == 0
    assert len(result["missingConcepts"]) == len(RUBRIC["concepts"])
    assert result["confidence"] == "Low"


def test_feedback_is_non_empty_and_conservative():
    result = _run()
    assert result["overallFeedback"]
    assert isinstance(result["strengths"], list)
    assert isinstance(result["revisionRecommendations"], list)
