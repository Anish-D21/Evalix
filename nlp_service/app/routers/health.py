from fastapi import APIRouter

from app.core.config import settings
from app.core.nlp_models import get_load_errors, is_ready

router = APIRouter()


@router.get("/api/nlp/health")
def health_check():
    """
    Liveness check for the NLP microservice, polled by the Node backend's
    own /api/health route. Reports whether the spaCy pipeline and the
    sentence-embedding model finished loading — evaluate-answer returns
    503 until both are ready.
    """
    ready = is_ready()
    return {
        "success": True,
        "data": {
            "service": settings.app_name,
            "status": "ok" if ready else "degraded",
            "environment": settings.environment,
            "modelsReady": ready,
            "loadErrors": get_load_errors(),
        },
        "error": None,
    }
