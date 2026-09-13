"""
Rubric candidate generation request validation (spec Sections 19-21, 46).
"""

from __future__ import annotations


class RubricGenerationValidationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def validate_rubric_generation_request(data: dict) -> dict:
    reference_answer = (data.get("referenceAnswer") or "").strip()
    if not reference_answer:
        raise RubricGenerationValidationError(
            "MISSING_REFERENCE_ANSWER", "referenceAnswer must not be empty."
        )

    total_marks = data.get("totalMarks")
    if total_marks is not None and total_marks <= 0:
        raise RubricGenerationValidationError(
            "INVALID_TOTAL_MARKS", "totalMarks must be a positive number when provided."
        )

    return {
        "referenceAnswer": reference_answer,
        "totalMarks": float(total_marks) if total_marks is not None else None,
    }
