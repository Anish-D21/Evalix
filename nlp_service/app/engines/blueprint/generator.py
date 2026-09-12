"""
Blueprint generator orchestrator (spec Section 16).

Pure function of its input -- no I/O, no randomness, no hidden state --
so calling it twice with identical input always produces byte-identical
output. That determinism is itself a spec requirement in disguise:
"Show the teacher the final allocation" only means something if the
allocation shown is stable and reproducible, not liable to reshuffle
between requests.
"""

from __future__ import annotations

from typing import Dict, List

from app.core.config import settings
from app.engines.blueprint.allocation import allocate_marks, largest_remainder_allocation
from app.engines.blueprint.validation import validate_blueprint_request


def _build_bands(total_marks: float, total_questions: int, weights: Dict[str, float]) -> List[dict]:
    question_alloc = largest_remainder_allocation(total_questions, weights)
    marks_alloc = allocate_marks(total_marks, weights, settings.blueprint_marks_granularity)
    return [
        {
            "label": label,
            "percentage": weights[label],
            "questionCount": question_alloc[label],
            "marks": marks_alloc[label],
        }
        for label in weights  # preserves the caller's original order
    ]


def _build_unit_bands(total_marks: float, total_questions: int, unit_weights: Dict[str, float], unit_meta: Dict[str, dict]) -> List[dict]:
    question_alloc = largest_remainder_allocation(total_questions, unit_weights)
    marks_alloc = allocate_marks(total_marks, unit_weights, settings.blueprint_marks_granularity)
    bands = []
    for key in unit_weights:
        meta = unit_meta[key]
        bands.append(
            {
                "unitNumber": meta["unitNumber"],
                "title": meta["title"],
                "percentage": unit_weights[key],
                "questionCount": question_alloc[key],
                "marks": marks_alloc[key],
            }
        )
    # Display in unit-number order regardless of the order they arrived in.
    bands.sort(key=lambda b: b["unitNumber"])
    return bands


def _warn_on_zero_allocations(band_name: str, bands: List[dict], total_questions: int, warnings: List[str]) -> None:
    """Transparency check (Section 16: "never silently violate requested
    percentages"): if totalQuestions is too small relative to the number
    of requested categories, some categories will legitimately receive
    zero questions under the largest-remainder method -- that's correct
    arithmetic, but it must never happen silently."""
    zero_labels = [b.get("label") or f"Unit {b.get('unitNumber')}" for b in bands if b["percentage"] > 0 and b["questionCount"] == 0]
    if zero_labels:
        warnings.append(
            f"{band_name}: totalQuestions ({total_questions}) is too low to allocate at least one "
            f"question to every requested category; {', '.join(zero_labels)} received 0 questions."
        )


def generate_blueprint(request_data: dict) -> dict:
    validated, warnings = validate_blueprint_request(request_data)

    total_marks = validated["totalMarks"]
    total_questions = validated["totalQuestions"]

    unit_bands = _build_unit_bands(total_marks, total_questions, validated["unitWeights"], validated["unitMeta"])
    difficulty_bands = _build_bands(total_marks, total_questions, validated["difficultyDistribution"])
    bloom_bands = _build_bands(total_marks, total_questions, validated["bloomDistribution"])

    _warn_on_zero_allocations("units", unit_bands, total_questions, warnings)
    _warn_on_zero_allocations("difficultyDistribution", difficulty_bands, total_questions, warnings)
    _warn_on_zero_allocations("bloomDistribution", bloom_bands, total_questions, warnings)

    return {
        "totalMarks": total_marks,
        "totalQuestions": total_questions,
        "units": unit_bands,
        "difficulty": difficulty_bands,
        "bloom": bloom_bands,
        "warnings": warnings,
    }
