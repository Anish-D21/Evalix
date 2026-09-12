"""
Generated-question quality checks (spec Section 18).

"Invalid questions should be flagged for teacher review. The system
must NOT claim generated questions are guaranteed correct. Teacher
approval is required before publishing."

Everything here is INFORMATIONAL, never a hard rejection: a question
that fails one of these checks is still returned in the response, with
`valid: False` and a list of `issues` explaining why -- the caller (a
later phase's teacher-review UI) decides what to do with that, this
engine never silently drops a generated question.
"""

from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np

from app.core.config import settings
from app.engines.evaluation.embedder import cosine_similarity_matrix, embed_texts


def _normalize_for_exact_match(text: str) -> str:
    return " ".join(text.lower().split()).rstrip(".!?")


def find_duplicate_groups(texts: List[str], embed_fn=None) -> List[List[int]]:
    """
    Returns groups (each a list of question indices) of texts considered
    duplicates of one another within the same batch.

    Exact (lexically normalized) duplicates are always detected, with no
    embedding model required -- two requests for the same topic/Bloom/
    difficulty/marks combination deterministically render identical text
    (see templates.py), so this is the common case in practice. A
    semantic near-duplicate pass runs additionally when `embed_fn` is
    available (e.g. "Explain Machine Learning with a suitable example."
    vs "Describe how Machine Learning works." -- different templates,
    same underlying ask), mirroring the graceful-degradation pattern
    used for syllabus topic merging in Phase 2.
    """
    n = len(texts)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    normalized = [_normalize_for_exact_match(t) for t in texts]
    for i in range(n):
        for j in range(i + 1, n):
            if normalized[i] == normalized[j]:
                union(i, j)

    if embed_fn is not None and n > 1:
        embeddings = embed_fn(texts)
        if embeddings.shape[0] == n:
            sims = cosine_similarity_matrix(embeddings, embeddings)
            threshold = settings.question_duplicate_similarity_threshold
            for i in range(n):
                for j in range(i + 1, n):
                    if sims[i, j] >= threshold:
                        union(i, j)

    groups: Dict[int, List[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    return [g for g in groups.values() if len(g) >= 2]


def validate_generated_question(
    question: dict, index: int, duplicate_groups: List[List[int]]
) -> dict:
    """Soft validation for one already-generated question. Returns
    {"valid": bool, "issues": [str, ...]} -- never raises."""
    issues: List[str] = []
    text = question["text"]

    if not text or not text.strip():
        issues.append("Generated question text is empty.")

    word_count = len(text.split())
    if word_count < settings.min_question_word_count:
        issues.append(f"Question text is unusually short ({word_count} words).")

    if text and not text.strip()[0].isupper():
        issues.append("Question text does not start with a capital letter.")

    if text and text.strip()[-1] not in ".?!":
        issues.append("Question text does not end with terminal punctuation.")

    if "{" in text or "}" in text:
        issues.append("Question text contains an unfilled template placeholder.")

    topic = question.get("topicName") or ""
    if topic and topic.lower() not in text.lower():
        issues.append("Question text does not appear to reference its topic.")

    if question.get("marks", 0) <= 0:
        issues.append("Marks must be a positive number.")

    for group in duplicate_groups:
        if index in group:
            others = [i for i in group if i != index]
            issues.append(f"Possible duplicate of question(s) at index {', '.join(str(i) for i in others)}.")
            break

    return {"valid": len(issues) == 0, "issues": issues}
