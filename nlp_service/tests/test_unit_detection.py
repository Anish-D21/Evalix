from app.engines.syllabus.unit_detection import detect_units


def test_detects_multiple_units_with_arabic_numerals():
    text = (
        "Unit 1: Introduction to Machine Learning\n"
        "Machine Learning is a subset of AI.\n"
        "\n"
        "Unit 2: Supervised Learning\n"
        "Supervised learning uses labelled data.\n"
    )
    units = detect_units(text)
    assert len(units) == 2
    assert units[0].unit_number == 1
    assert units[0].title == "Introduction to Machine Learning"
    assert "subset of AI" in units[0].text
    assert units[1].title == "Supervised Learning"
    assert "labelled data" in units[1].text


def test_detects_roman_numerals_and_dash_format():
    text = "UNIT - I\nIntroduction content.\n\nUNIT - II\nAdvanced content.\n"
    units = detect_units(text)
    assert len(units) == 2
    assert units[0].unit_number == 1
    assert units[1].unit_number == 2


def test_detects_chapter_and_module_headings():
    text = "Chapter 1: Basics\nSome text.\n\nModule 2: Advanced\nMore text.\n"
    units = detect_units(text)
    assert len(units) == 2
    assert units[0].title == "Basics"
    assert units[1].title == "Advanced"


def test_heading_line_excluded_from_body_text():
    # The heading itself shouldn't leak into topic-extraction body text --
    # it's already captured as `title`.
    text = "Unit 1: Introduction to Machine Learning\nMachine Learning is powerful.\n"
    units = detect_units(text)
    assert "Introduction to Machine Learning" not in units[0].text
    assert "Machine Learning is powerful." in units[0].text


def test_no_headings_falls_back_to_single_unit():
    text = "This syllabus has no explicit unit headings, just plain paragraphs of content."
    units = detect_units(text)
    assert len(units) == 1
    assert units[0].unit_number == 1
    assert units[0].title == "General"
    assert units[0].text == text


def test_empty_text_returns_no_units():
    assert detect_units("") == []
    assert detect_units("   \n\n  ") == []


def test_heading_without_title_gets_fallback_title():
    text = "Unit 1\nSome content.\n\nUnit 2\nMore content.\n"
    units = detect_units(text)
    assert units[0].title == "Unit 1"
    assert units[1].title == "Unit 2"
