from app.engines.blueprint.allocation import allocate_marks, largest_remainder_allocation


def test_matches_spec_worked_example():
    # Section 16: Total Marks 50, Easy 40% / Medium 40% / Hard 20% -> 20/20/10.
    weights = {"easy": 40, "medium": 40, "hard": 20}
    marks = allocate_marks(50, weights, granularity=1.0)
    assert marks == {"easy": 20, "medium": 20, "hard": 10}


def test_question_allocation_sums_exactly_to_total():
    weights = {"remember": 20, "understand": 25, "apply": 25, "analyze": 20, "evaluate": 10}
    for total in [0, 1, 3, 7, 10, 13, 50, 97, 137]:
        result = largest_remainder_allocation(total, weights)
        assert sum(result.values()) == total


def test_marks_allocation_sums_exactly_to_total():
    weights = {"easy": 33.33, "medium": 33.33, "hard": 33.34}
    for total_marks in [10, 25, 33, 50, 100, 77.5]:
        result = allocate_marks(total_marks, weights, granularity=0.5)
        assert abs(sum(result.values()) - total_marks) < 1e-6


def test_every_allocated_value_is_non_negative_integer():
    weights = {"a": 10, "b": 15, "c": 75}
    result = largest_remainder_allocation(17, weights)
    for v in result.values():
        assert isinstance(v, int)
        assert v >= 0


def test_uneven_split_rounds_deterministically():
    # 10 total, 3-way even split -- classic largest-remainder case where
    # floor gives 3/3/3=9, and the 1 leftover goes to a remainder winner.
    weights = {"a": 33.33, "b": 33.33, "c": 33.34}
    result = largest_remainder_allocation(10, weights)
    assert sum(result.values()) == 10
    assert all(v in (3, 4) for v in result.values())


def test_repeated_calls_are_deterministic():
    weights = {"remember": 20, "understand": 25, "apply": 25, "analyze": 20, "evaluate": 10}
    results = [largest_remainder_allocation(37, weights) for _ in range(20)]
    assert all(r == results[0] for r in results)


def test_zero_total_gives_all_zero_allocation():
    weights = {"easy": 40, "medium": 40, "hard": 20}
    result = largest_remainder_allocation(0, weights)
    assert result == {"easy": 0, "medium": 0, "hard": 0}


def test_weights_not_summing_to_100_are_normalized_proportionally():
    # 50/50 (not summing to 100) should behave identically to 50%/50%.
    result_unnormalized = largest_remainder_allocation(10, {"a": 50, "b": 50})
    result_as_percent = largest_remainder_allocation(10, {"a": 50.0, "b": 50.0})
    assert result_unnormalized == result_as_percent == {"a": 5, "b": 5}


def test_single_category_gets_everything():
    result = largest_remainder_allocation(25, {"only": 100})
    assert result == {"only": 25}


def test_rejects_negative_total():
    import pytest

    with pytest.raises(ValueError):
        largest_remainder_allocation(-5, {"a": 100})


def test_rejects_negative_weight():
    import pytest

    with pytest.raises(ValueError):
        largest_remainder_allocation(10, {"a": -10, "b": 110})


def test_rejects_all_zero_weights():
    import pytest

    with pytest.raises(ValueError):
        largest_remainder_allocation(10, {"a": 0, "b": 0})


def test_empty_weights_returns_empty():
    assert largest_remainder_allocation(10, {}) == {}


def test_allocate_marks_respects_granularity():
    weights = {"easy": 50, "hard": 50}
    result = allocate_marks(10, weights, granularity=0.5)
    # Every value must be a multiple of the granularity.
    for v in result.values():
        assert round(v / 0.5) * 0.5 == round(v, 6)


def test_allocate_marks_rejects_zero_granularity():
    import pytest

    with pytest.raises(ValueError):
        allocate_marks(10, {"a": 100}, granularity=0)


def test_allocate_marks_rejects_negative_total():
    import pytest

    with pytest.raises(ValueError):
        allocate_marks(-10, {"a": 100}, granularity=0.5)


def test_many_categories_more_than_total_questions():
    # 6 bloom categories but only 3 questions -- some legitimately get 0.
    weights = {"remember": 16.67, "understand": 16.67, "apply": 16.67, "analyze": 16.67, "evaluate": 16.66, "create": 16.66}
    result = largest_remainder_allocation(3, weights)
    assert sum(result.values()) == 3
    zero_count = sum(1 for v in result.values() if v == 0)
    assert zero_count == 3  # exactly 3 categories get 1, 3 get 0
