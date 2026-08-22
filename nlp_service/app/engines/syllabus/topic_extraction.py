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

---
Two extraction modes, used for two genuinely different kinds of
syllabus content:

  extract_candidate_topics()          -- PROSE. A block of descriptive
      sentences ("Machine Learning is a subset of AI that learns from
      data."). Noun-chunk parsing over the whole block is exactly right
      here: the dependency parser has real sentence structure to work
      with, and reliably keeps multi-word terms intact.

  extract_candidate_topics_per_unit() -- LIST-STYLE. Many real syllabi
      instead give one topic per line, with no sentence punctuation at
      all ("Named Entity Recognition" / "Word Embeddings", one per
      line). Running noun-chunk parsing over that -- whether on the
      whole blob or even line-by-line -- misparses it: with no
      punctuation to signal where one item ends and the next begins,
      the dependency parser guesses wrong (e.g. "Text Preprocessing
      Word" / "Embeddings Named" / "Entity Recognition" from three
      separate one-line topics), and even in isolation a short,
      verbless line like "Introduction to Artificial Intelligence" or
      "Named Entity Recognition" doesn't chunk the way its surface
      wording implies. The fix is to never hand a short, unpunctuated
      line to the parser for phrase-boundary decisions at all -- treat
      the whole line as one topic verbatim instead, and only fall back
      to noun-chunk parsing for lines that read as actual prose
      (end in sentence punctuation, or are long enough that they're
      unlikely to be a single topic title).
"""

from __future__ import annotations

import re
from collections import Counter
from typing import List

from app.core.config import settings
from app.engines.preprocessing.text_processing import normalize_text
from app.engines.syllabus.models import TopicCandidate
from app.engines.syllabus.topic_normalization import normalize_topic_phrase, strip_leading_article

# Strips a leading list marker ("- ", "* ", "• ", "1.", "2)") before a line
# is judged/used as a topic, so bulleted syllabi work the same as plain
# one-topic-per-line ones.
_BULLET_PREFIX_RE = re.compile(r"^(?:[-*\u2022]+\s*|\d+[.)]\s*)")

# A line ending in one of these is prose (a sentence), not a topic title.
_SENTENCE_TERMINAL_RE = re.compile(r"[.!?]\s*$")


def extract_candidate_topics(nlp, text: str) -> List[TopicCandidate]:
    """
    Returns deduplicated, frequency-ranked topic candidates from a block
    of PROSE text, via spaCy noun-chunk parsing. Two chunks that
    normalize to the same phrase (casing, hyphenation, whitespace) are
    merged into one candidate with a combined occurrence count.

    Not line-aware -- callers that have list-style, one-topic-per-line
    input should use `extract_candidate_topics_per_unit` instead, which
    delegates to this function only for the lines that are actually
    prose.
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


def _is_list_item_line(line: str) -> bool:
    """A line reads as a standalone topic title (not a sentence) if it
    doesn't end in sentence punctuation and isn't implausibly long for a
    single topic. Deliberately NOT based on verb detection: spaCy's POS
    tagger mistags words like "Named" (as in "Named Entity Recognition")
    as a verb depending on context, which would misclassify exactly the
    kind of short multi-word title this function exists to protect."""
    if not line:
        return False
    if _SENTENCE_TERMINAL_RE.search(line):
        return False
    return 0 < len(line.split()) <= settings.max_topic_list_item_words


def extract_candidate_topics_per_unit(nlp, unit_text: str) -> List[TopicCandidate]:
    """
    Splits `unit_text` into its ORIGINAL lines (call this on raw,
    not-yet-whitespace-normalized unit text -- collapsing newlines
    before this runs would recreate the exact bug this function fixes)
    and processes each line independently:

      - A short, unpunctuated line is treated as ONE topic, verbatim
        (after normalization/title-casing) -- never handed to the noun-
        chunk parser, so "Named Entity Recognition" and "Introduction to
        Artificial Intelligence" each stay intact as a single topic
        instead of being split.
      - A line that reads as prose (ends in . / ! / ?, or is too long to
        plausibly be one topic title) is passed to
        `extract_candidate_topics` unchanged, preserving the existing,
        already-correct behavior for descriptive syllabus text.

    `str.splitlines()` is used throughout, which correctly handles
    Windows CRLF ("\\r\\n"), old Mac ("\\r"), and Unix ("\\n") line
    endings uniformly.
    """
    if not unit_text or not unit_text.strip():
        return []

    counts: Counter[str] = Counter()
    display_forms: dict[str, str] = {}

    def record(normalized: str, display: str) -> None:
        if len(normalized) < settings.min_topic_phrase_length:
            return
        counts[normalized] += 1
        if normalized not in display_forms:
            display_forms[normalized] = display

    for raw_line in unit_text.splitlines():
        line = _BULLET_PREFIX_RE.sub("", raw_line.strip()).strip()
        if not line:
            continue

        if _is_list_item_line(line):
            normalized = normalize_topic_phrase(line)
            if not normalized:
                continue
            record(normalized, strip_leading_article(line))
        else:
            for candidate in extract_candidate_topics(nlp, normalize_text(line)):
                record(candidate.normalized, candidate.text)

    candidates = [
        TopicCandidate(text=display_forms[norm], normalized=norm, occurrences=count)
        for norm, count in counts.items()
    ]
    candidates.sort(key=lambda c: (-c.occurrences, c.text.lower()))
    return candidates
