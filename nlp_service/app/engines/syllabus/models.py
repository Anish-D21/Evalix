"""Shared data types for the syllabus engine, kept in their own module so
extraction and normalization can both depend on this without importing
each other."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TopicCandidate:
    text: str  # display form, e.g. "Machine Learning"
    normalized: str  # comparison form, e.g. "machine learning"
    occurrences: int
