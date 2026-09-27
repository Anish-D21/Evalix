"""Pydantic schemas for POST /api/nlp/generate-questions."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class QuestionRequestIn(BaseModel):
    topicId: Optional[str] = None
    topic: Optional[str] = None
    topicName: Optional[str] = None
    topicB: Optional[str] = None
    bloomLevel: str
    difficulty: str
    marks: float
    questionType: Optional[str] = "descriptive"

    @model_validator(mode="before")
    @classmethod
    def resolve_topic(cls, data):
        if isinstance(data, dict):
            t = data.get("topic") or data.get("topicName")
            if t:
                data["topic"] = t
                data["topicName"] = t
        return data


class GenerateQuestionsRequest(BaseModel):
    requests: List[QuestionRequestIn]


class QuestionValidationOut(BaseModel):
    valid: bool
    issues: List[str] = Field(default_factory=list)


class GeneratedQuestionOut(BaseModel):
    topicId: Optional[str] = None
    topicName: str
    text: str
    marks: float
    difficulty: str
    bloomLevel: str
    questionType: str
    status: str
    validation: QuestionValidationOut


class GenerateQuestionsResponseData(BaseModel):
    questions: List[GeneratedQuestionOut]
    warnings: List[str] = Field(default_factory=list)
