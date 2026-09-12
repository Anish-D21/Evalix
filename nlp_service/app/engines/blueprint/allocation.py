"""
Deterministic largest-remainder allocation (spec Section 16).

"If percentages do not produce exact integers, use a transparent
largest-remainder or equivalent deterministic allocation method. Show
the teacher the final allocation. Never silently violate requested
percentages."

The algorithm: every label first gets floor(total * normalized_pct /
100) guaranteed, then the leftover units are handed out one at a time to
the labels with the largest fractional remainder. Ties are broken by
original input order, so the same input always produces the exact same
output -- no randomness, no dict-ordering surprises.

Weights are proportionally normalized to sum to exactly 100 before the
floor/remainder split. This is what guarantees the invariant the rest of
the engine depends on: the allocation ALWAYS sums to `total` exactly,
even if the caller's percentages summed to 99.7 or 100.3 (validation.py
is what decides whether that's close enough to accept at all -- this
function just makes the arithmetic exact once it's given something to
work with).
"""

from __future__ import annotations

from typing import Dict


def largest_remainder_allocation(total: int, weights: Dict[str, float]) -> Dict[str, int]:
    """Splits integer `total` across `weights` (label -> percentage,
    order matters for tie-breaking) so the result sums EXACTLY to
    `total`. Every value in the result is a non-negative integer."""
    if total < 0:
        raise ValueError("total must be >= 0")
    if not weights:
        return {}
    if any(w < 0 for w in weights.values()):
        raise ValueError("weights must be >= 0")

    labels = list(weights.keys())  # preserves insertion order for deterministic tie-breaking
    weight_sum = sum(weights.values())
    if weight_sum <= 0:
        raise ValueError("weights must sum to a positive number")

    normalized = {label: weights[label] / weight_sum * 100.0 for label in labels}
    raw = {label: total * normalized[label] / 100.0 for label in labels}
    base = {label: int(raw[label]) for label in labels}  # floor (raw >= 0, so truncation == floor)
    remainders = {label: raw[label] - base[label] for label in labels}

    leftover = total - sum(base.values())
    # leftover is guaranteed to be in [0, len(labels)) here, since
    # `normalized` sums to exactly 100 and each fractional remainder is
    # in [0, 1) -- the sum of all remainders equals `leftover` exactly.
    order = sorted(range(len(labels)), key=lambda i: (-remainders[labels[i]], i))

    result = dict(base)
    for i in range(leftover):
        result[labels[order[i]]] += 1

    return result


def allocate_marks(total_marks: float, weights: Dict[str, float], granularity: float) -> Dict[str, float]:
    """
    Same guarantee as `largest_remainder_allocation` but for a
    (possibly fractional) marks total: allocates in units of
    `granularity` (e.g. 0.5) so a band can receive a half-mark instead
    of being forced to a whole number, while the result still sums
    EXACTLY to `total_marks` (up to floating-point rounding of the
    final multiply-back step, corrected explicitly below).
    """
    if granularity <= 0:
        raise ValueError("granularity must be > 0")
    if total_marks < 0:
        raise ValueError("total_marks must be >= 0")

    units = round(total_marks / granularity)
    unit_allocation = largest_remainder_allocation(units, weights)
    marks_allocation = {label: round(count * granularity, 6) for label, count in unit_allocation.items()}

    # Correct any last-cent floating-point drift so the sum is exact to
    # the requested total_marks, not just "close" to it -- adjust the
    # single largest allocation by the (tiny) residual.
    drift = round(total_marks - sum(marks_allocation.values()), 6)
    if drift != 0 and marks_allocation:
        largest_label = max(marks_allocation, key=marks_allocation.get)
        marks_allocation[largest_label] = round(marks_allocation[largest_label] + drift, 6)

    return marks_allocation
