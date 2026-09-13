"""
Pydantic schemas for POST /api/nlp/generate-rubric-candidates.

`RubricConceptCandidateOut` deliberately mirrors
`app.schemas.evaluation.RubricConceptIn` field-for-field (id, name,
description, marks, importance, acceptablePhrases) -- a candidate
produced here can be dropped straight into an evaluate-answer request's
`rubric.concepts` list with no reshaping, once the teacher has reviewed
and (optionally) edited it.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class GenerateRubricCandidatesRequest(BaseModel):
    referenceAnswer: str
    totalMarks: Optional[float] = None


class RubricConceptCandidateOut(BaseModel):
    id: str
    name: str
    description: str = ""
    marks: Optional[float] = None
    importance: str
    acceptablePhrases: List[str] = Field(default_factory=list)


class GenerateRubricCandidatesResponseData(BaseModel):
    concepts: List[RubricConceptCandidateOut]
    overlapWarnings: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
