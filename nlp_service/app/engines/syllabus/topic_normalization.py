"""
Topic normalization and deduplication (spec Section 15).

Two layers, matching the spec's own worked example:
  "machine learning" / "Machine Learning" / "machine-learning"
  should all become: "Machine Learning"

1. LEXICAL normalization (`normalize_topic_phrase`): casing, hyphens,
   punctuation, leading articles -- cheap, deterministic, no model
   needed. Used as the dedup key everywhere.
2. SEMANTIC near-duplicate merging (`semantic_merge_candidates`):
   optional, reuses the same embedding + cosine-similarity + union-find
   pattern already used for rubric concept overlap detection
   (engines/evaluation/overlap.py) -- catches phrasing variants lexical
   normalization can't, e.g. "Neural Nets" vs "Neural Networks". Skipped
   gracefully when the embedding model isn't loaded, since candidate
   extraction must still work in degraded mode (Section 6).
"""

from __future__ import annotations

import re
from typing import List

from app.core.config import settings
from app.engines.syllabus.models import TopicCandidate

_PUNCT_RE = re.compile(r"[^\w\s]")
_WHITESPACE_RE = re.compile(r"\s+")
_LEADING_ARTICLES = ("a ", "an ", "the ")


def strip_leading_article(phrase: str) -> str:
    """Removes a leading 'a '/'an '/'the ' (case-insensitive), preserving
    the casing of the rest of the phrase. Used on both the normalized
    dedup key and the human-facing display form."""
    lower = phrase.lower()
    for article in _LEADING_ARTICLES:
        if lower.startswith(article):
            return phrase[len(article) :]
    return phrase


def normalize_topic_phrase(phrase: str) -> str:
    """Lowercase, hyphens/underscores -> spaces, strip punctuation,
    collapse whitespace, drop a leading article. This is the dedup key
    used to merge surface-form variants of the same topic."""
    text = phrase.strip().lower().replace("-", " ").replace("_", " ")
    text = _PUNCT_RE.sub("", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return strip_leading_article(text)


def title_case_topic(phrase: str) -> str:
    """Display-form casing: capitalize each word, keep short all-caps
    acronyms as-is (AI, ML, NLP), lowercase minor connector words unless
    they're first."""
    small_words = {"of", "and", "the", "in", "on", "for", "to", "a", "an", "with", "or"}
    words = phrase.split()
    out = []
    for i, word in enumerate(words):
        if word.isupper() and 2 <= len(word) <= 5:
            out.append(word)
        elif word.lower() in small_words and i != 0:
            out.append(word.lower())
        else:
            out.append(word[:1].upper() + word[1:])
    return " ".join(out)


def merge_lexical_duplicates(candidates: List[TopicCandidate]) -> List[TopicCandidate]:
    """Merges candidates that normalize to the same lexical key (e.g.
    across different units), combining occurrence counts and keeping the
    most-frequently-seen display form."""
    merged: dict[str, TopicCandidate] = {}

    for candidate in candidates:
        key = normalize_topic_phrase(candidate.text)
        if not key:
            continue
        if key in merged:
            existing = merged[key]
            # Prefer whichever display form has been seen more; ties keep
            # the first one (stable, deterministic).
            display = existing.text if existing.occurrences >= candidate.occurrences else candidate.text
            merged[key] = TopicCandidate(
                text=display, normalized=key, occurrences=existing.occurrences + candidate.occurrences
            )
        else:
            merged[key] = TopicCandidate(text=candidate.text, normalized=key, occurrences=candidate.occurrences)

    result = list(merged.values())
    result.sort(key=lambda c: (-c.occurrences, c.text.lower()))
    return result


def semantic_merge_candidates(embed_fn, candidates: List[TopicCandidate], threshold: float = None) -> List[TopicCandidate]:
    """
    Best-effort second dedup pass using embeddings, for near-duplicates
    lexical normalization can't catch (e.g. "Neural Nets" vs "Neural
    Networks"). `embed_fn` is a callable(list[str]) -> np.ndarray;
    callers pass None to skip this step entirely (e.g. when the
    embedding model failed to load) rather than erroring.
    """
    if embed_fn is None or len(candidates) < 2:
        return candidates

    import numpy as np

    from app.engines.evaluation.embedder import cosine_similarity_matrix

    threshold = settings.topic_overlap_threshold if threshold is None else threshold

    texts = [c.text for c in candidates]
    embeddings = embed_fn(texts)
    sims = cosine_similarity_matrix(embeddings, embeddings)

    parent = list(range(len(candidates)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            if sims[i, j] >= threshold:
                union(i, j)

    groups: dict[int, List[int]] = {}
    for i in range(len(candidates)):
        groups.setdefault(find(i), []).append(i)

    merged: List[TopicCandidate] = []
    for indices in groups.values():
        group_candidates = [candidates[i] for i in indices]
        # Keep the most frequent display form in the group; sum occurrences.
        winner = max(group_candidates, key=lambda c: c.occurrences)
        total_occurrences = sum(c.occurrences for c in group_candidates)
        merged.append(TopicCandidate(text=winner.text, normalized=winner.normalized, occurrences=total_occurrences))

    merged.sort(key=lambda c: (-c.occurrences, c.text.lower()))
    return merged
