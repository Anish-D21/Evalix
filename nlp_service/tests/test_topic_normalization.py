from app.engines.syllabus.models import TopicCandidate
from app.engines.syllabus.topic_normalization import (
    merge_lexical_duplicates,
    normalize_topic_phrase,
    semantic_merge_candidates,
    title_case_topic,
)
from tests.fakes import FakeEmbedder


def test_normalize_handles_spec_worked_example():
    # Spec's exact worked example: these three must normalize identically.
    assert normalize_topic_phrase("machine learning") == normalize_topic_phrase("Machine Learning")
    assert normalize_topic_phrase("Machine Learning") == normalize_topic_phrase("machine-learning")


def test_normalize_strips_punctuation_and_collapses_whitespace():
    assert normalize_topic_phrase("Neural   Networks!") == "neural networks"


def test_normalize_strips_leading_article():
    assert normalize_topic_phrase("a subset") == "subset"
    assert normalize_topic_phrase("The Internet") == "internet"
    assert normalize_topic_phrase("An Algorithm") == "algorithm"


def test_title_case_keeps_short_acronyms():
    assert title_case_topic("AI") == "AI"
    assert title_case_topic("NLP algorithms") == "NLP Algorithms"


def test_title_case_lowercases_minor_words_except_first():
    assert title_case_topic("theory of computation") == "Theory of Computation"


def test_merge_lexical_duplicates_combines_counts():
    candidates = [
        TopicCandidate(text="machine learning", normalized="machine learning", occurrences=2),
        TopicCandidate(text="Machine Learning", normalized="machine learning", occurrences=3),
        TopicCandidate(text="machine-learning", normalized="machine learning", occurrences=1),
    ]
    merged = merge_lexical_duplicates(candidates)
    assert len(merged) == 1
    assert merged[0].occurrences == 6


def test_merge_lexical_duplicates_keeps_distinct_topics_separate():
    candidates = [
        TopicCandidate(text="Machine Learning", normalized="machine learning", occurrences=2),
        TopicCandidate(text="Deep Learning", normalized="deep learning", occurrences=1),
    ]
    merged = merge_lexical_duplicates(candidates)
    assert len(merged) == 2


def test_semantic_merge_skipped_when_no_embed_fn():
    candidates = [
        TopicCandidate(text="Neural Networks", normalized="neural networks", occurrences=1),
        TopicCandidate(text="Neural Nets", normalized="neural nets", occurrences=1),
    ]
    result = semantic_merge_candidates(None, candidates)
    assert len(result) == 2  # unchanged, no merge attempted


def test_semantic_merge_combines_near_duplicates():
    embedder = FakeEmbedder()

    def embed_fn(texts):
        return embedder.encode(texts)

    # The offline hashing fake embedder has no stemming/synonym awareness
    # (see tests/fakes.py), so "Algorithm" vs "Algorithms" only reaches
    # ~0.64 similarity here rather than the near-1.0 a real embedding
    # model would give two forms of the same word. Threshold is lowered
    # accordingly for this test only, to demonstrate the merge MECHANISM
    # works -- production uses the real MiniLM model via settings.topic_overlap_threshold.
    candidates = [
        TopicCandidate(text="Machine Learning Algorithms", normalized="machine learning algorithms", occurrences=2),
        TopicCandidate(text="Machine Learning Algorithm", normalized="machine learning algorithm", occurrences=1),
    ]
    result = semantic_merge_candidates(embed_fn, candidates, threshold=0.6)
    assert len(result) == 1
    assert result[0].occurrences == 3
