"""
Preprocessing engine: text normalization and sentence segmentation.

This is the first stage of the evaluation pipeline described in spec
Section 3. Kept deliberately simple and deterministic — normalization
must not alter meaning, only clean up whitespace/casing artifacts before
segmentation and embedding.
"""

from __future__ import annotations

import re
from typing import List

_WHITESPACE_RE = re.compile(r"\s+")


def normalize_text(text: str) -> str:
    """Collapse whitespace and strip; preserves punctuation and casing
    since spaCy's sentence segmenter and the embedding model both use
    those cues."""
    if not text:
        return ""
    return _WHITESPACE_RE.sub(" ", text).strip()


def segment_sentences(nlp, text: str) -> List[str]:
    """
    Split normalized text into sentences using spaCy's dependency-parse-
    based sentence boundary detection (more reliable than naive regex
    splitting on '.', which breaks on abbreviations like "e.g." or "AI.").

    Filters out empty fragments and single-character noise left over from
    stray punctuation.
    """
    normalized = normalize_text(text)
    if not normalized:
        return []

    doc = nlp(normalized)
    sentences = [sent.text.strip() for sent in doc.sents]
    return [s for s in sentences if len(s) > 1]
