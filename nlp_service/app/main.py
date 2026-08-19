from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.nlp_models import load_models
from app.routers import evaluate, health


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

app.include_router(health.router)
app.include_router(evaluate.router)

# Phase 1: health + evaluate-answer are wired up.
# extract-topics, generate-blueprint, generate-questions, and
# generate-rubric-candidates routers are added in later phases as their
# engines are implemented.
