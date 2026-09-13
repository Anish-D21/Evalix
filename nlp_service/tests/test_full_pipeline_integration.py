"""
Full end-to-end pipeline integration test (Phase 6: FastAPI integration).

Chains all five functional engines through the REAL FastAPI HTTP layer
(TestClient, not direct function calls) in the same order as the spec's
Section 54 teacher workflow:

    Upload Syllabus -> Extract Topics
        -> Configure Blueprint -> Generate Blueprint
        -> Generate Questions
        -> Generate Rubric (from a reference answer)
        -> (Student) Evaluate Answer

Every step's output is fed into the next step's request with NO manual
reshaping beyond picking which fields to use -- proving the six engines
built across Phases 1-5 genuinely compose into one coherent service,
not just work in isolation. Uses the offline FakeEmbedder (same
test-only pattern as every prior phase) since this sandbox has no
network path to the real MiniLM model.
"""

import spacy
from fastapi.testclient import TestClient

from app.core.nlp_models import set_models_for_testing
from app.main import app
from tests.fakes import FakeEmbedder

client = TestClient(app)

set_models_for_testing(nlp=spacy.load("en_core_web_sm"), embedder=FakeEmbedder())

SYLLABUS_TXT = (
    "Unit 1: Introduction to Machine Learning\n"
    "Machine Learning\n"
    "Artificial Intelligence\n"
    "Supervised Learning\n"
    "\n"
    "Unit 2: Advanced Topics\n"
    "Unsupervised Learning\n"
    "Reinforcement Learning\n"
)

REFERENCE_ANSWER = (
    "Machine Learning is a subset of Artificial Intelligence that learns patterns from data. "
    "Supervised Learning uses labelled data to train a model."
)


def test_full_teacher_workflow_end_to_end():
    # ---- Step 1: Extract Topics from an uploaded syllabus ----
    extract_resp = client.post(
        "/api/nlp/extract-topics", files={"file": ("syllabus.txt", SYLLABUS_TXT.encode("utf-8"), "text/plain")}
    )
    assert extract_resp.status_code == 200
    extract_data = extract_resp.json()["data"]
    units = extract_data["units"]
    assert len(units) == 2
    all_topics = [t for u in units for t in u["topics"]]
    assert "Machine Learning" in all_topics
    assert "Supervised Learning" in all_topics

    # ---- Step 2: Generate Blueprint, weighting the extracted units ----
    blueprint_payload = {
        "totalMarks": 20,
        "totalQuestions": 4,
        "units": [
            {"unitNumber": u["unitNumber"], "title": u["title"], "weightage": 100 / len(units)} for u in units
        ],
        "difficultyDistribution": {"easy": 50, "medium": 30, "hard": 20},
        "bloomDistribution": {
            "remember": 20, "understand": 20, "apply": 20, "analyze": 20, "evaluate": 10, "create": 10,
        },
    }
    blueprint_resp = client.post("/api/nlp/generate-blueprint", json=blueprint_payload)
    assert blueprint_resp.status_code == 200
    blueprint_data = blueprint_resp.json()["data"]
    assert sum(b["questionCount"] for b in blueprint_data["units"]) == 4
    assert sum(b["marks"] for b in blueprint_data["units"]) == 20

    # ---- Step 3: Generate Questions, using extracted topics + the
    # blueprint's own Bloom distribution as the source of Bloom levels ----
    bloom_levels_needed = [b["label"] for b in blueprint_data["bloom"] if b["questionCount"] > 0]
    question_requests = [
        {"topic": all_topics[i % len(all_topics)], "bloomLevel": level, "difficulty": "medium", "marks": 2}
        for i, level in enumerate(bloom_levels_needed)
    ]
    questions_resp = client.post("/api/nlp/generate-questions", json={"requests": question_requests})
    assert questions_resp.status_code == 200
    questions_data = questions_resp.json()["data"]
    assert len(questions_data["questions"]) == len(question_requests)
    for q in questions_data["questions"]:
        assert q["text"]
        assert q["topicName"] in all_topics

    # ---- Step 4: Generate Rubric Candidates from a reference answer ----
    rubric_resp = client.post(
        "/api/nlp/generate-rubric-candidates", json={"referenceAnswer": REFERENCE_ANSWER, "totalMarks": 5}
    )
    assert rubric_resp.status_code == 200
    rubric_data = rubric_resp.json()["data"]
    concepts = rubric_data["concepts"]
    assert len(concepts) > 0
    assert abs(sum(c["marks"] for c in concepts) - 5.0) < 1e-6

    # ---- Step 5: Evaluate a student answer against the generated rubric,
    # with ZERO reshaping of the concepts from step 4 ----
    student_answer = "Machine Learning is part of Artificial Intelligence. Supervised Learning uses labelled data."
    evaluate_resp = client.post(
        "/api/nlp/evaluate-answer",
        json={
            "question": "Explain Machine Learning.",
            "rubric": {"totalMarks": 5, "concepts": concepts},
            "studentAnswer": student_answer,
        },
    )
    assert evaluate_resp.status_code == 200
    evaluate_data = evaluate_resp.json()["data"]
    assert evaluate_data["maxScore"] == 5.0
    assert 0 <= evaluate_data["overallScore"] <= 5.0
    assert evaluate_data["confidence"] in ("High", "Medium", "Low")


def test_pipeline_steps_are_independently_re_runnable():
    # Re-running any single step in isolation (e.g. the teacher tweaks
    # the blueprint and regenerates) must not depend on in-memory state
    # left over from a previous step -- every engine is a pure function
    # of its own request.
    resp1 = client.post(
        "/api/nlp/generate-blueprint",
        json={
            "totalMarks": 10,
            "totalQuestions": 5,
            "units": [{"unitNumber": 1, "title": "Only Unit", "weightage": 100}],
            "difficultyDistribution": {"easy": 100, "medium": 0, "hard": 0},
            "bloomDistribution": {"remember": 100, "understand": 0, "apply": 0, "analyze": 0, "evaluate": 0, "create": 0},
        },
    )
    resp2 = client.post(
        "/api/nlp/generate-blueprint",
        json={
            "totalMarks": 10,
            "totalQuestions": 5,
            "units": [{"unitNumber": 1, "title": "Only Unit", "weightage": 100}],
            "difficultyDistribution": {"easy": 100, "medium": 0, "hard": 0},
            "bloomDistribution": {"remember": 100, "understand": 0, "apply": 0, "analyze": 0, "evaluate": 0, "create": 0},
        },
    )
    assert resp1.json() == resp2.json()


def test_all_error_envelopes_consistent_across_the_whole_pipeline():
    # Every endpoint's error shape must be identical, since a single
    # Node-side error handler will consume all of them uniformly.
    responses = [
        client.post("/api/nlp/extract-topics", files={"file": ("bad.csv", b"x", "text/csv")}),
        client.post("/api/nlp/generate-blueprint", json={"totalMarks": -1, "totalQuestions": 1, "units": [], "difficultyDistribution": {}, "bloomDistribution": {}}),
        client.post("/api/nlp/generate-questions", json={"requests": []}),
        client.post("/api/nlp/generate-rubric-candidates", json={"referenceAnswer": ""}),
    ]
    for resp in responses:
        assert resp.status_code in (400, 422)
        body = resp.json()
        assert body["success"] is False
        assert body["data"] is None
        assert "code" in body["error"]
        assert "message" in body["error"]
