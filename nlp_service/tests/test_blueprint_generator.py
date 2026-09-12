import pytest

from app.engines.blueprint.generator import generate_blueprint
from app.engines.blueprint.validation import BlueprintValidationError

SPEC_EXAMPLE_REQUEST = {
    "totalMarks": 50,
    "totalQuestions": 10,
    "units": [
        {"unitNumber": 1, "title": "Introduction to AI", "weightage": 50},
        {"unitNumber": 2, "title": "Machine Learning", "weightage": 50},
    ],
    "difficultyDistribution": {"easy": 40, "medium": 40, "hard": 20},
    "bloomDistribution": {"remember": 20, "understand": 25, "apply": 25, "analyze": 20, "evaluate": 10},
}


def test_generator_is_a_pure_function_no_api_layer_needed():
    # The whole point of keeping this in engines/, not routers/: it's
    # directly callable and testable with a plain dict, no FastAPI/HTTP
    # machinery involved at all.
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert result["totalMarks"] == 50.0
    assert result["totalQuestions"] == 10


def test_matches_spec_worked_example_marks():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    difficulty_marks = {b["label"]: b["marks"] for b in result["difficulty"]}
    assert difficulty_marks == {"easy": 20, "medium": 20, "hard": 10}


def test_difficulty_question_count_sums_to_total():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert sum(b["questionCount"] for b in result["difficulty"]) == 10


def test_difficulty_marks_sum_to_total():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert abs(sum(b["marks"] for b in result["difficulty"]) - 50.0) < 1e-6


def test_bloom_question_count_sums_to_total():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert sum(b["questionCount"] for b in result["bloom"]) == 10


def test_bloom_marks_sum_to_total():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert abs(sum(b["marks"] for b in result["bloom"]) - 50.0) < 1e-6


def test_unit_question_count_sums_to_total():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert sum(b["questionCount"] for b in result["units"]) == 10


def test_unit_marks_sum_to_total():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    assert abs(sum(b["marks"] for b in result["units"]) - 50.0) < 1e-6


def test_units_are_returned_in_unit_number_order():
    request = dict(SPEC_EXAMPLE_REQUEST)
    request["units"] = [
        {"unitNumber": 3, "title": "NLP", "weightage": 20},
        {"unitNumber": 1, "title": "Intro", "weightage": 30},
        {"unitNumber": 2, "title": "ML", "weightage": 50},
    ]
    result = generate_blueprint(request)
    assert [u["unitNumber"] for u in result["units"]] == [1, 2, 3]


def test_unit_titles_preserved_in_output():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    titles = {u["unitNumber"]: u["title"] for u in result["units"]}
    assert titles[1] == "Introduction to AI"
    assert titles[2] == "Machine Learning"


def test_three_units_weighted_allocation():
    request = dict(SPEC_EXAMPLE_REQUEST)
    request["totalMarks"] = 100
    request["totalQuestions"] = 20
    request["units"] = [
        {"unitNumber": 1, "title": "Unit A", "weightage": 50},
        {"unitNumber": 2, "title": "Unit B", "weightage": 30},
        {"unitNumber": 3, "title": "Unit C", "weightage": 20},
    ]
    result = generate_blueprint(request)
    by_unit = {u["unitNumber"]: u for u in result["units"]}
    assert by_unit[1]["questionCount"] == 10
    assert by_unit[2]["questionCount"] == 6
    assert by_unit[3]["questionCount"] == 4
    assert by_unit[1]["marks"] == 50
    assert by_unit[2]["marks"] == 30
    assert by_unit[3]["marks"] == 20


def test_rounding_edge_case_uneven_percentages():
    request = dict(SPEC_EXAMPLE_REQUEST)
    request["totalQuestions"] = 7
    request["totalMarks"] = 33
    result = generate_blueprint(request)
    assert sum(b["questionCount"] for b in result["difficulty"]) == 7
    assert sum(b["questionCount"] for b in result["bloom"]) == 7
    assert sum(b["questionCount"] for b in result["units"]) == 7
    assert abs(sum(b["marks"] for b in result["difficulty"]) - 33) < 1e-6


def test_deterministic_repeated_calls_produce_identical_output():
    results = [generate_blueprint(SPEC_EXAMPLE_REQUEST) for _ in range(10)]
    assert all(r == results[0] for r in results)


def test_low_total_questions_triggers_zero_allocation_warning():
    request = dict(SPEC_EXAMPLE_REQUEST)
    request["totalQuestions"] = 3  # fewer than the 5 bloom categories
    result = generate_blueprint(request)
    assert any("bloomDistribution" in w for w in result["warnings"])


def test_invalid_input_propagates_validation_error():
    bad_request = dict(SPEC_EXAMPLE_REQUEST)
    bad_request["totalMarks"] = -1
    with pytest.raises(BlueprintValidationError):
        generate_blueprint(bad_request)


def test_never_negative_allocations():
    result = generate_blueprint(SPEC_EXAMPLE_REQUEST)
    for band_group in ("units", "difficulty", "bloom"):
        for band in result[band_group]:
            assert band["questionCount"] >= 0
            assert band["marks"] >= 0
