from app.engines.rubric.overlap import build_overlap_warnings, find_overlapping_concept_groups
from tests.fakes import FakeEmbedder


def _embed_fn():
    embedder = FakeEmbedder()

    def fn(texts):
        from app.engines.evaluation.embedder import embed_texts

        return embed_texts(embedder, texts)

    return fn


def test_no_embedder_returns_no_groups():
    groups = find_overlapping_concept_groups(["Machine Learning", "Machine Learning Basics"], embed_fn=None)
    assert groups == []


def test_single_concept_no_groups():
    groups = find_overlapping_concept_groups(["Machine Learning"], embed_fn=_embed_fn())
    assert groups == []


def test_empty_list_no_groups():
    groups = find_overlapping_concept_groups([], embed_fn=_embed_fn())
    assert groups == []


def test_detects_overlapping_names():
    # Same words, different order -- the bag-of-words fake embedder (no
    # stemming) can't recognize "Algorithm"/"Algorithms" as related, but
    # word-for-word overlap it can detect easily. Real MiniLM would catch
    # subtler paraphrases too; this test verifies the grouping mechanism.
    names = ["Machine Learning Basics", "Learning Machine Basics", "Reinforcement Learning"]
    groups = find_overlapping_concept_groups(names, embed_fn=_embed_fn(), threshold=0.85)
    assert len(groups) == 1
    assert set(groups[0]) == {0, 1}


def test_distinct_concepts_no_overlap():
    names = ["Machine Learning", "Data Structures", "Operating Systems"]
    groups = find_overlapping_concept_groups(names, embed_fn=_embed_fn(), threshold=0.9)
    assert groups == []


def test_build_overlap_warnings_produces_readable_messages():
    # Uses the default threshold (0.90) -- a casing variant of the same
    # exact wording, which the bag-of-words fake embedder (lowercases
    # before hashing) reliably scores as near-identical.
    names = ["Machine Learning Fundamentals", "MACHINE LEARNING FUNDAMENTALS"]
    warnings = build_overlap_warnings(names, embed_fn=_embed_fn())
    assert len(warnings) == 1
    assert "Machine Learning Fundamentals" in warnings[0]
    assert "overlap" in warnings[0].lower()


def test_build_overlap_warnings_empty_without_embedder():
    names = ["Machine Learning Algorithm", "Machine Learning Algorithms"]
    warnings = build_overlap_warnings(names, embed_fn=None)
    assert warnings == []
