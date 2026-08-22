import spacy

from app.engines.syllabus.topic_extraction import extract_candidate_topics

_nlp = spacy.load("en_core_web_sm")


def test_multiword_concepts_stay_intact_not_fragmented():
    # Spec's explicit failure mode: "machine"/"learning"/"data" must NOT
    # appear as separate candidates when "Machine Learning" is one concept.
    text = "Machine Learning is a subset of Artificial Intelligence that learns from data."
    candidates = extract_candidate_topics(_nlp, text)
    texts = {c.text for c in candidates}

    assert "Machine Learning" in texts or "Machine learning" in texts
    # None of the fragments should appear as their OWN standalone candidate.
    assert "Machine" not in texts
    assert "Learning" not in texts
    assert "learning" not in texts


def test_duplicate_mentions_are_counted_not_duplicated():
    text = "Machine Learning is powerful. Machine Learning is widely used. Machine Learning matters."
    candidates = extract_candidate_topics(_nlp, text)
    ml_candidates = [c for c in candidates if c.normalized == "machine learning"]
    assert len(ml_candidates) == 1
    assert ml_candidates[0].occurrences == 3


def test_pure_stopword_chunks_are_dropped():
    text = "It is very important. This helps a lot."
    candidates = extract_candidate_topics(_nlp, text)
    texts = {c.text.lower() for c in candidates}
    assert "it" not in texts
    assert "this" not in texts


def test_short_fragments_below_min_length_are_dropped():
    text = "Go there. Do it."
    candidates = extract_candidate_topics(_nlp, text)
    for c in candidates:
        assert len(c.normalized) >= 3


def test_empty_text_returns_no_candidates():
    assert extract_candidate_topics(_nlp, "") == []
    assert extract_candidate_topics(_nlp, "   ") == []


def test_candidates_ranked_by_frequency():
    text = "Recursion is tricky. Recursion takes practice. Recursion is fun. Arrays are simple."
    candidates = extract_candidate_topics(_nlp, text)
    assert candidates[0].normalized == "recursion"
    assert candidates[0].occurrences == 3


def test_single_word_legitimate_topics_are_kept():
    # Not every single-word noun phrase is a bad fragment -- "Python" is a
    # legitimate standalone topic in its own right.
    text = "Python is a popular programming language for data science."
    candidates = extract_candidate_topics(_nlp, text)
    texts = {c.text for c in candidates}
    assert "Python" in texts
