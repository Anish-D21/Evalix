from fastapi import APIRouter, HTTPException

from app.core.nlp_models import get_embedder
from app.engines.evaluation.embedder import embed_texts
from app.engines.question_generation.generator import generate_questions
from app.engines.question_generation.validation import QuestionRequestValidationError
from app.schemas.question_generation import GenerateQuestionsRequest

router = APIRouter()


@router.post("/api/nlp/generate-questions")
def generate_questions_endpoint(payload: GenerateQuestionsRequest):
    """
    Deterministic template-based question generation (spec Section 17).
    Like generate-blueprint, the core generation logic needs no NLP
    models. Semantic duplicate detection (Section 18) is a best-effort
    enhancement on top -- degrades to lexical-only duplicate detection
    when the embedding model isn't loaded, same pattern as syllabus
    extraction's semantic topic merge.
    """
    embedder = get_embedder()
    embed_fn = (lambda texts: embed_texts(embedder, texts)) if embedder is not None else None

    try:
        result = generate_questions(payload.model_dump(), embed_fn)
    except QuestionRequestValidationError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": exc.message})

    return {"success": True, "data": result, "error": None}
