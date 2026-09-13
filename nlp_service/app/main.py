from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.nlp_models import load_models
from app.routers import blueprint, evaluate, health, question_generation, rubric, syllabus


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Section 22: load the embedding model (and spaCy) exactly ONCE here,
    # at process startup — never per-request. If loading fails (e.g. no
    # network path to the model registry), the service still starts so
    # /api/nlp/health can report the degraded state instead of crash-
    # looping; /api/nlp/evaluate-answer returns 503 until it's resolved.
    load_models()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Permissive for local development; tighten in Phase 15 (deployment prep)
# to only allow the Node backend's origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Every router raises HTTPException with a {"code", "message"} dict as
    `detail` (see evaluate.py, syllabus.py). FastAPI's own default handler
    would return that as a bare {"detail": {...}} body, which does NOT
    match the {"success", "data", "error"} envelope spec Section 45
    requires for every response. This normalizes it for the whole app in
    one place rather than duplicating the reshaping logic in every router.
    """
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        error = dict(detail)  # preserve any extra diagnostic fields, e.g. evaluate.py's loadErrors
    else:
        error = {"code": "HTTP_ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"success": False, "data": None, "error": error})


app.include_router(health.router)
app.include_router(evaluate.router)
app.include_router(syllabus.router)
app.include_router(blueprint.router)
app.include_router(question_generation.router)
app.include_router(rubric.router)

# Phase 5: health + evaluate-answer + extract-topics + generate-blueprint
# + generate-questions + generate-rubric-candidates are all wired up.
# This completes the FastAPI NLP service's core engine set per the spec's
# Section 44 endpoint list.
