"""
Pydantic schemas for POST /api/nlp/generate-blueprint.

`UnitWeightIn.weightage` plays the role of spec Section 13's
BLUEPRINTS.topicDistribution field, applied at syllabus-unit granularity
(matching Phase 2's `units: [{unitNumber, title, topics}]` output)
rather than a free-text topic list.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class UnitWeightIn(BaseModel):
    unitNumber: int
    title: Optional[str] = None
    weightage: float


class GenerateBlueprintRequest(BaseModel):
    totalMarks: float
    totalQuestions: int
    units: List[UnitWeightIn]
    difficultyDistribution: Dict[str, float]
    bloomDistribution: Dict[str, float]


class UnitBandOut(BaseModel):
    unitNumber: int
    title: str
    percentage: float
    questionCount: int
    marks: float


class BandOut(BaseModel):
    label: str
    percentage: float
    questionCount: int
    marks: float


class GenerateBlueprintResponseData(BaseModel):
    totalMarks: float
    totalQuestions: int
    units: List[UnitBandOut]
    difficulty: List[BandOut]
    bloom: List[BandOut]
    warnings: List[str] = Field(default_factory=list)
