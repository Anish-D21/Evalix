"""
Regression tests for the list-style syllabus extraction bug.

Root cause: `pipeline.py` used to call `normalize_text(unit.text)` before
topic extraction, collapsing every line break in a unit into a single
space. For prose syllabus content that's harmless -- but for the very
common list-style format (one topic per line, no sentence punctuation),
it turned e.g.

    Text Preprocessing
    Word Embeddings
    Named Entity Recognition

into the single run-on string "Text Preprocessing Word Embeddings Named
Entity Recognition", which spaCy's noun-chunk parser then misparsed
(lacking any punctuation to signal phrase boundaries) as "Text
Preprocessing Word" / "Embeddings Named" / "Entity Recognition" --
exactly the reported bug.

The fix: `extract_candidate_topics_per_unit` (topic_extraction.py) now
processes each of a unit's ORIGINAL lines independently. A short,
unpunctuated line is kept as one topic verbatim; only genuine prose
lines (ending in . / ! / ?, or long) go through noun-chunk parsing.
`pipeline.py` now passes unit.text to it un-normalized, preserving the
original line breaks that fix depends on.
"""

import spacy

from app.engines.syllabus.pipeline import extract_syllabus
from app.engines.syllabus.topic_extraction import extract_candidate_topics_per_unit

_nlp = spacy.load("en_core_web_sm")

# Exact TXT input from the bug report.
BUGREPORT_TXT_LF = (
    "UNIT I: Introduction to Artificial Intelligence\n"
    "\n"
    "Introduction to Artificial Intelligence\n"
    "Machine Learning\n"
    "Deep Learning\n"
    "\n"
    "UNIT II: Machine Learning\n"
    "\n"
    "Supervised Learning\n"
    "Unsupervised Learning\n"
    "Reinforcement Learning\n"
    "\n"
    "UNIT III: Natural Language Processing\n"
    "\n"
    "Text Preprocessing\n"
    "Word Embeddings\n"
    "Named Entity Recognition\n"
)

# Same content, Windows line endings throughout (requirement: CRLF must
# work correctly, not just be silently tolerated).
BUGREPORT_TXT_CRLF = BUGREPORT_TXT_LF.replace("\n", "\r\n")


def _run(txt: str) -> dict:
    return extract_syllabus(txt.encode("utf-8"), "syllabus.txt", _nlp, embed_fn=None)


def _topics_by_unit(result: dict) -> dict:
    return {u["unitNumber"]: set(u["topics"]) for u in result["units"]}


# ---------------------------------------------------------------------------
# Exact bug-report case, LF line endings.
# ---------------------------------------------------------------------------


def test_bugreport_case_produces_exactly_three_units():
    result = _run(BUGREPORT_TXT_LF)
    assert len(result["units"]) == 3


def test_bugreport_case_unit_titles_preserved():
    result = _run(BUGREPORT_TXT_LF)
    titles = [u["title"] for u in result["units"]]
    assert titles == [
        "Introduction to Artificial Intelligence",
        "Machine Learning",
        "Natural Language Processing",
    ]


def test_bugreport_case_unit1_topics_exact():
    topics = _topics_by_unit(_run(BUGREPORT_TXT_LF))[1]
    assert topics == {"Introduction to Artificial Intelligence", "Machine Learning", "Deep Learning"}


def test_bugreport_case_unit2_topics_exact():
    topics = _topics_by_unit(_run(BUGREPORT_TXT_LF))[2]
    assert topics == {"Supervised Learning", "Unsupervised Learning", "Reinforcement Learning"}


def test_bugreport_case_unit3_topics_exact():
    topics = _topics_by_unit(_run(BUGREPORT_TXT_LF))[3]
    assert topics == {"Text Preprocessing", "Word Embeddings", "Named Entity Recognition"}


def test_bugreport_case_no_merged_topics():
    # The exact incorrect merges from the bug report must not appear.
    all_topics = set()
    for topics in _topics_by_unit(_run(BUGREPORT_TXT_LF)).values():
        all_topics |= topics
    assert "Artificial Intelligence Machine Learning Deep Learning" not in all_topics
    assert "Introduction" not in all_topics  # was truncated from the full title


def test_bugreport_case_no_split_topics():
    # The exact incorrect splits from the bug report must not appear.
    all_topics = set()
    for topics in _topics_by_unit(_run(BUGREPORT_TXT_LF)).values():
        all_topics |= topics
    assert "Embeddings Named" not in all_topics
    assert "Entity Recognition" not in all_topics  # only the FULL phrase should appear
    assert "Text Preprocessing Word" not in all_topics
    # The correct, unsplit phrase must be present instead.
    assert "Named Entity Recognition" in all_topics


# ---------------------------------------------------------------------------
# Same case, Windows CRLF line endings -- must produce identical results.
# ---------------------------------------------------------------------------


def test_bugreport_case_crlf_matches_lf_result():
    lf_result = _run(BUGREPORT_TXT_LF)
    crlf_result = _run(BUGREPORT_TXT_CRLF)

    assert _topics_by_unit(lf_result) == _topics_by_unit(crlf_result)
    assert [u["title"] for u in lf_result["units"]] == [u["title"] for u in crlf_result["units"]]


def test_bugreport_case_crlf_no_stray_carriage_returns_in_topics():
    result = _run(BUGREPORT_TXT_CRLF)
    for unit in result["units"]:
        assert "\r" not in unit["title"]
        for topic in unit["topics"]:
            assert "\r" not in topic


# ---------------------------------------------------------------------------
# Unit test level: extract_candidate_topics_per_unit directly, isolating
# the fix from unit detection / normalization / dedup.
# ---------------------------------------------------------------------------


def test_per_unit_extraction_keeps_adjacent_list_lines_separate():
    text = "Text Preprocessing\nWord Embeddings\nNamed Entity Recognition\n"
    candidates = extract_candidate_topics_per_unit(_nlp, text)
    names = {c.text for c in candidates}
    assert names == {"Text Preprocessing", "Word Embeddings", "Named Entity Recognition"}


def test_per_unit_extraction_handles_crlf_directly():
    text = "Text Preprocessing\r\nWord Embeddings\r\nNamed Entity Recognition\r\n"
    candidates = extract_candidate_topics_per_unit(_nlp, text)
    names = {c.text for c in candidates}
    assert names == {"Text Preprocessing", "Word Embeddings", "Named Entity Recognition"}


def test_per_unit_extraction_does_not_split_prepositional_title():
    text = "Introduction to Artificial Intelligence\n"
    candidates = extract_candidate_topics_per_unit(_nlp, text)
    names = {c.text for c in candidates}
    assert "Introduction to Artificial Intelligence" in names
    # Must not be split into "Introduction" + "Artificial Intelligence".
    assert names == {"Introduction to Artificial Intelligence"}


# ---------------------------------------------------------------------------
# Existing prose-based extraction must be completely unaffected.
# ---------------------------------------------------------------------------


def test_prose_extraction_still_works_via_pipeline():
    prose = (
        "Unit 1: Introduction to Machine Learning\n"
        "Machine Learning is a subset of Artificial Intelligence that learns patterns from data. "
        "It relies on neural networks and deep learning techniques.\n"
    )
    result = _run(prose)
    topics = _topics_by_unit(result)[1]
    assert "Machine Learning" in topics
    assert "Artificial Intelligence" in topics
    assert "Neural Networks" in topics


def test_prose_line_still_goes_through_noun_chunk_extraction():
    # A long, punctuated line should NOT be kept verbatim as one giant
    # "topic" -- it must still be broken into real noun-chunk topics.
    text = "Machine Learning is a subset of Artificial Intelligence that learns patterns from data.\n"
    candidates = extract_candidate_topics_per_unit(_nlp, text)
    names = {c.text for c in candidates}
    assert text.strip() not in names
    assert "Machine Learning" in names
    assert "Artificial Intelligence" in names


def test_mixed_list_and_prose_lines_in_same_unit():
    # A unit can plausibly mix a short list-style line with a prose
    # description line -- both must be handled correctly in the same pass.
    text = "Named Entity Recognition\nThis technique identifies proper nouns within a block of text.\n"
    candidates = extract_candidate_topics_per_unit(_nlp, text)
    names = {c.text for c in candidates}
    assert "Named Entity Recognition" in names
