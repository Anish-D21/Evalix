"""
Overlap warnings for rubric candidate concepts (spec Section 25).

Deliberately different from syllabus topic extraction's semantic merge
(engines/syllabus/topic_normalization.semantic_merge_candidates): there,
near-duplicate topics are silently merged because a topic LIST is just
meant to be clean and non-redundant. Here, Section 25 is explicit that
overlapping rubric concepts should be flagged for the TEACHER to decide
on ("warn the teacher during rubric creation"), not merged out from
under them before they ever see the rubric -- collapsing two candidate
concepts automatically would remove the teacher's ability to review and
choose which one (if either) belongs in the final rubric.

Reuses the same cosine-similarity + union-find pattern as
engines/evaluation/overlap.py, but works directly on concept name
embeddings rather than that module's ConceptMatchResult (which carries
student-answer-matching state that doesn't apply here).
"""

from __future__ import annotations

from typing import Callable, List, Optional

from app.core.config import settings
from app.engines.evaluation.embedder import cosine_similarity_matrix


def find_overlapping_concept_groups(
    concept_names: List[str], embed_fn: Optional[Callable], threshold: float = None
) -> List[List[int]]:
    """Returns groups (each a list of concept indices) whose name
    embeddings are more similar than `threshold`. Empty when there are
    fewer than two concepts or no embedder is available (graceful
    degradation, same pattern as syllabus extraction's semantic pass)."""
    if embed_fn is None or len(concept_names) < 2:
        return []

    threshold = settings.concept_overlap_threshold if threshold is None else threshold

    embeddings = embed_fn(concept_names)
    if embeddings.shape[0] != len(concept_names):
        return []

    sims = cosine_similarity_matrix(embeddings, embeddings)

    n = len(concept_names)
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

    for i in range(n):
        for j in range(i + 1, n):
            if sims[i, j] >= threshold:
                union(i, j)

    groups: dict[int, List[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    return [g for g in groups.values() if len(g) >= 2]


def build_overlap_warnings(concept_names: List[str], embed_fn: Optional[Callable]) -> List[str]:
    groups = find_overlapping_concept_groups(concept_names, embed_fn)
    return [
        "Concepts "
        + ", ".join(f"'{concept_names[i]}'" for i in group)
        + " appear to overlap strongly. Consider merging or clarifying the distinction between them "
        "before finalizing the rubric."
        for group in groups
    ]
