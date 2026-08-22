"""
Pydantic response schema for POST /api/nlp/extract-topics.

Only a response model is defined here -- the request is a file upload
(multipart/form-data), which FastAPI handles via `UploadFile` directly
in the router rather than a JSON body schema.
"""

from __future__ import annotations

from typing import List

from pydantic import BaseModel


class UnitOut(BaseModel):
    unitNumber: int
    title: str
    topics: List[str]


class ExtractTopicsResponseData(BaseModel):
    originalFileName: str
    extractedText: str
    units: List[UnitOut]
