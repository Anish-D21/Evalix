"""
Syllabus extraction pipeline (spec Section 14):

  File bytes
    -> text extraction (PDF/DOCX/TXT)
    -> text cleaning
    -> unit detection
    -> topic candidate extraction (per unit)
    -> topic normalization + deduplication (per unit)
    -> {extractedText, units: [{unitNumber, title, topics}]}

Mirrors engines/evaluation/evaluator.py's role as the single orchestrator
for its pipeline. Output shape matches the SYLLABI Mongoose schema from
spec Section 13 (`units: [{unitNumber, title, topics: []}]`) so a later
phase can persist this response with minimal reshaping.

Everything returned here is a CANDIDATE for teacher review, never an
auto-approved final topic list (Section 14/15's repeated point).
"""

from __future__ import annotations

from typing import Callable, List, Optional

from app.engines.preprocessing.text_processing import normalize_text
from app.engines.syllabus.text_extraction import extract_text
from app.engines.syllabus.topic_extraction import extract_candidate_topics
from app.engines.syllabus.topic_normalization import (
    merge_lexical_duplicates,
    semantic_merge_candidates,
    title_case_topic,
)
from app.engines.syllabus.unit_detection import detect_units


def extract_syllabus(file_bytes: bytes, filename: str, nlp, embed_fn: Optional[Callable] = None) -> dict:
    """
    `embed_fn`, if provided, is a callable(list[str]) -> np.ndarray used
    for the optional semantic near-duplicate merge pass. Pass None (e.g.
    when the embedding model failed to load) to skip that pass and fall
    back to lexical-only deduplication -- syllabus processing must keep
    working in a degraded/no-embedder state, unlike answer evaluation.
    """
    raw_text = extract_text(file_bytes, filename)

    # IMPORTANT: unit detection matches heading patterns per LINE
    # ("^unit...", "^chapter..."), so it must run on the raw text before
    # any whitespace normalization collapses newlines into spaces -- doing
    # that first would merge every heading into one unbroken line and
    # unit detection would never find them.
    detected_units = detect_units(raw_text)

    units_out: List[dict] = []
    for unit in detected_units:
        # Whitespace normalization happens here, per-unit, after line
        # structure has already done its job.
        cleaned_unit_text = normalize_text(unit.text)
        candidates = extract_candidate_topics(nlp, cleaned_unit_text)
        candidates = merge_lexical_duplicates(candidates)
        candidates = semantic_merge_candidates(embed_fn, candidates)
        topics = [title_case_topic(c.text) for c in candidates]

        units_out.append({"unitNumber": unit.unit_number, "title": unit.title, "topics": topics})

    return {"extractedText": raw_text, "units": units_out}
