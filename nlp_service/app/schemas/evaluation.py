"""
Pydantic schemas for POST /api/nlp/evaluate-answer.

Field names mirror the MongoDB rubric/evaluation shapes from spec
Sections 19-21 and 33 so the Node backend can pass rubric documents
through with minimal reshaping.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class RubricConceptIn(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    marks: float
    importance: Optional[str] = "medium"
    acceptablePhrases: Optional[List[str]] = Field(default_factory=list)


class RubricRelationshipIn(BaseModel):
    sourceConcept: str
    relationship: str
    targetConcept: str
    importance: Optional[str] = "medium"
    marks: Optional[float] = 0


class RubricIn(BaseModel):
    totalMarks: float
    concepts: List[RubricConceptIn]
    relationships: Optional[List[RubricRelationshipIn]] = Field(default_factory=list)


class EvaluateAnswerRequest(BaseModel):
    question: Optional[str] = None
    referenceAnswer: Optional[str] = None
    rubric: RubricIn
    studentAnswer: str


class ConceptResultOut(BaseModel):
    id: str
    name: str
    marks: float
    awardedMarks: float
    similarity: float
    coverage: str
    importance: str
    evidence: Optional[str] = None
    suppressedOverlapWith: Optional[str] = None
    negated: bool = False
    negationReasons: Optional[List[str]] = None


class RelationshipResultOut(BaseModel):
    sourceConcept: str
    relationship: str
    targetConcept: str
    importance: str
    status: str
    evidence: Optional[str] = None
    similarity: Optional[float] = None
    reason: Optional[str] = None


class MisconceptionOut(BaseModel):
    sourceConcept: str
    relationship: str
    targetConcept: str
    evidenceSentence: str
    note: str
    detectionReasons: Optional[List[str]] = None


class EvaluateAnswerResponseData(BaseModel):
    overallScore: float
    maxScore: float
    conceptCoverageScore: float
    relationshipScore: float
    semanticUnderstandingScore: float
    coveredConcepts: List[ConceptResultOut]
    partialConcepts: List[ConceptResultOut]
    missingConcepts: List[ConceptResultOut]
    relationships: List[RelationshipResultOut]
    misconceptions: List[MisconceptionOut]
    overallFeedback: str
    strengths: List[str]
    improvementAreas: List[str]
    revisionRecommendations: List[str]
    confidence: str
    rubricWarnings: List[str] = Field(default_factory=list)
