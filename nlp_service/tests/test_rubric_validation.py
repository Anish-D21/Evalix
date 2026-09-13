import pytest

from app.engines.rubric.validation import RubricGenerationValidationError, validate_rubric_generation_request


def test_valid_request_passes():
    result = validate_rubric_generation_request({"referenceAnswer": "Machine Learning is a subset of AI.", "totalMarks": 10})
    assert result["referenceAnswer"] == "Machine Learning is a subset of AI."
    assert result["totalMarks"] == 10.0


def test_missing_reference_answer_rejected():
    with pytest.raises(RubricGenerationValidationError) as exc:
        validate_rubric_generation_request({"referenceAnswer": ""})
    assert exc.value.code == "MISSING_REFERENCE_ANSWER"


def test_whitespace_only_reference_answer_rejected():
    with pytest.raises(RubricGenerationValidationError) as exc:
        validate_rubric_generation_request({"referenceAnswer": "   "})
    assert exc.value.code == "MISSING_REFERENCE_ANSWER"


def test_missing_reference_answer_key_rejected():
    with pytest.raises(RubricGenerationValidationError) as exc:
        validate_rubric_generation_request({})
    assert exc.value.code == "MISSING_REFERENCE_ANSWER"


def test_total_marks_optional():
    result = validate_rubric_generation_request({"referenceAnswer": "Some answer text."})
    assert result["totalMarks"] is None


def test_zero_total_marks_rejected():
    with pytest.raises(RubricGenerationValidationError) as exc:
        validate_rubric_generation_request({"referenceAnswer": "Some answer.", "totalMarks": 0})
    assert exc.value.code == "INVALID_TOTAL_MARKS"


def test_negative_total_marks_rejected():
    with pytest.raises(RubricGenerationValidationError) as exc:
        validate_rubric_generation_request({"referenceAnswer": "Some answer.", "totalMarks": -5})
    assert exc.value.code == "INVALID_TOTAL_MARKS"


def test_reference_answer_stripped():
    result = validate_rubric_generation_request({"referenceAnswer": "  Machine Learning.  "})
    assert result["referenceAnswer"] == "Machine Learning."
