"""
Negation / contradiction detection (extends spec Sections 27-28).

The relationship-level negation check that shipped in Phase 1 only
caught spaCy's `neg` dependency label (which covers "not"/"n't"/"never").
That misses two common ways students contradict a concept without using
"not":

  - a negating preposition:  "trains a model WITHOUT labelled data"
  - morphological negation:  "learns from UNlabelled examples"

This module adds both, still entirely via deterministic, explainable
linguistic rules (dependency parse + lemma matching) — no keyword-only
matching, no ML classifier, no change to the semantic embedding pipeline
itself. It's used in two places:

  1. Concept scoring: a concept's best-evidence sentence is checked for
     whether the sentence structurally negates that concept's own terms.
     If so, the concept must not receive ordinary similarity-based
     credit no matter how high the raw MiniLM similarity is.
  2. Relationship analysis: broadens the existing negation check the
     same way, so "without labelled data" and "unlabelled data" are
     caught, not just "not"/"never".

Guard against a real false-positive trap in this exact domain: "un-" is
also how legitimate ML terminology is formed ("Unsupervised Learning"
is not a negation of "Supervised Learning"). The morphological check is
therefore skipped for any word that is itself one of the rubric's own
concept terms (see `build_protected_terms`).
"""

from __future__ import annotations

from typing import Iterable, List, Set, Tuple

# Prepositions that negate/exclude their object ("without X", "lacking X").
_NEGATING_PREPOSITIONS = {"without", "lacking", "excluding", "minus", "absent"}

# Prefixes that can form a morphological negation of an adjective/noun/verb
# ("unlabelled", "non-linear", "disconnected"). Kept short and conservative
# on purpose — this is only trusted when the stripped form also matches a
# concept's own vocabulary (see `sentence_negates_concept`), so an
# over-inclusive prefix list here is safe: it can't fire on unrelated words.
_NEGATING_PREFIXES = ("un", "non", "dis", "im", "il", "ir")

_STEM_MATCH_PREFIX_LEN = 4  # "labell" vs "label" -> compare first 4 chars


def _subtree_lemmas(token, exclude_token=None) -> Set[str]:
    """Returns both lemma AND raw lowercased text for every content word in
    the subtree. Both forms are collected because spaCy's lemmatizer is
    POS-dependent and can normalize the same word differently depending on
    context -- e.g. "labelled" lemmatizes to "label" inside a full clause
    ("...uses labelled data") but stays "labelled" when parsed as a bare
    noun phrase ("Labelled Data", as a rubric concept name typically is).
    Matching on lemma alone would silently miss that overlap; matching on
    either form closes the gap without weakening precision."""
    exclude_ids: Set[int] = set()
    if exclude_token is not None:
        exclude_ids = {t.i for t in exclude_token.subtree}
    forms = set()
    for t in token.subtree:
        if t.i in exclude_ids or not t.is_alpha or t.is_stop:
            continue
        forms.add(t.lemma_.lower())
        forms.add(t.text.lower())
    return forms


def structural_negation_lemmas(doc) -> Tuple[Set[str], List[str]]:
    """
    Finds clause-level negation ("not"/"never"), negating prepositions
    ("without X"), and "instead of X" constructions. Returns the set of
    lemmas that fall within a negated scope, plus human-readable reasons
    for explainability.
    """
    negated_lemmas: Set[str] = set()
    reasons: List[str] = []

    for token in doc:
        # 1. Clausal negation: "not" / "n't" / "never" all get dep_ == "neg".
        if token.dep_ == "neg":
            head = token.head
            subject = next((c for c in head.children if c.dep_ in ("nsubj", "nsubjpass")), None)
            scope = _subtree_lemmas(head, exclude_token=subject)
            if scope:
                negated_lemmas |= scope
                reasons.append(f"clausal negation ('{token.text}') scoping '{head.text}'")

        # 2. Negating preposition: "without labelled data", "lacking evidence".
        if token.pos_ == "ADP" and token.lemma_.lower() in _NEGATING_PREPOSITIONS:
            pobj = next((c for c in token.children if c.dep_ == "pobj"), None)
            if pobj is not None:
                scope = _subtree_lemmas(pobj)
                if scope:
                    negated_lemmas |= scope
                    reasons.append(f"negating preposition ('{token.text}') scoping '{pobj.text}'")

        # 3. "instead of X" -- X is the rejected alternative.
        if token.lemma_.lower() == "instead":
            of_token = next(
                (t for t in doc[token.i : min(token.i + 4, len(doc))] if t.lemma_.lower() == "of" and t.pos_ == "ADP"),
                None,
            )
            if of_token is not None:
                pobj = next((c for c in of_token.children if c.dep_ == "pobj"), None)
                if pobj is not None:
                    scope = _subtree_lemmas(pobj)
                    if scope:
                        negated_lemmas |= scope
                        reasons.append(f"'instead of' rejects '{pobj.text}'")

    return negated_lemmas, reasons


def build_protected_terms(concepts: Iterable[dict]) -> Set[str]:
    """
    Every individual word appearing in any rubric concept's name,
    lowercased. Used to stop the morphological negation check from
    treating a legitimate rubric term (e.g. "Unsupervised" in
    "Unsupervised Learning") as a negation of a different concept
    (e.g. "Supervised Learning") just because it happens to start
    with "un-".
    """
    terms: Set[str] = set()
    for c in concepts:
        for word in (c.get("name") or "").lower().split():
            terms.add(word.strip(".,"))
    return terms


def concept_key_lemmas(nlp, concept: dict) -> Set[str]:
    """Content-word lemmas AND raw lowercased text drawn from a concept's
    own name/description/acceptablePhrases -- the vocabulary a negation
    must overlap with to count as negating THIS concept. Both forms are
    kept for the same reason as `_subtree_lemmas`: lemmatization of a
    bare concept name (no surrounding clause) can differ from
    lemmatization of the same word inside a full sentence."""
    text = " ".join(
        filter(
            None,
            [concept.get("name", ""), concept.get("description", "") or "", *(concept.get("acceptablePhrases") or [])],
        )
    )
    doc = nlp(text)
    forms = set()
    for t in doc:
        if t.is_alpha and not t.is_stop and len(t.lemma_) > 2:
            forms.add(t.lemma_.lower())
            forms.add(t.text.lower())
    return forms


def sentence_negates_concept(nlp, sentence: str, concept_lemmas: Set[str], protected_terms: Set[str]) -> Tuple[bool, List[str]]:
    """
    True if `sentence` structurally negates the given concept's own
    vocabulary -- via clausal negation, a negating preposition, an
    "instead of" construction, or a morphological negation (e.g.
    "unlabelled" negating "labelled") -- guarded so a legitimate rubric
    term is never mistaken for a negation of a different concept.
    """
    doc = nlp(sentence)
    negated_lemmas, reasons = structural_negation_lemmas(doc)
    overlap = negated_lemmas & concept_lemmas
    fired_reasons = list(reasons) if overlap else []

    for token in doc:
        if not token.is_alpha:
            continue
        lower = token.text.lower()
        if lower in protected_terms:
            continue  # e.g. "unsupervised" is its own rubric term, not a negator
        for prefix in _NEGATING_PREFIXES:
            if lower.startswith(prefix) and len(lower) > len(prefix) + 2:
                stripped = lower[len(prefix) :]
                if any(
                    stripped[:_STEM_MATCH_PREFIX_LEN] == lemma[:_STEM_MATCH_PREFIX_LEN]
                    for lemma in concept_lemmas
                    if len(lemma) >= _STEM_MATCH_PREFIX_LEN
                ):
                    overlap.add(token.lemma_.lower())
                    fired_reasons.append(f"morphological negation: '{token.text}' negates concept term '{stripped}'")
                break

    return bool(overlap), fired_reasons
