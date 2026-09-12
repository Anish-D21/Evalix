"""
Demonstration script (not part of the pytest suite) — exercises the real
POST /api/nlp/generate-blueprint endpoint through the actual FastAPI
app, routing, and Pydantic validation. Unlike evaluate-answer and
extract-topics, this endpoint needs no NLP models at all (pure
arithmetic), so it works identically whether or not spaCy/MiniLM loaded.
"""

import json

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# A realistic 3-unit syllabus blueprint request, matching the units a
# real Evalix syllabus extraction (Phase 2) would have produced.
REALISTIC_REQUEST = {
    "totalMarks": 100,
    "totalQuestions": 20,
    "units": [
        {"unitNumber": 1, "title": "Introduction to Artificial Intelligence", "weightage": 30},
        {"unitNumber": 2, "title": "Machine Learning", "weightage": 40},
        {"unitNumber": 3, "title": "Natural Language Processing", "weightage": 30},
    ],
    "difficultyDistribution": {"easy": 40, "medium": 40, "hard": 20},
    "bloomDistribution": {
        "remember": 20,
        "understand": 25,
        "apply": 25,
        "analyze": 20,
        "evaluate": 10,
    },
}


def run_case(title, payload):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)
    resp = client.post("/api/nlp/generate-blueprint", json=payload)
    print("HTTP status:", resp.status_code)
    print(json.dumps(resp.json(), indent=2))
    return resp


run_case("Realistic 3-unit, 100-mark, 20-question blueprint", REALISTIC_REQUEST)

# Exact spec Section 16 worked example.
SPEC_EXAMPLE = {
    "totalMarks": 50,
    "totalQuestions": 10,
    "units": [{"unitNumber": 1, "title": "Only Unit", "weightage": 100}],
    "difficultyDistribution": {"easy": 40, "medium": 40, "hard": 20},
    "bloomDistribution": {"remember": 20, "understand": 25, "apply": 25, "analyze": 20, "evaluate": 10},
}
run_case("Spec Section 16 worked example (expect easy=20, medium=20, hard=10 marks)", SPEC_EXAMPLE)

# Error path: percentages that don't sum to 100.
BAD_REQUEST = dict(REALISTIC_REQUEST)
BAD_REQUEST["difficultyDistribution"] = {"easy": 10, "medium": 10, "hard": 10}
run_case("Error path: difficulty percentages summing to 30, not 100", BAD_REQUEST)

# Warning path: too few questions for the number of Bloom categories.
WARNING_REQUEST = dict(REALISTIC_REQUEST)
WARNING_REQUEST["totalQuestions"] = 3
run_case("Warning path: only 3 questions for 5 Bloom categories", WARNING_REQUEST)
