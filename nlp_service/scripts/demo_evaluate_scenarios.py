"""
Demonstration script (not part of the pytest suite) — exercises the real
POST /api/nlp/evaluate-answer endpoint, through the actual FastAPI app,
routing, and Pydantic validation, for the three scenarios required by
the spec (Sections 51-53).

The embedding model is swapped for the offline FakeEmbedder via the
test-only `set_models_for_testing` hook, purely because this sandbox has
no network path to huggingface.co to download the real MiniLM weights
(confirmed separately — see the Phase 1 report). Everything except the
embedding step itself is the real production code path: real spaCy
segmentation, real concept matching/overlap/scoring/relationship/
misconception/feedback logic, real request validation, real response
schema.
"""

import json

import spacy
from fastapi.testclient import TestClient

from app.core.nlp_models import set_models_for_testing
from app.main import app
from tests.fakes import FakeEmbedder

nlp = spacy.load("en_core_web_sm")
set_models_for_testing(nlp=nlp, embedder=FakeEmbedder())

client = TestClient(app)

RUBRIC = {
    "totalMarks": 10,
    "concepts": [
        {
            "id": "ml_def",
            "name": "Machine Learning definition",
            "marks": 2,
            "importance": "critical",
            "acceptablePhrases": [
                "subset of artificial intelligence that enables computers to learn",
                "branch of ai that enables computers to learn patterns from data",
                "branch of ai where models learn patterns from data",
                "machine learning is a branch of ai",
            ],
        },
        {
            "id": "learn_data",
            "name": "Learning from data",
            "marks": 2,
            "importance": "critical",
            "acceptablePhrases": [
                "learn patterns from data without being explicitly programmed",
                "models learn patterns from data",
            ],
        },
        {
            "id": "supervised",
            "name": "Supervised Learning",
            "marks": 1,
            "importance": "high",
            "acceptablePhrases": ["supervised learning uses labelled data"],
        },
        {
            "id": "unsupervised",
            "name": "Unsupervised Learning",
            "marks": 1,
            "importance": "high",
            "acceptablePhrases": [
                "unsupervised learning finds patterns without labels",
                "supervised and unsupervised learning",
            ],
        },
        {
            "id": "reinforcement",
            "name": "Reinforcement Learning",
            "marks": 1,
            "importance": "medium",
            "acceptablePhrases": ["reinforcement learning learns from rewards and penalties"],
        },
        {
            "id": "training",
            "name": "Model Training",
            "marks": 1,
            "importance": "medium",
            "acceptablePhrases": [
                "models are trained on datasets",
                "the model is trained and then evaluated",
            ],
        },
        {
            "id": "evaluation",
            "name": "Model Evaluation",
            "marks": 1,
            "importance": "medium",
            "acceptablePhrases": [
                "models are evaluated for performance",
                "trained and then evaluated for performance",
            ],
        },
        {
            "id": "prediction",
            "name": "Prediction",
            "marks": 1,
            "importance": "high",
            "acceptablePhrases": ["used to make predictions"],
        },
        {
            "id": "labelled_data",
            "name": "Labelled Data",
            "marks": 0,
            "importance": "medium",
            "acceptablePhrases": ["uses labelled data"],
        },
    ],
    "relationships": [
        {"sourceConcept": "Supervised Learning", "relationship": "uses", "targetConcept": "Labelled Data", "importance": "high"}
    ],
}


def run_case(title, student_answer):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)
    resp = client.post(
        "/api/nlp/evaluate-answer",
        json={"question": "Explain Machine Learning.", "rubric": RUBRIC, "studentAnswer": student_answer},
    )
    print("HTTP status:", resp.status_code)
    body = resp.json()
    print(json.dumps(body, indent=2))
    return body


# ---- Test 1: Good paraphrased answer with missing concepts (Section 51) ----
test1_answer = (
    "Machine Learning is a branch of AI that enables computers to learn patterns from data "
    "without being explicitly programmed. It includes supervised and unsupervised learning. "
    "Supervised learning uses labelled data. Models are trained on datasets and used to make predictions."
)
run_case("TEST 1 — Good paraphrased answer with missing concepts", test1_answer)

# ---- Test 2: Strong paraphrased answer (Section 52) ----
test2_answer = (
    "Machine Learning is a branch of AI where models learn patterns from data without being "
    "explicitly programmed. Supervised learning uses labelled data. The model is trained and "
    "then evaluated for performance before it is used to make predictions."
)
run_case("TEST 2 — Strong paraphrased answer, different wording", test2_answer)

# ---- Test 3: Supervised learning misconception (Section 53) ----
test3_answer = "Machine Learning is a branch of AI. Supervised learning does not require labelled data."
run_case("TEST 3 — Misconception (should NOT zero the whole answer)", test3_answer)
