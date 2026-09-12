import pytest

from app.engines.question_generation.templates import BLOOM_TEMPLATES, render_question


def test_remember_template_matches_spec_wording():
    text = render_question("Machine Learning", "remember", "easy", 2)
    assert text in ["Define Machine Learning.", "List the major types of Machine Learning."]


def test_understand_template_matches_spec_wording():
    text = render_question("Machine Learning", "understand", "medium", 3)
    assert text in [
        "Explain Machine Learning with a suitable example.",
        "Describe how Machine Learning works.",
    ]


def test_apply_template_matches_spec_wording():
    text = render_question("Machine Learning", "apply", "medium", 3)
    assert text == "Given the following scenario, explain how Machine Learning could be applied."


def test_analyze_two_topic_template_matches_spec_wording():
    text = render_question("Supervised Learning", "analyze", "hard", 5, topic_b="Unsupervised Learning")
    assert text in [
        "Compare Supervised Learning and Unsupervised Learning.",
        "Analyze the effect of Supervised Learning on Unsupervised Learning.",
    ]


def test_analyze_single_topic_fallback_when_no_topic_b():
    text = render_question("Machine Learning", "analyze", "hard", 5)
    assert "Machine Learning" in text
    assert "{topicB}" not in text
    assert "None" not in text


def test_evaluate_template_matches_spec_wording():
    text = render_question("Machine Learning", "evaluate", "hard", 5)
    assert text == "Evaluate the suitability of Machine Learning for the given problem scenario."


def test_create_template_matches_spec_wording():
    text = render_question("Machine Learning", "create", "hard", 5)
    assert text == "Design a solution using Machine Learning for the given problem."


def test_bloom_level_case_insensitive():
    text_lower = render_question("Machine Learning", "remember", "easy", 2)
    text_upper = render_question("Machine Learning", "REMEMBER", "easy", 2)
    assert text_lower == text_upper


def test_unknown_bloom_level_raises():
    with pytest.raises(ValueError):
        render_question("Machine Learning", "synthesize", "easy", 2)


def test_rendering_is_deterministic():
    results = [render_question("Neural Networks", "remember", "easy", 2) for _ in range(20)]
    assert all(r == results[0] for r in results)


def test_different_topics_can_select_different_templates():
    # Not a strict requirement, but confirms the deterministic-hash
    # selection isn't accidentally collapsed to always picking index 0.
    seen = set()
    for topic in ["A", "B", "C", "D", "E", "F", "G", "H"]:
        seen.add(render_question(topic, "remember", "easy", 2))
    assert len(seen) > 1


def test_every_bloom_level_in_spec_has_templates():
    for level in ["remember", "understand", "apply", "analyze", "evaluate", "create"]:
        assert level in BLOOM_TEMPLATES
        assert len(BLOOM_TEMPLATES[level]) >= 1


def test_no_unfilled_placeholders_in_any_rendering():
    for level in ["remember", "understand", "apply", "evaluate", "create"]:
        text = render_question("Some Topic", level, "medium", 3)
        assert "{" not in text and "}" not in text
    text = render_question("Topic A", "analyze", "medium", 3, topic_b="Topic B")
    assert "{" not in text and "}" not in text
