"""
Concept-level matching engine.

Implements spec Section 22's core idea: each rubric concept is matched
against the student's sentences using semantic embeddings, not keywords.
A concept is represented by several "anchor texts" (its name, its
description, and every teacher-supplied acceptable phrase) so that any
reasonable paraphrase of the concept can be recognized — this is what
lets the system tolerate paraphrasing (Section 4) instead of demanding
exact wording.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np

from app.engines.evaluation.embedder import cosine_similarity_matrix


@dataclass
class ConceptMatchResult:
    concept_id: str
    best_similarity: float
    best_sentence_index: Optional[int]
    best_anchor_text: Optional[str]
    representative_embedding: np.ndarray
    # Similarity of each sentence to this concept's best anchor — reused
    # by relationship analysis so it doesn't need to re-embed anything.
    sentence_similarities: np.ndarray = field(repr=False)


def build_anchor_texts(concept: dict) -> List[str]:
    """Every text that can serve as evidence a student demonstrated this
    concept: its name, its description, and teacher-approved paraphrases."""
    anchors = [concept.get("name", ""), concept.get("description", "") or ""]
    anchors.extend(concept.get("acceptablePhrases") or [])
    return [a.strip() for a in anchors if a and a.strip()]


def match_concepts(
    concepts: List[dict],
    sentences: List[str],
    sentence_embeddings: np.ndarray,
    embed_fn,
) -> Dict[str, ConceptMatchResult]:
    """
    For every rubric concept, find its strongest piece of evidence among
    the student's sentences.

    `embed_fn` is a callable(list[str]) -> np.ndarray so this stays
    decoupled from any particular embedder instance.
    """
    results: Dict[str, ConceptMatchResult] = {}

    if not concepts:
        return results

    # Batch-embed every concept's anchor texts in one call rather than
    # one call per concept (Section 22).
    anchor_lists = [build_anchor_texts(c) for c in concepts]
    flat_anchors: List[str] = [a for anchors in anchor_lists for a in anchors]
    flat_embeddings = embed_fn(flat_anchors) if flat_anchors else np.zeros((0, 0), dtype=np.float32)

    cursor = 0
    for concept, anchors in zip(concepts, anchor_lists):
        n = len(anchors)
        concept_embeddings = flat_embeddings[cursor : cursor + n]
        cursor += n

        if n == 0 or sentence_embeddings.shape[0] == 0:
            results[concept["id"]] = ConceptMatchResult(
                concept_id=concept["id"],
                best_similarity=0.0,
                best_sentence_index=None,
                best_anchor_text=None,
                representative_embedding=np.zeros((flat_embeddings.shape[1] if flat_embeddings.size else 0,)),
                sentence_similarities=np.zeros((len(sentences),)),
            )
            continue

        sim_matrix = cosine_similarity_matrix(concept_embeddings, sentence_embeddings)  # (n_anchors, n_sentences)

        # Best evidence sentence per anchor, then take the strongest anchor overall.
        best_per_anchor_sentence_idx = np.argmax(sim_matrix, axis=1)
        best_per_anchor_score = sim_matrix[np.arange(n), best_per_anchor_sentence_idx]
        best_anchor_idx = int(np.argmax(best_per_anchor_score))

        best_similarity = float(best_per_anchor_score[best_anchor_idx])
        best_sentence_index = int(best_per_anchor_sentence_idx[best_anchor_idx])

        # A concept's overall similarity to each sentence, used by
        # relationship analysis: max similarity across all of the
        # concept's anchors for that sentence.
        sentence_similarities = sim_matrix.max(axis=0)

        results[concept["id"]] = ConceptMatchResult(
            concept_id=concept["id"],
            best_similarity=best_similarity,
            best_sentence_index=best_sentence_index,
            best_anchor_text=anchors[best_anchor_idx],
            representative_embedding=concept_embeddings.mean(axis=0),
            sentence_similarities=sentence_similarities,
        )

    return results
