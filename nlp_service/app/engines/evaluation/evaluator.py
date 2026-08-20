"""
Evaluator: orchestrates the full pipeline described in spec Section 3.

  Student Answer
    -> preprocessing / sentence segmentation
    -> semantic embeddings (batched, single call)
    -> concept-level matching against the rubric
    -> overlap detection (double-counting prevention)
    -> partial-credit scoring
    -> relationship analysis + conservative misconception detection
    -> weighted final score
    -> explainable, deterministic feedback

Every intermediate result is kept so the final response can cite
evidence for every decision, per Section 33.
"""

from __future__ import annotations

from typing import List

from app.engines.evaluation.concept_matching import match_concepts
from app.engines.evaluation.embedder import embed_texts
from app.engines.evaluation.feedback import generate_feedback
from app.engines.evaluation.negation import build_protected_terms, concept_key_lemmas, sentence_negates_concept
from app.engines.evaluation.overlap import apply_overlap_suppression, detect_overlapping_concept_groups
from app.engines.evaluation.relationship_analysis import analyze_relationships
from app.engines.evaluation.scoring import (
    compute_completeness_ratio,
    compute_concept_coverage_ratio,
    compute_confidence,
    compute_overall_score,
    compute_readability_ratio,
    compute_relationship_ratio,
    compute_semantic_understanding_score,
    score_concepts,
)
from app.engines.preprocessing.text_processing import segment_sentences


def evaluate_answer(request_data: dict, nlp, embedder) -> dict:
    rubric = request_data["rubric"]
    concepts: List[dict] = [c if isinstance(c, dict) else c.model_dump() for c in rubric["concepts"]]
    relationships: List[dict] = [
        r if isinstance(r, dict) else r.model_dump() for r in (rubric.get("relationships") or [])
    ]
    total_marks = float(rubric["totalMarks"])
    student_answer = request_data["studentAnswer"]

    # ---- Preprocessing ----
    sentences = segment_sentences(nlp, student_answer)

    def embed_fn(texts: List[str]):
        return embed_texts(embedder, texts)

    sentence_embeddings = embed_fn(sentences) if sentences else embed_fn([])

    # ---- Concept matching ----
    match_results = match_concepts(concepts, sentences, sentence_embeddings, embed_fn)

    # ---- Negation / contradiction detection (must run BEFORE scoring:
    # a negated concept must never receive normal similarity-based credit,
    # no matter how high the raw MiniLM similarity is -- e.g. "trains a
    # model without labelled data" is semantically close to "labelled
    # data" while explicitly denying it). ----
    protected_terms = build_protected_terms(concepts)
    negated_concepts: dict = {}
    for concept in concepts:
        cid = concept["id"]
        match = match_results.get(cid)
        if match and match.best_sentence_index is not None and match.best_sentence_index < len(sentences):
            evidence_sentence = sentences[match.best_sentence_index]
            concept_lemmas = concept_key_lemmas(nlp, concept)
            negated, reasons = sentence_negates_concept(nlp, evidence_sentence, concept_lemmas, protected_terms)
            if negated:
                negated_concepts[cid] = reasons

    # ---- Double-counting prevention ----
    overlap_groups = detect_overlapping_concept_groups(concepts, match_results)
    suppressed = apply_overlap_suppression({c["id"]: c for c in concepts}, match_results, overlap_groups)
    overlap_winner_by_suppressed = {}
    for group in overlap_groups:
        winner = next(cid for cid in group if not suppressed.get(cid, False))
        for cid in group:
            if suppressed.get(cid):
                overlap_winner_by_suppressed[cid] = next(
                    c["name"] for c in concepts if c["id"] == winner
                )

    rubric_warnings = [
        "Concepts "
        + ", ".join(next(c["name"] for c in concepts if c["id"] == cid) for cid in group)
        + " appear to be near-duplicates of each other. Consider merging them in the rubric — "
        "only one was credited per matching sentence to avoid double-counting."
        for group in overlap_groups
    ]

    # ---- Scoring ----
    concept_scores = score_concepts(
        concepts, match_results, sentences, suppressed, overlap_winner_by_suppressed, negated_concepts
    )
    concept_coverage_ratio = compute_concept_coverage_ratio(concept_scores)
    concept_coverage_score = round(concept_coverage_ratio * total_marks, 2)

    # ---- Relationship analysis + misconception detection ----
    relationship_results, misconceptions = analyze_relationships(relationships, concepts, match_results, sentences, nlp)
    relationship_ratio = compute_relationship_ratio(relationship_results)
    relationship_score = round(relationship_ratio * 100, 1)

    # ---- Supplementary metrics ----
    completeness_ratio = compute_completeness_ratio(student_answer, total_marks)
    readability_ratio = compute_readability_ratio(sentences)
    semantic_understanding_score = compute_semantic_understanding_score(concept_scores)

    overall_score = compute_overall_score(
        concept_coverage_ratio, relationship_ratio, completeness_ratio, readability_ratio, total_marks
    )
    # A single 0..1 ratio for feedback tone selection.
    overall_ratio = overall_score / total_marks if total_marks > 0 else 0.0

    confidence = compute_confidence(concept_scores, relationship_results, student_answer, bool(concepts))

    # ---- Feedback ----
    feedback = generate_feedback(concept_scores, relationship_results, misconceptions, overall_ratio)

    def concept_out(c):
        return {
            "id": c.concept_id,
            "name": c.name,
            "marks": c.marks,
            "awardedMarks": c.awarded_marks,
            "similarity": c.similarity,
            "coverage": c.coverage,
            "importance": c.importance,
            "evidence": c.evidence_sentence,
            "suppressedOverlapWith": c.suppressed_overlap_with,
            "negated": c.negated,
            "negationReasons": c.negation_reasons,
        }

    covered = [concept_out(c) for c in concept_scores if c.coverage in ("full", "high_partial")]
    partial = [concept_out(c) for c in concept_scores if c.coverage in ("partial", "low_evidence")]
    # "contradicted" concepts get 0 marks just like "not_covered" ones, but
    # keep a distinct coverage label so the response makes clear WHY no
    # credit was given (explicit negation) rather than reporting them
    # identically to a concept that was simply never mentioned.
    missing = [concept_out(c) for c in concept_scores if c.coverage in ("not_covered", "contradicted")]

    return {
        "overallScore": overall_score,
        "maxScore": total_marks,
        "conceptCoverageScore": concept_coverage_score,
        "relationshipScore": relationship_score,
        "semanticUnderstandingScore": semantic_understanding_score,
        "coveredConcepts": covered,
        "partialConcepts": partial,
        "missingConcepts": missing,
        "relationships": relationship_results,
        "misconceptions": misconceptions,
        "overallFeedback": feedback["overallFeedback"],
        "strengths": feedback["strengths"],
        "improvementAreas": feedback["improvementAreas"],
        "revisionRecommendations": feedback["revisionRecommendations"],
        "confidence": confidence,
        "rubricWarnings": rubric_warnings,
    }
