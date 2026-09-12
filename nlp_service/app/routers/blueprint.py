from fastapi import APIRouter, HTTPException

from app.engines.blueprint.generator import generate_blueprint
from app.engines.blueprint.validation import BlueprintValidationError
from app.schemas.blueprint import GenerateBlueprintRequest

router = APIRouter()


@router.post("/api/nlp/generate-blueprint")
def generate_blueprint_endpoint(payload: GenerateBlueprintRequest):
    """
    Deterministic blueprint allocation (spec Section 16). Unlike
    evaluate-answer and extract-topics, this needs no NLP models at all
    -- it's pure arithmetic -- so there is no "models not ready" 503
    path here; it's available as soon as the service is up.
    """
    try:
        result = generate_blueprint(payload.model_dump())
    except BlueprintValidationError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": exc.message})

    return {"success": True, "data": result, "error": None}
