import pytest

from app.engines.question_generation.generator import generate_questions
from app.engines.question_generation.validation import QuestionRequestValidationError


def test_generates_one_question_per_request():
    result = generate_questions(
        {
            "requests": [
                {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2},
                {"topic": "Deep Learning", "bloomLevel": "create", "difficulty": "hard", "marks": 5},
            ]
        }
    )
    assert len(result["questions"]) == 2


def test_question_includes_all_required_fields():
    # Section 17: "The generated question must include: topic, Bloom
    # level, difficulty, marks, question type."
    result = generate_questions(
        {"requests": [{"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}]}
    )
    q = result["questions"][0]
    assert q["topicName"] == "Machine Learning"
    assert q["bloomLevel"] == "remember"
    assert q["difficulty"] == "easy"
    assert q["marks"] == 2.0
    assert q["questionType"] == "descriptive"
    assert q["status"] == "draft"
    assert "text" in q and q["text"]


def test_question_carries_validation_result():
    result = generate_questions(
        {"requests": [{"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}]}
    )
    assert "validation" in result["questions"][0]
    assert result["questions"][0]["validation"]["valid"] is True


def test_duplicate_requests_flagged_and_warned():
    item = {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}
    result = generate_questions({"requests": [item, dict(item)]})
    assert result["questions"][0]["validation"]["valid"] is False
    assert result["questions"][1]["validation"]["valid"] is False
    assert len(result["warnings"]) == 1


def test_no_duplicates_no_warning():
    result = generate_questions(
        {
            "requests": [
                {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2},
                {"topic": "Deep Learning", "bloomLevel": "create", "difficulty": "hard", "marks": 5},
            ]
        }
    )
    assert result["warnings"] == []


def test_topic_id_passed_through():
    result = generate_questions(
        {
            "requests": [
                {"topicId": "t123", "topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}
            ]
        }
    )
    assert result["questions"][0]["topicId"] == "t123"


def test_analyze_with_topic_b_generates_comparison():
    result = generate_questions(
        {
            "requests": [
                {
                    "topic": "Supervised Learning",
                    "topicB": "Unsupervised Learning",
                    "bloomLevel": "analyze",
                    "difficulty": "hard",
                    "marks": 5,
                }
            ]
        }
    )
    text = result["questions"][0]["text"]
    assert "Supervised Learning" in text
    assert "Unsupervised Learning" in text


def test_invalid_request_raises_before_generating_anything():
    with pytest.raises(QuestionRequestValidationError):
        generate_questions(
            {
                "requests": [
                    {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2},
                    {"topic": "", "bloomLevel": "remember", "difficulty": "easy", "marks": 2},
                ]
            }
        )


def test_deterministic_repeated_calls_produce_identical_output():
    request = {
        "requests": [
            {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2},
            {"topic": "Deep Learning", "bloomLevel": "understand", "difficulty": "medium", "marks": 3},
        ]
    }
    results = [generate_questions(request) for _ in range(10)]
    assert all(r == results[0] for r in results)


def test_large_batch_all_six_bloom_levels():
    levels = ["remember", "understand", "apply", "analyze", "evaluate", "create"]
    requests = [{"topic": f"Topic {i}", "bloomLevel": level, "difficulty": "medium", "marks": 2} for i, level in enumerate(levels)]
    result = generate_questions({"requests": requests})
    assert len(result["questions"]) == 6
    assert all(q["validation"]["valid"] for q in result["questions"])
