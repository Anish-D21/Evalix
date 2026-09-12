"""
Question generation orchestrator (spec Sections 17, 18).

Pure function of its input plus an optional embedder callable -- no
randomness, no hidden state. The same `requests` list always produces
the same generated text (templates.py's determinism) and the same
duplicate-detection result (quality.py's lexical pass is always
deterministic; its semantic pass depends only on the embedding model's
own determinism, matching how evaluate-answer already treats MiniLM).
"""

from __future__ import annotations

from typing import Callable, List, Optional

from app.engines.question_generation.quality import find_duplicate_groups, validate_generated_question
from app.engines.question_generation.templates import render_question
from app.engines.question_generation.validation import validate_question_requests


def generate_questions(request_data: dict, embed_fn: Optional[Callable] = None) -> dict:
    validated_requests = validate_question_requests(request_data.get("requests"))

    questions = []
    for req in validated_requests:
        text = render_question(req["topic"], req["bloomLevel"], req["difficulty"], req["marks"], req["topicB"])
        questions.append(
            {
                "topicId": req["topicId"],
                "topicName": req["topic"],
                "text": text,
                "marks": req["marks"],
                "difficulty": req["difficulty"],
                "bloomLevel": req["bloomLevel"],
                "questionType": req["questionType"],
                "status": "draft",  # spec Section 13 QUESTIONS.status: draft | approved
            }
        )

    texts = [q["text"] for q in questions]
    duplicate_groups = find_duplicate_groups(texts, embed_fn)

    for i, question in enumerate(questions):
        question["validation"] = validate_generated_question(question, i, duplicate_groups)

    warnings: List[str] = []
    if duplicate_groups:
        warnings.append(
            f"{len(duplicate_groups)} group(s) of possibly duplicate questions were detected in this batch -- "
            f"review before publishing."
        )

    return {"questions": questions, "warnings": warnings}
