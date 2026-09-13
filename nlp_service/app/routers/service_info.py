from fastapi import APIRouter

from app.engines.service_info import get_service_status

router = APIRouter()


@router.get("/api/nlp/")
def service_info_endpoint():
    """
    Lightweight service directory -- lists every available endpoint with
    a short description. Distinct from /api/nlp/health, which reports
    NLP model readiness specifically rather than API surface.
    """
    return {"success": True, "data": get_service_status(), "error": None}
