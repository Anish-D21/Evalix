"""
Embedding utilities.

Section 22 performance rules enforced here:
  - batch encoding (one call for many texts, never encode() in a loop)
  - vectorized cosine similarity via numpy, not per-pair Python loops

`embed_texts` takes any object exposing a sentence-transformers-style
`.encode(list[str]) -> np.ndarray` interface, so tests can swap in a
lightweight fake embedder (see nlp_service/tests/fakes.py) without a
network path to the real model.
"""

from __future__ import annotations

from typing import List

import numpy as np


def embed_texts(embedder, texts: List[str]) -> np.ndarray:
    """Batch-encode a list of texts into a (n, dim) float32 matrix."""
    if not texts:
        return np.zeros((0, 0), dtype=np.float32)
    vectors = embedder.encode(texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True)
    return np.asarray(vectors, dtype=np.float32)


def cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Vectorized cosine similarity between every row of `a` and every row of `b`."""
    if a.size == 0 or b.size == 0:
        return np.zeros((a.shape[0], b.shape[0]), dtype=np.float32)

    a_norm = a / np.clip(np.linalg.norm(a, axis=1, keepdims=True), 1e-8, None)
    b_norm = b / np.clip(np.linalg.norm(b, axis=1, keepdims=True), 1e-8, None)
    return a_norm @ b_norm.T
