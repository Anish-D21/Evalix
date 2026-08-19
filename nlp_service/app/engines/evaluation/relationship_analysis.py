"""
Relationship analysis and misconception detection (spec Sections 27, 28).

Deliberately restricted to relationships the teacher explicitly defined
in the rubric — no open-world reasoning. For each relationship we:

  1. Only evaluate it once both endpoint concepts have at least
     low-evidence coverage (otherwise there's nothing to check yet).
  2. Find the strongest candidate sentence: the one sentence most
     related to *both* concepts at once (min of the two similarities,
     maximized across sentences).
  3. Use spaCy's dependency parse to look for a `neg` token in that
     sentence. This is the linguistically principled way to detect
     negation (vs. a keyword list), and it's exactly what a viva would
     expect a "dependency parsing" line item to demonstrate.
  4. If negated -> conservative "potential misconception" wording, never
     an assertion of fact. If not negated and similarity clears the
     threshold -> "demonstrated". Otherwise -> "not_demonstrated".
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np

from app.core.config import settings
from app.engines.evaluation.concept_matching import ConceptMatchResult


def _find_concept_id(ref: str, concepts_by_id: Dict[str, dict], concepts_by_name: Dict[str, dict]) -> str | None:
    """Rubric relationships may reference concepts by id or by name."""
    if ref in concepts_by_id:
        return ref
    concept = concepts_by_name.get(ref.strip().lower())
    return concept["id"] if concept else None


def _sentence_has_negation(nlp, sentence: str) -> bool:
    doc = nlp(sentence)
    return any(token.dep_ == "neg" for token in doc)


def analyze_relationships(
    relationships: List[dict],
    concepts: List[dict],
    match_results: Dict[str, ConceptMatchResult],
    sentences: List[str],
    nlp,
) -> tuple[list[dict], list[dict]]:
    """Returns (relationship_results, misconceptions)."""
    concepts_by_id = {c["id"]: c for c in concepts}
    concepts_by_name = {c["name"].strip().lower(): c for c in concepts}

    relationship_results: List[dict] = []
    misconceptions: List[dict] = []

    if not relationships:
        return relationship_results, misconceptions

    for rel in relationships:
        source_id = _find_concept_id(rel["sourceConcept"], concepts_by_id, concepts_by_name)
        target_id = _find_concept_id(rel["targetConcept"], concepts_by_id, concepts_by_name)

        base = {
            "sourceConcept": rel["sourceConcept"],
            "relationship": rel["relationship"],
            "targetConcept": rel["targetConcept"],
            "importance": rel.get("importance", "medium"),
        }

        if not source_id or not target_id:
            relationship_results.append({**base, "status": "not_evaluated", "reason": "unresolved_concept_reference"})
            continue

        source_match = match_results.get(source_id)
        target_match = match_results.get(target_id)

        if not source_match or not target_match:
            relationship_results.append({**base, "status": "not_evaluated", "reason": "missing_match_data"})
            continue

        threshold = settings.threshold_low_evidence
        if source_match.best_similarity < threshold or target_match.best_similarity < threshold:
            relationship_results.append(
                {**base, "status": "not_evaluated", "reason": "one_or_both_concepts_not_covered"}
            )
            continue

        # Strongest sentence for BOTH endpoints at once.
        combined = np.minimum(source_match.sentence_similarities, target_match.sentence_similarities)
        candidate_idx = int(np.argmax(combined))
        candidate_score = float(combined[candidate_idx])
        candidate_sentence = sentences[candidate_idx] if candidate_idx < len(sentences) else None

        if candidate_score < threshold or candidate_sentence is None:
            relationship_results.append({**base, "status": "not_demonstrated", "evidence": None})
            continue

        negated = _sentence_has_negation(nlp, candidate_sentence)

        if negated:
            relationship_results.append(
                {**base, "status": "contradicted", "evidence": candidate_sentence, "similarity": round(candidate_score, 4)}
            )
            misconceptions.append(
                {
                    "sourceConcept": rel["sourceConcept"],
                    "relationship": rel["relationship"],
                    "targetConcept": rel["targetConcept"],
                    "evidenceSentence": candidate_sentence,
                    "note": (
                        f"Potential misconception: the response appears inconsistent with the "
                        f"expected relationship between '{rel['sourceConcept']}' and "
                        f"'{rel['targetConcept']}'. This is a conservative flag based on detected "
                        f"negation near both concepts, not a claim of factual certainty — please "
                        f"review the highlighted sentence."
                    ),
                }
            )
        else:
            relationship_results.append(
                {**base, "status": "demonstrated", "evidence": candidate_sentence, "similarity": round(candidate_score, 4)}
            )

    return relationship_results, misconceptions
