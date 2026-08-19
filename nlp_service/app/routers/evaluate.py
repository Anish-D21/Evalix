from fastapi import APIRouter, HTTPException

from app.core.nlp_models import get_embedder, get_load_errors, get_nlp, is_ready
from app.engines.evaluation.evaluator import evaluate_answer
from app.schemas.evaluation import EvaluateAnswerRequest

router = APIRouter()


@router.post("/api/nlp/evaluate-answer")
def evaluate_answer_endpoint(payload: EvaluateAnswerRequest):
    if not is_ready():
        raise HTTPException(
            status_code=503,
            detail={
                "code": "MODELS_NOT_READY",
                "message": (
                    "The NLP models are not loaded yet. This usually means the service just "
                    "started and is still downloading/loading the embedding model, or has no "
                    "network path to the model registry."
                ),
                "loadErrors": get_load_errors(),
            },
        )

    result = evaluate_answer(payload.model_dump(), get_nlp(), get_embedder())
    return {"success": True, "data": result, "error": None}
