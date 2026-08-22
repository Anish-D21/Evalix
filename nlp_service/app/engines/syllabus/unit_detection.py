"""
Unit detection engine (spec Section 14).

Syllabus documents almost always organize content under headings like
"Unit 1", "UNIT-II", "Chapter 3", or "Module 4". This module finds those
heading lines with a deterministic regex (not an ML classifier -- a
syllabus heading format is regular enough that a classifier would be
overkill and less explainable for the academic viva) and splits the
document into units accordingly.

If no heading pattern is found at all, the whole document is treated as
a single default unit -- extraction must degrade gracefully rather than
fail, since not every uploaded syllabus follows a "Unit N" convention.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

# Matches lines like "Unit 1", "UNIT - II", "Unit-3:", "Chapter 4",
# "Module II –", optionally followed by a title on the same line.
# Roman numerals (I, II, III, IV...) and Arabic numerals are both
# accepted since real syllabi use either inconsistently.
_UNIT_HEADING_RE = re.compile(
    r"^\s*(unit|chapter|module)\s*[-:.]?\s*([ivxlcdm]+|\d+)\s*[-:.–—]?\s*(.*)$",
    re.IGNORECASE,
)


@dataclass
class DetectedUnit:
    unit_number: int
    title: str
    text: str


def _clean_title(raw_title: str, fallback: str) -> str:
    title = raw_title.strip(" -:.–—\t")
    return title if title else fallback


def detect_units(text: str) -> List[DetectedUnit]:
    """
    Splits `text` into units by scanning for heading lines. Each unit's
    `text` is everything from that heading up to (but not including) the
    next heading. If zero headings are found, returns a single unit
    covering the entire document.
    """
    lines = text.splitlines()

    heading_indices: List[int] = []
    heading_matches = []
    for i, line in enumerate(lines):
        match = _UNIT_HEADING_RE.match(line)
        if match:
            heading_indices.append(i)
            heading_matches.append(match)

    if not heading_indices:
        stripped = text.strip()
        if not stripped:
            return []
        return [DetectedUnit(unit_number=1, title="General", text=stripped)]

    units: List[DetectedUnit] = []
    for idx, (start_line, match) in enumerate(zip(heading_indices, heading_matches)):
        end_line = heading_indices[idx + 1] if idx + 1 < len(heading_indices) else len(lines)
        # Body excludes the heading line itself -- its content (if any,
        # e.g. "Unit 1: Introduction to ML") is captured as `title`
        # instead, so it isn't ALSO fed into topic extraction as body text.
        body_lines = lines[start_line + 1 : end_line]
        unit_text = "\n".join(body_lines).strip()

        title = _clean_title(match.group(3), fallback=f"Unit {idx + 1}")

        units.append(DetectedUnit(unit_number=idx + 1, title=title, text=unit_text))

    return units
