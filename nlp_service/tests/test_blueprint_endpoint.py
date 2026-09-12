from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "totalMarks": 50,
    "totalQuestions": 10,
    "units": [
        {"unitNumber": 1, "title": "Introduction to AI", "weightage": 50},
        {"unitNumber": 2, "title": "Machine Learning", "weightage": 50},
    ],
    "difficultyDistribution": {"easy": 40, "medium": 40, "hard": 20},
    "bloomDistribution": {"remember": 20, "understand": 25, "apply": 25, "analyze": 20, "evaluate": 10},
}


def test_endpoint_does_not_require_models_loaded():
    # Unlike evaluate-answer, this endpoint is pure arithmetic and must
    # work even if spaCy/the embedding model never loaded.
    resp = client.post("/api/nlp/generate-blueprint", json=VALID_PAYLOAD)
    assert resp.status_code == 200


def test_endpoint_success_envelope():
    resp = client.post("/api/nlp/generate-blueprint", json=VALID_PAYLOAD)
    body = resp.json()
    assert body["success"] is True
    assert body["error"] is None
    assert body["data"]["totalMarks"] == 50.0
    assert body["data"]["totalQuestions"] == 10
    assert len(body["data"]["units"]) == 2
    assert len(body["data"]["difficulty"]) == 3
    assert len(body["data"]["bloom"]) == 5


def test_endpoint_matches_spec_worked_example():
    resp = client.post("/api/nlp/generate-blueprint", json=VALID_PAYLOAD)
    body = resp.json()
    difficulty_marks = {b["label"]: b["marks"] for b in body["data"]["difficulty"]}
    assert difficulty_marks == {"easy": 20, "medium": 20, "hard": 10}


def test_endpoint_error_envelope_for_invalid_total_marks():
    bad_payload = dict(VALID_PAYLOAD)
    bad_payload["totalMarks"] = -5
    resp = client.post("/api/nlp/generate-blueprint", json=bad_payload)
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "INVALID_TOTAL_MARKS"


def test_endpoint_error_envelope_for_bad_percentage_sum():
    bad_payload = dict(VALID_PAYLOAD)
    bad_payload["difficultyDistribution"] = {"easy": 10, "medium": 10, "hard": 10}
    resp = client.post("/api/nlp/generate-blueprint", json=bad_payload)
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "PERCENTAGE_SUM_INVALID"


def test_endpoint_error_envelope_for_missing_units():
    bad_payload = dict(VALID_PAYLOAD)
    bad_payload["units"] = []
    resp = client.post("/api/nlp/generate-blueprint", json=bad_payload)
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "MISSING_UNITS"


def test_endpoint_pydantic_validation_for_missing_required_field():
    incomplete_payload = {"totalMarks": 50, "totalQuestions": 10}
    resp = client.post("/api/nlp/generate-blueprint", json=incomplete_payload)
    assert resp.status_code == 422


def test_endpoint_repeated_calls_are_deterministic():
    responses = [client.post("/api/nlp/generate-blueprint", json=VALID_PAYLOAD).json() for _ in range(5)]
    assert all(r == responses[0] for r in responses)
