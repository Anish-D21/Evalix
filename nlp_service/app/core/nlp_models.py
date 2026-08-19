"""
Singleton NLP model loader.

Section 22 of the spec is explicit: load the embedding model ONCE at
service startup, never per-request and never inside nested loops. This
module owns that lifecycle — `load_models()` is called once from the
FastAPI lifespan handler in app/main.py, and every other module reaches
the loaded models through `get_nlp()` / `get_embedder()` instead of
loading its own copy.

Both loads are wrapped in try/except: a missing spaCy model or an
unreachable model registry (e.g. no network access to download
sentence-transformers weights on first run) should degrade the service,
not crash it — matching the spec's Section 6 requirement to tolerate
cold starts and startup-time failures. Callers must check `is_ready()`
before evaluating an answer.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("evalix.nlp_models")

_nlp = None  # spaCy Language pipeline
_embedder = None  # SentenceTransformer model
_load_errors: dict[str, str] = {}


def load_models() -> None:
    """Load spaCy and the sentence embedding model exactly once."""
    global _nlp, _embedder

    if _nlp is None:
        try:
            import spacy

            _nlp = spacy.load(settings.spacy_model_name)
            logger.info("Loaded spaCy model '%s'", settings.spacy_model_name)
        except Exception as exc:  # noqa: BLE001 - we want to degrade, not crash
            _load_errors["spacy"] = str(exc)
            logger.warning("Could not load spaCy model '%s': %s", settings.spacy_model_name, exc)

    if _embedder is None:
        try:
            # Bound how long the Hugging Face Hub client will wait per HTTP
            # attempt. Without this, an unreachable registry can block
            # startup for 20-30+ seconds before the library gives up.
            # setdefault so a deployer's own explicit setting always wins.
            os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", str(settings.hf_hub_download_timeout_seconds))

            from sentence_transformers import SentenceTransformer

            _embedder = SentenceTransformer(settings.embedding_model_name)
            logger.info("Loaded embedding model '%s'", settings.embedding_model_name)
        except Exception as exc:  # noqa: BLE001
            _load_errors["embedder"] = str(exc)
            logger.warning(
                "Could not load embedding model '%s': %s. The service will run in a "
                "degraded state — /api/nlp/evaluate-answer will return 503 until this "
                "is resolved (usually a missing network path to the model registry).",
                settings.embedding_model_name,
                exc,
            )


def get_nlp():
    return _nlp


def get_embedder():
    return _embedder


def get_load_errors() -> dict:
    return dict(_load_errors)


def is_ready() -> bool:
    """True only once both the tokenizer/parser and the embedder are loaded."""
    return _nlp is not None and _embedder is not None


def set_models_for_testing(nlp=None, embedder=None) -> None:
    """
    Test-only hook. Lets unit tests inject a real spaCy pipeline alongside
    a lightweight fake embedder (see tests/fakes.py) so pipeline logic can
    be verified without a network path to download transformer weights.
    """
    global _nlp, _embedder
    if nlp is not None:
        _nlp = nlp
    if embedder is not None:
        _embedder = embedder
