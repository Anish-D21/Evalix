from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.core.nlp_models import get_embedder, get_nlp
from app.engines.evaluation.embedder import embed_texts
from app.engines.syllabus.pipeline import extract_syllabus
from app.engines.syllabus.text_extraction import SUPPORTED_EXTENSIONS, TextExtractionError, UnsupportedFileTypeError

router = APIRouter()


@router.post("/api/nlp/extract-topics")
async def extract_topics_endpoint(file: UploadFile = File(...)):
    nlp = get_nlp()
    if nlp is None:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "MODELS_NOT_READY",
                "message": "The spaCy pipeline is not loaded yet. This usually means the service just started.",
            },
        )

    filename = file.filename or "upload"
    if not any(filename.lower().endswith(ext) for ext in SUPPORTED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "UNSUPPORTED_FILE_TYPE",
                "message": f"Unsupported file type for '{filename}'. Evalix accepts PDF, DOCX, and TXT syllabus files.",
            },
        )

    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.max_syllabus_upload_mb:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File is {size_mb:.1f}MB, which exceeds the {settings.max_syllabus_upload_mb}MB limit.",
            },
        )
    if size_mb == 0:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_FILE", "message": "Uploaded file is empty."})

    # Semantic near-duplicate merging is a best-effort enhancement, not a
    # hard requirement -- unlike evaluate-answer, syllabus extraction must
    # keep working (lexical-only dedup) even if the embedding model isn't
    # loaded, since its core value (text + unit + topic extraction) doesn't
    # depend on it.
    embedder = get_embedder()
    embed_fn = (lambda texts: embed_texts(embedder, texts)) if embedder is not None else None

    try:
        result = extract_syllabus(file_bytes, filename, nlp, embed_fn)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=400, detail={"code": "UNSUPPORTED_FILE_TYPE", "message": str(exc)})
    except TextExtractionError as exc:
        raise HTTPException(status_code=422, detail={"code": "EXTRACTION_FAILED", "message": str(exc)})

    if not result["extractedText"].strip():
        raise HTTPException(
            status_code=422,
            detail={"code": "NO_TEXT_EXTRACTED", "message": "No readable text could be extracted from this file."},
        )

    result["originalFileName"] = filename
    return {"success": True, "data": result, "error": None}
