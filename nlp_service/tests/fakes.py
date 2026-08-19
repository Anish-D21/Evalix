"""
Deterministic, offline stand-in for the real sentence-transformers model.

The sandbox this was built in has no network path to huggingface.co, so
the real `sentence-transformers/all-MiniLM-L6-v2` model cannot be
downloaded here (see Phase 1 report). This fake uses hashed bag-of-words
+ bigram features instead of a learned embedding, which is NOT
semantically aware — it cannot recognize paraphrases that share no
words. It exists purely to let every other part of the pipeline
(segmentation, concept matching wiring, overlap detection, credit-factor
math, relationship/negation logic, scoring aggregation, feedback
generation) be verified end-to-end offline. Tests that use it therefore
write `acceptablePhrases` that lexically overlap with the test answers,
rather than relying on true semantic similarity.

In a real deployment (with normal internet access), `nlp_service`
downloads and uses the real MiniLM model — this fake is test-only and is
never imported outside nlp_service/tests.
"""

from __future__ import annotations

import hashlib
import re
from typing import List

import numpy as np


class FakeEmbedder:
    def __init__(self, dim: int = 256):
        self.dim = dim

    def _vector(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dim, dtype=np.float32)
        words = re.findall(r"[a-z0-9]+", text.lower())
        for w in words:
            idx = int(hashlib.md5(w.encode()).hexdigest(), 16) % self.dim
            vec[idx] += 1.0
        for w1, w2 in zip(words, words[1:]):
            idx = int(hashlib.md5(f"{w1}_{w2}".encode()).hexdigest(), 16) % self.dim
            vec[idx] += 0.5
        return vec

    def encode(self, texts: List[str], batch_size: int = 32, show_progress_bar: bool = False, convert_to_numpy: bool = True):
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        return np.stack([self._vector(t) for t in texts])
