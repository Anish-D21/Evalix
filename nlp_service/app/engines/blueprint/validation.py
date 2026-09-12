"""
Blueprint request validation (spec Sections 16, 46).

Deliberately strict and explicit: invalid input is rejected with a
specific error code and message, never silently "corrected" by
guessing what the teacher meant. The one controlled exception is a
distribution's percentages summing to something close to, but not
exactly, 100 (e.g. 99.9 from how the teacher rounded their own numbers)
-- accepted, but the fact that it wasn't exactly 100 is always reported
back as a warning, never silently absorbed.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

from app.core.config import settings

DIFFICULTY_LEVELS = ["easy", "medium", "hard"]
BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"]


class BlueprintValidationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _normalize_label_keys(raw: Dict[str, float], allowed: List[str], field_name: str) -> Dict[str, float]:
    """Case/whitespace-insensitive lookup against a fixed allowed set
    (used for difficulty and Bloom level labels, which are a closed
    vocabulary per spec Section 16)."""
    result: Dict[str, float] = {}
    lower_allowed = {a.lower(): a for a in allowed}
    for key, value in raw.items():
        canonical = lower_allowed.get(str(key).strip().lower())
        if canonical is None:
            raise BlueprintValidationError(
                "INVALID_LABEL",
                f"Unknown {field_name} label '{key}'. Expected one of: {', '.join(allowed)}.",
            )
        if value is None or value < 0:
            raise BlueprintValidationError(
                "NEGATIVE_PERCENTAGE",
                f"{field_name} percentage for '{key}' must not be negative (got {value}).",
            )
        if canonical in result:
            raise BlueprintValidationError("DUPLICATE_LABEL", f"Duplicate {field_name} label '{canonical}'.")
        result[canonical] = float(value)
    return result


def _validate_percentage_sum(weights: Dict[str, float], field_name: str, warnings: List[str]) -> Dict[str, float]:
    if not weights:
        raise BlueprintValidationError("MISSING_DISTRIBUTION", f"{field_name} must include at least one entry.")

    total = sum(weights.values())
    tolerance = settings.blueprint_percentage_tolerance
    if abs(total - 100.0) > tolerance:
        raise BlueprintValidationError(
            "PERCENTAGE_SUM_INVALID",
            f"{field_name} percentages must sum to 100 (got {total:.2f}, tolerance is ±{tolerance}).",
        )
    if abs(total - 100.0) > 1e-9:
        warnings.append(
            f"{field_name} percentages summed to {total:.2f}, not exactly 100 -- allocation was "
            f"proportionally normalized so totals still come out exact."
        )
    return weights


def _validate_units(units_raw, warnings: List[str]) -> Dict[str, dict]:
    """
    Validates the syllabus-unit weightage list. Keyed internally by
    unitNumber (as a string, to reuse the same label-keyed allocation
    machinery as difficulty/bloom), but each entry keeps its title and
    original unitNumber for the response.
    """
    if not units_raw:
        raise BlueprintValidationError("MISSING_UNITS", "units must include at least one syllabus unit.")

    weights: Dict[str, float] = {}
    meta: Dict[str, dict] = {}
    seen_numbers = set()

    for item in units_raw:
        unit_number = item.get("unitNumber")
        weightage = item.get("weightage")
        title = (item.get("title") or "").strip()

        if unit_number is None or not isinstance(unit_number, int) or unit_number <= 0:
            raise BlueprintValidationError(
                "INVALID_UNIT_NUMBER", f"unitNumber must be a positive integer (got {unit_number!r})."
            )
        if unit_number in seen_numbers:
            raise BlueprintValidationError("DUPLICATE_UNIT", f"Duplicate unitNumber {unit_number} in units.")
        seen_numbers.add(unit_number)

        if weightage is None or weightage < 0:
            raise BlueprintValidationError(
                "NEGATIVE_PERCENTAGE", f"units weightage for unit {unit_number} must not be negative (got {weightage})."
            )

        key = str(unit_number)
        weights[key] = float(weightage)
        meta[key] = {"unitNumber": unit_number, "title": title or f"Unit {unit_number}"}

    weights = _validate_percentage_sum(weights, "units", warnings)
    return weights, meta


def validate_blueprint_request(data: dict) -> Tuple[dict, List[str]]:
    """Returns (validated_data, warnings) or raises BlueprintValidationError."""
    warnings: List[str] = []

    total_marks = data.get("totalMarks")
    total_questions = data.get("totalQuestions")

    if total_marks is None or total_marks <= 0:
        raise BlueprintValidationError("INVALID_TOTAL_MARKS", "totalMarks must be a positive number.")

    if total_questions is None or total_questions <= 0:
        raise BlueprintValidationError("INVALID_TOTAL_QUESTIONS", "totalQuestions must be a positive integer.")
    if float(total_questions) != int(total_questions):
        raise BlueprintValidationError("INVALID_TOTAL_QUESTIONS", "totalQuestions must be a whole number.")

    unit_weights, unit_meta = _validate_units(data.get("units"), warnings)

    difficulty = _normalize_label_keys(
        data.get("difficultyDistribution") or {}, DIFFICULTY_LEVELS, "difficultyDistribution"
    )
    difficulty = _validate_percentage_sum(difficulty, "difficultyDistribution", warnings)

    bloom = _normalize_label_keys(data.get("bloomDistribution") or {}, BLOOM_LEVELS, "bloomDistribution")
    bloom = _validate_percentage_sum(bloom, "bloomDistribution", warnings)

    validated = {
        "totalMarks": float(total_marks),
        "totalQuestions": int(total_questions),
        "unitWeights": unit_weights,
        "unitMeta": unit_meta,
        "difficultyDistribution": difficulty,
        "bloomDistribution": bloom,
    }
    return validated, warnings
