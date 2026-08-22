"""
Topic candidate extraction (spec Section 15).

Uses spaCy's noun-chunk parser rather than unigram keyword/frequency
extraction. This is the deliberate fix for exactly the failure mode the
spec calls out by name: naive keyword extraction on "Machine Learning is
a subset of Artificial Intelligence that learns from data" would yield
["machine", "learning", "subset", "artificial", "intelligence", "data"]
as separate candidates. Noun chunks keep "Machine Learning" and
"Artificial Intelligence" intact as single phrases, because that's how
the dependency parser already groups them — no separate multi-word
n-gram stitching logic is needed.

Candidate extraction is explicitly NOT the final rubric/topic list here
either (Section 15/20's point applies to both): this returns ranked
candidates for a teacher to review, edit, approve, or discard later.
"""

from __future__ import annotations

from collections import Counter
from typing import List

from app.core.config import settings
from app.engines.syllabus.models import TopicCandidate
from app.engines.syllabus.topic_normalization import normalize_topic_phrase, strip_leading_article


def extract_candidate_topics(nlp, text: str) -> List[TopicCandidate]:
    """
    Returns deduplicated, frequency-ranked topic candidates from a block
    of unit text. Two chunks that normalize to the same phrase (casing,
    hyphenation, whitespace) are merged into one candidate with a
    combined occurrence count.
    """
    if not text or not text.strip():
        return []

    doc = nlp(text)

    counts: Counter[str] = Counter()
    display_forms: dict[str, str] = {}

    for chunk in doc.noun_chunks:
        content_tokens = [t for t in chunk if not t.is_stop and t.is_alpha]
        if not content_tokens:
            continue  # e.g. "it", "this", pure-stopword chunks

        normalized = normalize_topic_phrase(chunk.text)
        if len(normalized) < settings.min_topic_phrase_length:
            continue

        counts[normalized] += 1
        # Keep the first-seen display form (usually the more natural
        # casing, since syllabus headings tend to introduce a term before
        # it's reused in lowercase running text). Leading articles are
        # stripped from the display form too, not just the dedup key,
        # so a chunk like "a subset" doesn't display as "A Subset".
        if normalized not in display_forms:
            display_forms[normalized] = strip_leading_article(chunk.text.strip())

    candidates = [
        TopicCandidate(text=display_forms[norm], normalized=norm, occurrences=count)
        for norm, count in counts.items()
    ]
    candidates.sort(key=lambda c: (-c.occurrences, c.text.lower()))
    return candidates
