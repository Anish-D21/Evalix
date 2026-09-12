from app.engines.question_generation.quality import find_duplicate_groups, validate_generated_question


def _q(text, topic="Machine Learning", marks=2):
    return {"text": text, "topicName": topic, "marks": marks}


def test_valid_question_has_no_issues():
    q = _q("Define Machine Learning.")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert result["valid"] is True
    assert result["issues"] == []


def test_empty_text_flagged():
    q = _q("")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert result["valid"] is False
    assert any("empty" in issue.lower() for issue in result["issues"])


def test_short_text_flagged():
    q = _q("AI?")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert result["valid"] is False
    assert any("short" in issue.lower() for issue in result["issues"])


def test_missing_terminal_punctuation_flagged():
    q = _q("Define Machine Learning")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert any("punctuation" in issue.lower() for issue in result["issues"])


def test_lowercase_start_flagged():
    q = _q("define Machine Learning.")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert any("capital" in issue.lower() for issue in result["issues"])


def test_unfilled_placeholder_flagged():
    q = _q("Compare {topic} and {topicB}.")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert any("placeholder" in issue.lower() for issue in result["issues"])


def test_topic_not_referenced_flagged():
    q = _q("Define something else entirely.", topic="Machine Learning")
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert any("topic" in issue.lower() for issue in result["issues"])


def test_non_positive_marks_flagged():
    q = _q("Define Machine Learning.", marks=0)
    result = validate_generated_question(q, 0, duplicate_groups=[])
    assert any("marks" in issue.lower() for issue in result["issues"])


def test_duplicate_membership_flagged():
    q = _q("Define Machine Learning.")
    result = validate_generated_question(q, 2, duplicate_groups=[[0, 2, 5]])
    assert result["valid"] is False
    assert any("duplicate" in issue.lower() for issue in result["issues"])


def test_not_in_any_duplicate_group_not_flagged_for_duplicates():
    q = _q("Define Machine Learning.")
    result = validate_generated_question(q, 1, duplicate_groups=[[0, 2, 5]])
    assert not any("duplicate" in issue.lower() for issue in result["issues"])


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------


def test_exact_duplicate_texts_grouped_lexically_no_embedder():
    texts = [
        "Define Machine Learning.",
        "Explain Supervised Learning with a suitable example.",
        "Define Machine Learning.",
    ]
    groups = find_duplicate_groups(texts, embed_fn=None)
    assert len(groups) == 1
    assert set(groups[0]) == {0, 2}


def test_case_and_whitespace_insensitive_lexical_match():
    texts = ["Define Machine Learning.", "  define   machine learning  "]
    groups = find_duplicate_groups(texts, embed_fn=None)
    assert len(groups) == 1
    assert set(groups[0]) == {0, 1}


def test_no_duplicates_returns_empty():
    texts = [
        "Define Machine Learning.",
        "Explain Supervised Learning with a suitable example.",
        "Design a solution using Neural Networks for the given problem.",
    ]
    groups = find_duplicate_groups(texts, embed_fn=None)
    assert groups == []


def test_single_text_no_duplicates():
    assert find_duplicate_groups(["Define Machine Learning."], embed_fn=None) == []


def test_empty_list_no_duplicates():
    assert find_duplicate_groups([], embed_fn=None) == []


def test_transitive_duplicate_grouping():
    # A==B and B==C (via different pairwise matches) should end up as one
    # group {A,B,C}, not two separate pairs.
    texts = ["Define AI.", "define ai.", "DEFINE   AI."]
    groups = find_duplicate_groups(texts, embed_fn=None)
    assert len(groups) == 1
    assert set(groups[0]) == {0, 1, 2}


def test_semantic_duplicate_detection_with_fake_embedder():
    from tests.fakes import FakeEmbedder

    embedder = FakeEmbedder()

    def embed_fn(texts):
        from app.engines.evaluation.embedder import embed_texts

        return embed_texts(embedder, texts)

    # Lexically different but heavily word-overlapping -- the bag-of-words
    # fake embedder should catch this even without exact text match.
    texts = [
        "Explain Machine Learning with a suitable example.",
        "Explain Machine Learning with a suitable example please.",
        "Design a solution using Neural Networks for the given problem.",
    ]
    groups = find_duplicate_groups(texts, embed_fn=embed_fn)
    assert len(groups) == 1
    assert set(groups[0]) == {0, 1}
