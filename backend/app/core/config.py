"""
app/core/config.py — Application configuration via pydantic-settings.

All settings are read from environment variables (or .env file).
Never hardcode secrets; always use this module to access configuration.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration.

    Values are loaded from environment variables first, then from a .env
    file in the working directory (if present).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "CardioSense AI"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "Production-grade ECG anomaly detection API powered by PyTorch and LangChain."
    )
    DEBUG: bool = False

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "changeme-generate-with-secrets-token-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./cardiosense.db"

    # ── Google Gemini / LangChain ──────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # ── ML Model ──────────────────────────────────────────────────────────────
    MODEL_PATH: str = "app/ml/ecg_autoencoder.pt"
    ANOMALY_THRESHOLD: float = 0.05
    ECG_SEGMENT_LENGTH: int = 500  # samples per inference window (2 s @ 250 Hz)
    ECG_SAMPLE_RATE: int = 250     # Hz

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Accept CORS_ORIGINS as a JSON array string or a comma-separated list."""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @model_validator(mode="after")
    def warn_insecure_secret(self) -> "Settings":
        """Emit a warning if the default (insecure) secret key is still in use."""
        if self.SECRET_KEY == "changeme-generate-with-secrets-token-hex-32":
            import warnings
            warnings.warn(
                "SECRET_KEY is set to the default insecure value. "
                "Generate a real secret with: python -c \"import secrets; print(secrets.token_hex(32))\"",
                stacklevel=2,
            )
        return self


# Module-level singleton — import this everywhere instead of re-instantiating.
settings = Settings()
