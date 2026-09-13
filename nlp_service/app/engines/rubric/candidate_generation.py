"""
Rubric concept candidate generation (spec Sections 19-21).

Pipeline (Section 20):
  Reference Answer
    -> Candidate extraction
    -> Normalization
    -> Deduplication
    -> Candidate concepts
    -> Teacher review (a later phase's UI -- this engine only ever
       produces CANDIDATES, never an auto-approved rubric)

Deliberately reuses the syllabus engine's already-tested extraction and
normalization building blocks (engines/syllabus/topic_extraction.py,
topic_normalization.py) rather than re-implementing them: Section 20's
own instructions are a near-verbatim repeat of Section 15's ("Never
directly convert every extracted keyword into a graded concept" /
"Never directly convert every extracted keyword into a separate topic"),
because rubric concept extraction from a reference answer and syllabus
topic extraction from unit text are the same underlying problem applied
to different input text. `extract_candidate_topics_per_unit` in
particular already handles both prose reference answers ("Machine
Learning is a subset of AI...") and list-style ones ("Key points:
- Supervised Learning\\n- Unsupervised Learning").

What's intentionally NOT auto-generated here, and why: acceptablePhrases
beyond the concept's own display name, and a free-text description.
Both of the spec's own worked examples for these (Section 21) are
fluent, human-authored paraphrases/explanations -- genuinely generating
those without an LLM (explicitly disallowed, Section 5) would mean
guessing at wording no one actually used in the reference answer. The
teacher is expected to add both during rubric review (Section 19: "The
teacher must be able to modify the rubric").
"""

from __future__ import annotations

import re
from typing import Callable, Optional

from app.core.config import settings
from app.engines.blueprint.allocation import allocate_marks
from app.engines.rubric.overlap import build_overlap_warnings
from app.engines.rubric.validation import validate_rubric_generation_request
from app.engines.syllabus.topic_extraction import extract_candidate_topics_per_unit
from app.engines.syllabus.topic_normalization import merge_lexical_duplicates, title_case_topic

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str, taken: set) -> str:
    base = _SLUG_RE.sub("_", name.lower()).strip("_") or "concept"
    slug = base
    suffix = 2
    while slug in taken:
        slug = f"{base}_{suffix}"
        suffix += 1
    taken.add(slug)
    return slug


def generate_rubric_candidates(request_data: dict, nlp, embed_fn: Optional[Callable] = None) -> dict:
    validated = validate_rubric_generation_request(request_data)
    reference_answer = validated["referenceAnswer"]
    total_marks = validated["totalMarks"]

    # Extraction + lexical dedup only -- see module docstring for why
    # semantic near-duplicate merging is deliberately skipped here (that
    # judgment call belongs to the teacher, via the overlap warnings
    # below, not to an automatic merge before they see the rubric).
    candidates = extract_candidate_topics_per_unit(nlp, reference_answer)
    candidates = merge_lexical_duplicates(candidates)

    if not candidates:
        return {
            "concepts": [],
            "overlapWarnings": [],
            "warnings": [
                "No candidate concepts could be extracted from the reference answer. "
                "Try providing a more detailed reference answer, or add concepts manually."
            ],
        }

    taken_ids: set = set()
    average_occurrences = sum(c.occurrences for c in candidates) / len(candidates)

    weights = {}
    concept_meta = []
    for candidate in candidates:
        display_name = title_case_topic(candidate.text)
        concept_id = _slugify(display_name, taken_ids)
        importance = "high" if candidate.occurrences > average_occurrences else "medium"
        weights[concept_id] = candidate.occurrences
        concept_meta.append({"id": concept_id, "name": display_name, "importance": importance})

    marks_by_id = allocate_marks(total_marks, weights, settings.blueprint_marks_granularity) if total_marks else {}

    concepts = [
        {
            "id": meta["id"],
            "name": meta["name"],
            "description": "",
            "marks": marks_by_id.get(meta["id"]) if total_marks else None,
            "importance": meta["importance"],
            "acceptablePhrases": [meta["name"]],
        }
        for meta in concept_meta
    ]

    overlap_warnings = build_overlap_warnings([c["name"] for c in concepts], embed_fn)

    warnings = []
    if not embed_fn:
        warnings.append(
            "The embedding model is not loaded, so semantic overlap detection between concepts was skipped "
            "(only exact/lexical duplicates were removed)."
        )

    return {"concepts": concepts, "overlapWarnings": overlap_warnings, "warnings": warnings}
