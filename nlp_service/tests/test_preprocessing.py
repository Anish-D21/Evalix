import spacy

from app.engines.preprocessing.text_processing import normalize_text, segment_sentences

_nlp = spacy.load("en_core_web_sm")


def test_normalize_text_collapses_whitespace():
    assert normalize_text("  Machine   Learning \n is  fun  ") == "Machine Learning is fun"


def test_normalize_text_handles_empty():
    assert normalize_text("") == ""
    assert normalize_text(None) == ""


def test_segment_sentences_splits_on_boundaries():
    text = "Machine Learning is a branch of AI. It learns from data. Models are trained and evaluated."
    sentences = segment_sentences(_nlp, text)
    assert len(sentences) == 3
    assert sentences[0].startswith("Machine Learning")
    assert sentences[1].startswith("It learns")


def test_segment_sentences_does_not_split_on_abbreviation():
    text = "Machine Learning uses data, e.g. images and text, to learn patterns."
    sentences = segment_sentences(_nlp, text)
    # Should stay as one sentence, not split after "e.g."
    assert len(sentences) == 1


def test_segment_sentences_empty_input():
    assert segment_sentences(_nlp, "") == []
    assert segment_sentences(_nlp, "   ") == []
