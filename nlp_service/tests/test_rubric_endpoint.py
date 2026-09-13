import spacy
from fastapi.testclient import TestClient

from app.core.nlp_models import set_models_for_testing
from app.main import app
from tests.fakes import FakeEmbedder

client = TestClient(app)

# This endpoint needs spaCy loaded (like extract-topics); the router
# returns 503 otherwise. Set it up explicitly rather than relying on
# another test module's side effects on the process-global nlp_models
# state, since pytest doesn't guarantee file execution order.
set_models_for_testing(nlp=spacy.load("en_core_web_sm"), embedder=FakeEmbedder())

REFERENCE_ANSWER = (
    "Machine Learning is a subset of Artificial Intelligence that learns patterns from data. "
    "It includes Supervised Learning, Unsupervised Learning, and Reinforcement Learning. "
    "Models are trained on data and evaluated for accuracy before being used to make predictions."
)


def test_endpoint_success_envelope():
    resp = client.post("/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["error"] is None
    assert len(body["data"]["concepts"]) > 0


def test_endpoint_concept_shape():
    resp = client.post("/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER})
    concept = resp.json()["data"]["concepts"][0]
    for key in ["id", "name", "description", "marks", "importance", "acceptablePhrases"]:
        assert key in concept


def test_endpoint_with_total_marks_allocates_exactly():
    resp = client.post(
        "/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}
    )
    body = resp.json()
    total_awarded = sum(c["marks"] for c in body["data"]["concepts"])
    assert abs(total_awarded - 10.0) < 1e-6


def test_endpoint_without_total_marks_leaves_marks_null():
    resp = client.post("/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER})
    body = resp.json()
    assert all(c["marks"] is None for c in body["data"]["concepts"])


def test_endpoint_multiword_concepts_not_fragmented():
    resp = client.post("/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER})
    names = {c["name"] for c in resp.json()["data"]["concepts"]}
    assert "Machine Learning" in names
    assert "Supervised Learning" in names
    assert "machine" not in {n.lower() for n in names}


def test_endpoint_error_envelope_for_empty_reference_answer():
    resp = client.post("/api/nlp/generate-rubric-candidates", json={"referenceAnswer": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "MISSING_REFERENCE_ANSWER"


def test_endpoint_error_envelope_for_negative_total_marks():
    resp = client.post(
        "/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER, "totalMarks": -5}
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_TOTAL_MARKS"


def test_endpoint_pydantic_validation_for_missing_required_field():
    resp = client.post("/api/nlp/generate-rubric-candidates", json={})
    assert resp.status_code == 422


def test_endpoint_repeated_calls_are_deterministic():
    payload = {"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}
    responses = [client.post("/api/nlp/generate-rubric-candidates", json=payload).json() for _ in range(5)]
    assert all(r == responses[0] for r in responses)


def test_endpoint_output_compatible_with_evaluate_answer_rubric():
    # Cross-phase check through the real HTTP layer: candidates from this
    # endpoint should be directly usable as evaluate-answer's rubric
    # concepts once marks are assigned.
    gen_resp = client.post(
        "/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 10}
    )
    concepts = gen_resp.json()["data"]["concepts"]

    eval_resp = client.post(
        "/api/nlp/evaluate-answer",
        json={
            "rubric": {"totalMarks": 10, "concepts": concepts},
            "studentAnswer": "Machine Learning uses Supervised Learning and Unsupervised Learning.",
        },
    )
    # Either it evaluates successfully (models loaded) or reports models
    # not ready (503) -- either way, the request must be well-formed and
    # never rejected as an invalid rubric shape (422).
    assert eval_resp.status_code in (200, 503)
