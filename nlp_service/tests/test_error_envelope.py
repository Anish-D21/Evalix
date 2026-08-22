"""
Regression tests for app.main's global HTTPException handler.

Discovered while building Phase 2's live-endpoint demo: every router
raises HTTPException with a {"code", "message"} `detail` dict, but
without a custom exception handler FastAPI's default behavior returns
that as a bare {"detail": {...}} body -- which does NOT match the
{"success", "data", "error"} envelope spec Section 45 requires for every
response, success or failure. This affected both the Phase 1
evaluate-answer endpoint's 503 path and every Phase 2 extract-topics
error path equally, so the fix lives in app/main.py (shared by both
routers) rather than being duplicated per-router.
"""

import spacy
from fastapi.testclient import TestClient

from app.core.nlp_models import set_models_for_testing
from app.main import app
from tests.fakes import FakeEmbedder

_nlp = spacy.load("en_core_web_sm")
client = TestClient(app)


def test_evaluate_answer_503_uses_standard_envelope():
    # Force models to be unready by clearing them, then restore afterwards
    # so this test doesn't affect others.
    set_models_for_testing(nlp=None, embedder=None)
    import app.core.nlp_models as nlp_models

    nlp_models._nlp = None
    nlp_models._embedder = None

    resp = client.post(
        "/api/nlp/evaluate-answer",
        json={"studentAnswer": "test", "rubric": {"totalMarks": 1, "concepts": [{"id": "c1", "name": "Test", "marks": 1}]}},
    )
    assert resp.status_code == 503
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "MODELS_NOT_READY"
    assert "message" in body["error"]
    # Extra diagnostic fields beyond code/message must survive the reshape.
    assert "loadErrors" in body["error"]

    # Restore for other tests in the same session.
    set_models_for_testing(nlp=_nlp, embedder=FakeEmbedder())


def test_extract_topics_unsupported_file_type_uses_standard_envelope():
    set_models_for_testing(nlp=_nlp, embedder=FakeEmbedder())
    resp = client.post("/api/nlp/extract-topics", files={"file": ("data.csv", b"a,b,c", "text/csv")})
    assert resp.status_code == 400
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"]["code"] == "UNSUPPORTED_FILE_TYPE"
    assert "message" in body["error"]


def test_extract_topics_empty_file_uses_standard_envelope():
    set_models_for_testing(nlp=_nlp, embedder=FakeEmbedder())
    resp = client.post("/api/nlp/extract-topics", files={"file": ("empty.txt", b"", "text/plain")})
    assert resp.status_code == 400
    body = resp.json()
    assert body["success"] is False
    assert body["error"]["code"] == "EMPTY_FILE"


def test_extract_topics_success_still_uses_standard_envelope():
    # Make sure the handler only touches error paths -- success responses
    # must be unaffected.
    set_models_for_testing(nlp=_nlp, embedder=FakeEmbedder())
    resp = client.post(
        "/api/nlp/extract-topics",
        files={"file": ("syllabus.txt", b"Unit 1: Topic\nSome content about Machine Learning.", "text/plain")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["error"] is None
    assert "units" in body["data"]
