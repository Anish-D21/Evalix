"""
Demonstration script (not part of the pytest suite) — exercises the real
POST /api/nlp/extract-topics endpoint through the actual FastAPI app,
routing, and file-upload handling, using realistic multi-format syllabus
files (PDF, DOCX, TXT).

Unlike scripts/demo_evaluate_scenarios.py, this doesn't need the
embedding model at all for its core assertions — syllabus extraction is
designed to keep working in degraded mode (no embedder), matching
engines/syllabus/pipeline.py's `embed_fn=None` fallback path. It's run
both with and without the fake embedder injected to demonstrate that.
"""

import io
import json

import spacy
from fastapi.testclient import TestClient

from app.core.nlp_models import set_models_for_testing
from app.main import app
from tests.fakes import FakeEmbedder

nlp = spacy.load("en_core_web_sm")
client = TestClient(app)

SAMPLE_TXT = (
    "Unit 1: Introduction to Machine Learning\n"
    "Machine Learning is a subset of Artificial Intelligence that learns patterns from data. "
    "It relies on neural networks and deep learning techniques.\n"
    "\n"
    "Unit 2: Supervised and Unsupervised Learning\n"
    "Supervised learning uses labelled data to train a model. Unsupervised learning finds "
    "hidden patterns without labels. Python programming is used throughout the course.\n"
    "\n"
    "Unit 3: Model Evaluation\n"
    "Model evaluation covers accuracy, precision, and recall. Cross validation is used to "
    "assess generalization performance.\n"
)


def _build_pdf_bytes(text: str) -> bytes:
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for line in text.splitlines():
        if y > 780:
            page = doc.new_page()
            y = 72
        page.insert_text((72, y), line[:100])
        y += 16
    data = doc.tobytes()
    doc.close()
    return data


def _build_docx_bytes(text: str) -> bytes:
    import docx

    document = docx.Document()
    for line in text.splitlines():
        document.add_paragraph(line)
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


def run_upload(title, filename, content_bytes, content_type):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)
    resp = client.post(
        "/api/nlp/extract-topics",
        files={"file": (filename, content_bytes, content_type)},
    )
    print("HTTP status:", resp.status_code)
    body = resp.json()
    print(json.dumps(body, indent=2)[:3000])
    return resp, body


# ---- No embedder loaded at all: must still fully succeed (degraded-mode requirement) ----
set_models_for_testing(nlp=nlp, embedder=None)
run_upload("TXT upload, NO embedder loaded (degraded mode)", "syllabus.txt", SAMPLE_TXT.encode("utf-8"), "text/plain")

# ---- With the (offline, test-only) fake embedder, exercising the semantic-merge pass ----
set_models_for_testing(nlp=nlp, embedder=FakeEmbedder())
run_upload("PDF upload, with embedder (semantic merge active)", "syllabus.pdf", _build_pdf_bytes(SAMPLE_TXT), "application/pdf")
run_upload(
    "DOCX upload, with embedder",
    "syllabus.docx",
    _build_docx_bytes(SAMPLE_TXT),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
)

# ---- Error handling: unsupported file type ----
resp, body = run_upload("Unsupported file type (.csv) — should be rejected", "data.csv", b"a,b,c\n1,2,3", "text/csv")
assert resp.status_code == 400
assert body["error"]["code"] == "UNSUPPORTED_FILE_TYPE"
print(">>> correctly rejected with 400 UNSUPPORTED_FILE_TYPE")

# ---- Error handling: empty file ----
resp, body = run_upload("Empty file — should be rejected", "empty.txt", b"", "text/plain")
assert resp.status_code == 400
assert body["error"]["code"] == "EMPTY_FILE"
print(">>> correctly rejected with 400 EMPTY_FILE")
