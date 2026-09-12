"""
Question generation request validation (spec Sections 17, 18, 46).

Two different kinds of "invalid" are deliberately kept separate here,
matching how Section 18 itself distinguishes them:

  - A malformed REQUEST (empty topic, unknown Bloom level, non-positive
    marks) is a client bug -- rejected outright with a specific error
    code, exactly like blueprint/validation.py's BlueprintValidationError.

  - A generated QUESTION that's structurally fine but has a quality
    concern (looks like a near-duplicate of another question in the same
    batch, is suspiciously short) is NOT an error -- Section 18 is
    explicit that such questions must still be returned, just "flagged
    for teacher review" rather than rejected. That soft validation lives
    in validation.py's sibling, quality.py, not here.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

from app.engines.blueprint.validation import BLOOM_LEVELS, DIFFICULTY_LEVELS


class QuestionRequestValidationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _canonical_label(value: str, allowed: List[str], field_name: str) -> str:
    lower_allowed = {a.lower(): a for a in allowed}
    canonical = lower_allowed.get(str(value).strip().lower()) if value else None
    if canonical is None:
        raise QuestionRequestValidationError(
            "INVALID_LABEL", f"Unknown {field_name} '{value}'. Expected one of: {', '.join(allowed)}."
        )
    return canonical


def validate_question_request(item: dict, index: int) -> dict:
    """Validates one entry of the `requests` array. Returns a normalized
    dict with canonical bloomLevel/difficulty casing. Raises
    QuestionRequestValidationError (never silently drops or 'fixes' a
    malformed entry) -- the index is included in every error message so
    a batch of many requests points the teacher at exactly which one is
    wrong."""
    topic = (item.get("topic") or "").strip()
    if not topic:
        raise QuestionRequestValidationError("MISSING_TOPIC", f"requests[{index}]: topic must not be empty.")

    topic_b = (item.get("topicB") or "").strip() or None
    if topic_b and topic_b.lower() == topic.lower():
        raise QuestionRequestValidationError(
            "DUPLICATE_TOPIC_PAIR", f"requests[{index}]: topicB must be different from topic."
        )

    bloom_level = _canonical_label(item.get("bloomLevel"), BLOOM_LEVELS, "bloomLevel")
    difficulty = _canonical_label(item.get("difficulty"), DIFFICULTY_LEVELS, "difficulty")

    marks = item.get("marks")
    if marks is None or marks <= 0:
        raise QuestionRequestValidationError("INVALID_MARKS", f"requests[{index}]: marks must be a positive number.")

    question_type = (item.get("questionType") or "descriptive").strip()
    topic_id = item.get("topicId")

    return {
        "topicId": topic_id,
        "topic": topic,
        "topicB": topic_b,
        "bloomLevel": bloom_level,
        "difficulty": difficulty,
        "marks": float(marks),
        "questionType": question_type,
    }


def validate_question_requests(requests_raw) -> List[dict]:
    if not requests_raw:
        raise QuestionRequestValidationError("MISSING_REQUESTS", "requests must include at least one entry.")
    return [validate_question_request(item, i) for i, item in enumerate(requests_raw)]
