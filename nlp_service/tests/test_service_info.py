from fastapi.testclient import TestClient

from app.engines.service_info import ENDPOINTS, get_service_status
from app.main import app

client = TestClient(app)


def test_get_service_status_shape():
    status = get_service_status()
    assert "service" in status
    assert "environment" in status
    assert "endpoints" in status


def test_get_service_status_lists_every_nlp_endpoint():
    status = get_service_status()
    paths = {e["path"] for e in status["endpoints"]}
    assert paths == {
        "/api/nlp/health",
        "/api/nlp/evaluate-answer",
        "/api/nlp/extract-topics",
        "/api/nlp/generate-blueprint",
        "/api/nlp/generate-questions",
        "/api/nlp/generate-rubric-candidates",
    }


def test_every_endpoint_entry_has_required_fields():
    for entry in ENDPOINTS:
        assert entry["path"]
        assert entry["method"] in ("GET", "POST")
        assert entry["description"]


def test_endpoint_success_envelope():
    resp = client.get("/api/nlp/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["error"] is None
    assert len(body["data"]["endpoints"]) == 6


def test_endpoint_does_not_require_models_loaded():
    # Pure static info -- must work even before spaCy/MiniLM load.
    resp = client.get("/api/nlp/")
    assert resp.status_code == 200


def test_endpoint_deterministic():
    responses = [client.get("/api/nlp/").json() for _ in range(5)]
    assert all(r == responses[0] for r in responses)


def test_all_routers_registered_with_swagger_tags():
    tagged_paths = {
        route.path: route.tags for route in app.routes if hasattr(route, "tags") and route.tags
    }
    assert tagged_paths.get("/api/nlp/health") == ["Health"]
    assert tagged_paths.get("/api/nlp/evaluate-answer") == ["Evaluation"]
    assert tagged_paths.get("/api/nlp/extract-topics") == ["Syllabus"]
    assert tagged_paths.get("/api/nlp/generate-blueprint") == ["Blueprint"]
    assert tagged_paths.get("/api/nlp/generate-questions") == ["Questions"]
    assert tagged_paths.get("/api/nlp/generate-rubric-candidates") == ["Rubric"]
    assert tagged_paths.get("/api/nlp/") == ["Service Info"]


def test_openapi_schema_generates_without_error():
    # A broken response_model or route declaration would raise here.
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert "/api/nlp/generate-rubric-candidates" in schema["paths"]
