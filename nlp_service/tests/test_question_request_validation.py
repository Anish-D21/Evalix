import pytest

from app.engines.question_generation.validation import (
    QuestionRequestValidationError,
    validate_question_request,
    validate_question_requests,
)

VALID_ITEM = {"topic": "Machine Learning", "bloomLevel": "remember", "difficulty": "easy", "marks": 2}


def test_valid_item_passes():
    result = validate_question_request(VALID_ITEM, 0)
    assert result["topic"] == "Machine Learning"
    assert result["bloomLevel"] == "remember"
    assert result["difficulty"] == "easy"
    assert result["marks"] == 2.0
    assert result["questionType"] == "descriptive"


def test_missing_topic_rejected():
    item = dict(VALID_ITEM)
    item["topic"] = ""
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "MISSING_TOPIC"


def test_whitespace_only_topic_rejected():
    item = dict(VALID_ITEM)
    item["topic"] = "   "
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "MISSING_TOPIC"


def test_topic_b_same_as_topic_rejected():
    item = dict(VALID_ITEM)
    item["bloomLevel"] = "analyze"
    item["topicB"] = "Machine Learning"
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "DUPLICATE_TOPIC_PAIR"


def test_unknown_bloom_level_rejected():
    item = dict(VALID_ITEM)
    item["bloomLevel"] = "synthesize"
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "INVALID_LABEL"


def test_unknown_difficulty_rejected():
    item = dict(VALID_ITEM)
    item["difficulty"] = "impossible"
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "INVALID_LABEL"


def test_difficulty_and_bloom_case_insensitive():
    item = dict(VALID_ITEM)
    item["bloomLevel"] = "REMEMBER"
    item["difficulty"] = "EASY"
    result = validate_question_request(item, 0)
    assert result["bloomLevel"] == "remember"
    assert result["difficulty"] == "easy"


def test_zero_marks_rejected():
    item = dict(VALID_ITEM)
    item["marks"] = 0
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "INVALID_MARKS"


def test_negative_marks_rejected():
    item = dict(VALID_ITEM)
    item["marks"] = -1
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "INVALID_MARKS"


def test_missing_marks_rejected():
    item = dict(VALID_ITEM)
    del item["marks"]
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 0)
    assert exc.value.code == "INVALID_MARKS"


def test_default_question_type_is_descriptive():
    result = validate_question_request(VALID_ITEM, 0)
    assert result["questionType"] == "descriptive"


def test_custom_question_type_preserved():
    item = dict(VALID_ITEM)
    item["questionType"] = "short_answer"
    result = validate_question_request(item, 0)
    assert result["questionType"] == "short_answer"


def test_error_message_includes_index():
    item = dict(VALID_ITEM)
    item["topic"] = ""
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_request(item, 3)
    assert "requests[3]" in exc.value.message


def test_empty_requests_list_rejected():
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_requests([])
    assert exc.value.code == "MISSING_REQUESTS"


def test_none_requests_rejected():
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_requests(None)
    assert exc.value.code == "MISSING_REQUESTS"


def test_batch_validates_all_items():
    items = [VALID_ITEM, dict(VALID_ITEM, topic="Deep Learning")]
    results = validate_question_requests(items)
    assert len(results) == 2
    assert results[1]["topic"] == "Deep Learning"


def test_batch_stops_at_first_invalid_item():
    items = [VALID_ITEM, dict(VALID_ITEM, marks=-5)]
    with pytest.raises(QuestionRequestValidationError) as exc:
        validate_question_requests(items)
    assert "requests[1]" in exc.value.message
