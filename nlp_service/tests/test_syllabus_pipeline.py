import spacy

from app.engines.syllabus.pipeline import extract_syllabus

_nlp = spacy.load("en_core_web_sm")

SAMPLE_SYLLABUS_TXT = (
    b"Unit 1: Introduction to Machine Learning\n"
    b"Machine Learning is a subset of Artificial Intelligence. It uses neural networks "
    b"and deep learning algorithms.\n"
    b"\n"
    b"Unit 2: Supervised and Unsupervised Learning\n"
    b"Supervised learning uses labelled data. Unsupervised learning finds hidden patterns. "
    b"Python programming is essential.\n"
)


def test_pipeline_end_to_end_txt():
    result = extract_syllabus(SAMPLE_SYLLABUS_TXT, "syllabus.txt", _nlp, embed_fn=None)

    assert "extractedText" in result
    assert "units" in result
    assert len(result["units"]) == 2

    unit1 = result["units"][0]
    assert unit1["unitNumber"] == 1
    assert unit1["title"] == "Introduction to Machine Learning"
    assert "Machine Learning" in unit1["topics"]
    assert "Artificial Intelligence" in unit1["topics"]

    unit2 = result["units"][1]
    assert unit2["title"] == "Supervised and Unsupervised Learning"
    assert "Supervised Learning" in unit2["topics"]
    assert "Unsupervised Learning" in unit2["topics"]


def test_pipeline_never_returns_raw_keyword_fragments():
    # The spec's central failure mode, now applied to syllabus topic
    # extraction: never emit "machine"/"learning"/"data" as separate
    # single-word topics when "Machine Learning" is the real concept.
    result = extract_syllabus(SAMPLE_SYLLABUS_TXT, "syllabus.txt", _nlp, embed_fn=None)
    all_topics = [t for unit in result["units"] for t in unit["topics"]]
    lowered = {t.lower() for t in all_topics}
    assert "machine" not in lowered
    assert "learning" not in lowered
    assert "data" not in lowered


def test_pipeline_handles_no_unit_headings():
    text = b"This is a syllabus with no unit headings at all, just a plain paragraph about Python programming."
    result = extract_syllabus(text, "syllabus.txt", _nlp, embed_fn=None)
    assert len(result["units"]) == 1
    assert result["units"][0]["title"] == "General"


def test_pipeline_extracted_text_matches_raw_extraction():
    result = extract_syllabus(SAMPLE_SYLLABUS_TXT, "syllabus.txt", _nlp, embed_fn=None)
    assert result["extractedText"] == SAMPLE_SYLLABUS_TXT.decode("utf-8")


def test_pipeline_works_without_embedder_degraded_mode():
    # Core requirement: syllabus processing must keep working even when
    # the embedding model isn't loaded (unlike evaluate-answer, which
    # requires it). embed_fn=None exercises exactly that path.
    result = extract_syllabus(SAMPLE_SYLLABUS_TXT, "syllabus.txt", _nlp, embed_fn=None)
    assert len(result["units"]) == 2
    assert all(unit["topics"] for unit in result["units"])
