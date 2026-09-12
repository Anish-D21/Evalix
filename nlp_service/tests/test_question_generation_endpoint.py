from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "requests": [
        {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2},
        {"topic": "Deep Learning", "bloomLevel": "create", "difficulty": "hard", "marks": 5},
    ]
}


def test_endpoint_does_not_require_models_loaded():
    resp = client.post("/api/nlp/generate-questions", json=VALID_PAYLOAD)
    assert resp.status_code == 200


def test_endpoint_success_envelope():
    resp = client.post("/api/nlp/generate-questions", json=VALID_PAYLOAD)
    body = resp.json()
    assert body["success"] is True
    assert body["error"] is None
    assert len(body["data"]["questions"]) == 2


def test_endpoint_question_shape():
    resp = client.post("/api/nlp/generate-questions", json=VALID_PAYLOAD)
    q = resp.json()["data"]["questions"][0]
    for key in ["topicName", "text", "marks", "difficulty", "bloomLevel", "questionType", "status", "validation"]:
        assert key in q


def test_endpoint_error_envelope_for_missing_topic():
    bad_payload = {"requests": [{"topic": "", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}]}
    resp = client.post("/api/nlp/generate-questions", json=bad_payload)
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "MISSING_TOPIC"


def test_endpoint_error_envelope_for_bad_bloom_level():
    bad_payload = {"requests": [{"topic": "AI", "bloomLevel": "synthesize", "difficulty": "easy", "marks": 2}]}
    resp = client.post("/api/nlp/generate-questions", json=bad_payload)
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_LABEL"


def test_endpoint_error_envelope_for_empty_requests():
    resp = client.post("/api/nlp/generate-questions", json={"requests": []})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "MISSING_REQUESTS"


def test_endpoint_pydantic_validation_for_missing_required_field():
    resp = client.post("/api/nlp/generate-questions", json={})
    assert resp.status_code == 422


def test_endpoint_duplicate_detection_end_to_end():
    item = {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}
    resp = client.post("/api/nlp/generate-questions", json={"requests": [item, dict(item)]})
    body = resp.json()
    assert body["success"] is True
    assert len(body["data"]["warnings"]) == 1
    assert body["data"]["questions"][0]["validation"]["valid"] is False


def test_endpoint_repeated_calls_are_deterministic():
    responses = [client.post("/api/nlp/generate-questions", json=VALID_PAYLOAD).json() for _ in range(5)]
    assert all(r == responses[0] for r in responses)
