"""
Double-counting prevention (spec Section 25).

Two distinct guards, both required by the spec's own example:
"Machine Learning" / "Machine" / "Learning" should not exist as
independent graded concepts.

1. RUBRIC-LEVEL: if two rubric concepts' representative embeddings are
   near-duplicates, that's a rubric design problem — flag it as a
   warning so the teacher can merge them, rather than silently double-
   crediting the student for one idea expressed once.

2. EVIDENCE-LEVEL: even for concepts that aren't near-duplicates, the
   same student sentence can legitimately be the *best evidence* for
   more than one concept (e.g. "supervised learning uses labelled data"
   supports both "Supervised Learning" and a labelled-data concept) —
   that's fine and should NOT be suppressed. Suppression only applies
   within an already-flagged overlapping group, where crediting every
   concept in the group from the same evidence would double-count a
   single demonstrated idea.
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np

from app.core.config import settings
from app.engines.evaluation.concept_matching import ConceptMatchResult


def detect_overlapping_concept_groups(
    concepts: List[dict],
    match_results: Dict[str, ConceptMatchResult],
    threshold: float = None,
) -> List[List[str]]:
    """
    Groups rubric concept ids whose representative embeddings are more
    similar than `threshold`. Returns only groups of size >= 2 — a
    concept with no near-duplicate is not included in any group.
    """
    threshold = settings.concept_overlap_threshold if threshold is None else threshold

    ids = [c["id"] for c in concepts if c["id"] in match_results]
    if len(ids) < 2:
        return []

    embeddings = np.stack([match_results[cid].representative_embedding for cid in ids])
    from app.engines.evaluation.embedder import cosine_similarity_matrix

    sims = cosine_similarity_matrix(embeddings, embeddings)

    # Union-find over the threshold graph so transitively-linked concepts
    # (A~B, B~C) end up in one group even if A and C aren't directly similar.
    parent = {cid: cid for cid in ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if sims[i, j] >= threshold:
                union(ids[i], ids[j])

    groups: Dict[str, List[str]] = {}
    for cid in ids:
        groups.setdefault(find(cid), []).append(cid)

    return [g for g in groups.values() if len(g) >= 2]


def apply_overlap_suppression(
    concepts_by_id: Dict[str, dict],
    match_results: Dict[str, ConceptMatchResult],
    overlap_groups: List[List[str]],
) -> Dict[str, bool]:
    """
    Within each overlapping group, only the concept with the strongest
    evidence keeps full credit eligibility; the rest are marked
    suppressed (their score will be reported as 0 with an explanatory
    note, since crediting them would reward the same sentence twice for
    what is effectively one concept).

    Returns {concept_id: suppressed_bool} for every concept in a group;
    concepts outside any group are not included (never suppressed).
    """
    suppressed: Dict[str, bool] = {}

    for group in overlap_groups:
        # Rank by evidence strength; ties broken by declared marks so the
        # higher-value concept in the rubric wins.
        ranked = sorted(
            group,
            key=lambda cid: (match_results[cid].best_similarity, concepts_by_id[cid].get("marks", 0)),
            reverse=True,
        )
        winner = ranked[0]
        for cid in group:
            suppressed[cid] = cid != winner

    return suppressed
