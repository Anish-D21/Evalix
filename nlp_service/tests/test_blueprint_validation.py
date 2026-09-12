import pytest

from app.engines.blueprint.validation import BlueprintValidationError, validate_blueprint_request

VALID_REQUEST = {
    "totalMarks": 50,
    "totalQuestions": 10,
    "units": [
        {"unitNumber": 1, "title": "Intro to AI", "weightage": 40},
        {"unitNumber": 2, "title": "Machine Learning", "weightage": 60},
    ],
    "difficultyDistribution": {"easy": 40, "medium": 40, "hard": 20},
    "bloomDistribution": {"remember": 20, "understand": 25, "apply": 25, "analyze": 20, "evaluate": 10},
}


def _with(**overrides):
    data = {k: (dict(v) if isinstance(v, dict) else list(v) if isinstance(v, list) else v) for k, v in VALID_REQUEST.items()}
    data.update(overrides)
    return data


def test_valid_request_passes_with_no_warnings():
    validated, warnings = validate_blueprint_request(VALID_REQUEST)
    assert validated["totalMarks"] == 50.0
    assert validated["totalQuestions"] == 10
    assert warnings == []


def test_missing_total_marks_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(totalMarks=None))
    assert exc.value.code == "INVALID_TOTAL_MARKS"


def test_zero_total_marks_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(totalMarks=0))
    assert exc.value.code == "INVALID_TOTAL_MARKS"


def test_negative_total_marks_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(totalMarks=-10))
    assert exc.value.code == "INVALID_TOTAL_MARKS"


def test_zero_total_questions_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(totalQuestions=0))
    assert exc.value.code == "INVALID_TOTAL_QUESTIONS"


def test_negative_total_questions_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(totalQuestions=-3))
    assert exc.value.code == "INVALID_TOTAL_QUESTIONS"


def test_non_integer_total_questions_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(totalQuestions=10.5))
    assert exc.value.code == "INVALID_TOTAL_QUESTIONS"


def test_missing_units_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(units=[]))
    assert exc.value.code == "MISSING_UNITS"


def test_invalid_unit_number_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(units=[{"unitNumber": 0, "weightage": 100}]))
    assert exc.value.code == "INVALID_UNIT_NUMBER"


def test_duplicate_unit_number_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(
            _with(units=[{"unitNumber": 1, "weightage": 50}, {"unitNumber": 1, "weightage": 50}])
        )
    assert exc.value.code == "DUPLICATE_UNIT"


def test_negative_unit_weightage_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(units=[{"unitNumber": 1, "weightage": -10}, {"unitNumber": 2, "weightage": 110}]))
    assert exc.value.code == "NEGATIVE_PERCENTAGE"


def test_unit_weightage_not_summing_to_100_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(units=[{"unitNumber": 1, "weightage": 40}, {"unitNumber": 2, "weightage": 40}]))
    assert exc.value.code == "PERCENTAGE_SUM_INVALID"


def test_unit_title_defaults_when_missing():
    validated, _ = validate_blueprint_request(
        _with(units=[{"unitNumber": 1, "weightage": 100}])
    )
    assert validated["unitMeta"]["1"]["title"] == "Unit 1"


def test_unknown_difficulty_label_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(difficultyDistribution={"trivial": 100}))
    assert exc.value.code == "INVALID_LABEL"


def test_unknown_bloom_label_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(bloomDistribution={"synthesize": 100}))
    assert exc.value.code == "INVALID_LABEL"


def test_difficulty_labels_case_insensitive():
    validated, _ = validate_blueprint_request(
        _with(difficultyDistribution={"EASY": 40, "Medium": 40, "hard": 20})
    )
    assert set(validated["difficultyDistribution"].keys()) == {"easy", "medium", "hard"}


def test_negative_difficulty_percentage_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(difficultyDistribution={"easy": -10, "medium": 90, "hard": 20}))
    assert exc.value.code == "NEGATIVE_PERCENTAGE"


def test_empty_difficulty_distribution_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(difficultyDistribution={}))
    assert exc.value.code == "MISSING_DISTRIBUTION"


def test_percentage_sum_far_from_100_rejected():
    with pytest.raises(BlueprintValidationError) as exc:
        validate_blueprint_request(_with(difficultyDistribution={"easy": 10, "medium": 10, "hard": 10}))
    assert exc.value.code == "PERCENTAGE_SUM_INVALID"


def test_percentage_sum_slightly_off_accepted_with_warning():
    validated, warnings = validate_blueprint_request(
        _with(difficultyDistribution={"easy": 40, "medium": 40, "hard": 19.7})
    )
    assert validated is not None
    assert any("difficultyDistribution" in w for w in warnings)


def test_percentage_sum_exactly_100_has_no_warning():
    _, warnings = validate_blueprint_request(VALID_REQUEST)
    assert not any("difficultyDistribution" in w for w in warnings)
