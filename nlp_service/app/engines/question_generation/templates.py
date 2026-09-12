"""
Deterministic question generation templates (spec Section 17).

"Question generation should initially be deterministic. Do not require
an LLM. Use controlled templates based on: topic, Bloom level,
difficulty, marks."

Every template string below is taken directly from the spec's own
worked examples for each Bloom level. Where a Bloom level has more than
one template, selection between them is deterministic (an MD5 hash of
the request's own topic/difficulty/marks, never Python's randomized
`hash()` or the `random` module) -- calling this twice with the exact
same request always produces the exact same question text.
"""

from __future__ import annotations

import hashlib
from typing import Dict, List, Optional

# Templates grouped by Bloom level. "{topic}" is always filled from the
# request's `topic`. The two-topic ANALYZE template additionally needs
# `topicB` -- see `render_question` for the fallback when it's absent.
BLOOM_TEMPLATES: Dict[str, List[str]] = {
    "remember": [
        "Define {topic}.",
        "List the major types of {topic}.",
    ],
    "understand": [
        "Explain {topic} with a suitable example.",
        "Describe how {topic} works.",
    ],
    "apply": [
        "Given the following scenario, explain how {topic} could be applied.",
    ],
    "analyze": [
        "Compare {topic} and {topicB}.",
        "Analyze the effect of {topic} on {topicB}.",
    ],
    # ANALYZE fallback when the request has no second topic to compare
    # against -- still a genuine analysis prompt, just single-topic.
    "analyze_single_topic": [
        "Analyze the key components of {topic} and how they relate to each other.",
    ],
    "evaluate": [
        "Evaluate the suitability of {topic} for the given problem scenario.",
    ],
    "create": [
        "Design a solution using {topic} for the given problem.",
    ],
}


def _deterministic_index(seed_text: str, modulus: int) -> int:
    """Deterministic (never random, never Python's hash-randomized
    built-in `hash()`) pseudo-index into a template list, so the same
    request always selects the same template."""
    digest = hashlib.md5(seed_text.encode("utf-8")).hexdigest()
    return int(digest, 16) % modulus


def render_question(topic: str, bloom_level: str, difficulty: str, marks: float, topic_b: Optional[str] = None) -> str:
    """
    Renders question text for a single (topic, bloomLevel, difficulty,
    marks[, topicB]) request. Deterministic: identical arguments always
    produce identical text.
    """
    bloom_key = bloom_level.lower()

    if bloom_key == "analyze" and not topic_b:
        templates = BLOOM_TEMPLATES["analyze_single_topic"]
    else:
        templates = BLOOM_TEMPLATES.get(bloom_key)

    if not templates:
        raise ValueError(f"No question templates defined for Bloom level '{bloom_level}'.")

    seed = f"{topic}|{topic_b or ''}|{bloom_key}|{difficulty}|{marks}"
    template = templates[_deterministic_index(seed, len(templates))]

    return template.format(topic=topic, topicB=topic_b or "")
