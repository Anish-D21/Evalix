from fastapi import APIRouter, HTTPException

from app.core.nlp_models import get_embedder, get_nlp
from app.engines.evaluation.embedder import embed_texts
from app.engines.rubric.candidate_generation import generate_rubric_candidates
from app.engines.rubric.validation import RubricGenerationValidationError
from app.schemas.rubric import GenerateRubricCandidatesRequest

router = APIRouter()


@router.post("/api/nlp/generate-rubric-candidates")
def generate_rubric_candidates_endpoint(payload: GenerateRubricCandidatesRequest):
    """
    Rubric concept candidate generation (spec Sections 19-21). Needs
    spaCy for extraction (503 if not loaded, same as extract-topics);
    the embedding model is optional and only used for the overlap-
    warning pass (Section 25) -- degrades gracefully without it, same
    pattern as syllabus extraction's semantic topic merge.
    """
    nlp = get_nlp()
    if nlp is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "MODELS_NOT_READY",
                "message": "The spaCy pipeline is not loaded yet. This usually means the service just started.",
            },
        )

    embedder = get_embedder()
    embed_fn = (lambda texts: embed_texts(embedder, texts)) if embedder is not None else None

    try:
        result = generate_rubric_candidates(payload.model_dump(), nlp, embed_fn)
    except RubricGenerationValidationError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": exc.message})

    return {"success": True, "data": result, "error": None}
