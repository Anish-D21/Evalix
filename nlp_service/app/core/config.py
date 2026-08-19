"""
Central configuration for the Evalix NLP microservice.

All environment-driven values are read here so the rest of the codebase
never touches os.environ directly. This is also where the semantic
matching thresholds (Section 23 of the spec) will live once the
evaluation engine is implemented in a later phase.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Evalix NLP Service"
    environment: str = "development"

    # Preferred models per spec Section 5.
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    spacy_model_name: str = "en_core_web_sm"

    # ---- Section 23: semantic matching thresholds (configurable, not
    # scattered through the codebase as magic numbers). ----
    threshold_full_coverage: float = 0.85
    threshold_high_partial: float = 0.70
    threshold_partial: float = 0.55
    threshold_low_evidence: float = 0.40

    # ---- Section 24: partial credit factors, keyed to the thresholds above. ----
    credit_factor_full: float = 1.00
    credit_factor_high_partial: float = 0.75
    credit_factor_partial: float = 0.50
    credit_factor_low_evidence: float = 0.25
    credit_factor_not_covered: float = 0.00

    # ---- Section 25: double-counting prevention. Two rubric concepts whose
    # representative embeddings are more similar than this are treated as
    # overlapping/near-duplicate, and only one is allowed to be credited
    # from the same piece of evidence. ----
    concept_overlap_threshold: float = 0.90

    # ---- Section 29: final scoring weights. Concept coverage must stay
    # dominant; generic semantic similarity is never the primary grade. ----
    weight_concept_coverage: float = 0.80
    weight_relationship: float = 0.10
    weight_completeness: float = 0.05
    weight_readability: float = 0.05

    # Rough heuristic for "answer completeness": how many words per rubric
    # mark we'd expect from a reasonably thorough answer. Not a hard cap —
    # only used to scale a 0..1 completeness ratio.
    expected_words_per_mark: float = 12.0

    # How long to wait per HTTP attempt when downloading the embedding
    # model from the Hugging Face Hub before giving up. The underlying
    # library's own default (no explicit timeout) can block startup for
    # 20-30+ seconds when the registry is unreachable (e.g. no network
    # egress to huggingface.co) before finally raising — this keeps a
    # cold start bounded instead, per spec Section 6's requirement to
    # tolerate cold starts without hanging.
    hf_hub_download_timeout_seconds: int = 5


settings = Settings()
