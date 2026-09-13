"""
Service-level integration info (Phase 6: FastAPI integration).

A small, deterministic summary of the NLP microservice's available
endpoints. Distinct from /api/nlp/health (which reports NLP model
readiness specifically): this is a static directory of what the service
offers, useful for the Node backend (Phase 7) to sanity-check which
capabilities are live without parsing the full OpenAPI schema, and for
a developer hitting the service root to get oriented before diving into
/docs.

Kept as a plain function returning a static list rather than introspecting
FastAPI's route table, so it's trivially testable in isolation with no
app/router machinery involved -- consistent with every other engine
module in this codebase.
"""

from __future__ import annotations

from app.core.config import settings

ENDPOINTS = [
    {"path": "/api/nlp/health", "method": "GET", "description": "Model load status and service health."},
    {
        "path": "/api/nlp/evaluate-answer",
        "method": "POST",
        "description": "Explainable semantic evaluation of a student answer against a rubric.",
    },
    {
        "path": "/api/nlp/extract-topics",
        "method": "POST",
        "description": "Extract syllabus units and candidate topics from an uploaded PDF/DOCX/TXT file.",
    },
    {
        "path": "/api/nlp/generate-blueprint",
        "method": "POST",
        "description": "Deterministic exam blueprint allocation across units, difficulty, and Bloom levels.",
    },
    {
        "path": "/api/nlp/generate-questions",
        "method": "POST",
        "description": "Deterministic, template-based question generation with duplicate/quality checks.",
    },
    {
        "path": "/api/nlp/generate-rubric-candidates",
        "method": "POST",
        "description": "Candidate rubric concepts extracted from a reference answer, for teacher review.",
    },
]


def get_service_status() -> dict:
    return {
        "service": settings.app_name,
        "environment": settings.environment,
        "endpoints": ENDPOINTS,
    }
