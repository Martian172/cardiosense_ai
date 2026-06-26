"""
app/core/config.py — Application configuration via pydantic-settings.

All settings are read from environment variables (or .env file).
Never hardcode secrets; always use this module to access configuration.
"""

from __future__ import annotations

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# All allowed origins — hardcoded so pydantic-settings never has to parse a list from env
_DEFAULT_CORS_ORIGINS = ",".join([
    "http://localhost:5173",
    "http://localhost:3000",
    "https://cardiosense-ai-mscx.onrender.com",
    "https://cardiosense-p5vv6048m-dr-cardio.vercel.app",
    "https://cardiosense-ai.vercel.app",
    "https://cardiosense-ai-martian172.vercel.app",
    "https://cardiosense-ai-git-main-martian172.vercel.app",
])


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
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ── ML Model ──────────────────────────────────────────────────────────────
    MODEL_PATH: str = "app/ml/ecg_autoencoder.pt"
    ANOMALY_THRESHOLD: float = 0.05
    ECG_SEGMENT_LENGTH: int = 500  # samples per inference window (2 s @ 250 Hz)
    ECG_SAMPLE_RATE: int = 250     # Hz

    # ── CORS — stored as plain str, parsed into list by cors_origins property ──
    # Use comma-separated string to avoid pydantic-settings v2 JSON parse issues
    CORS_ORIGINS_STR: str = _DEFAULT_CORS_ORIGINS

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # ── Validators ────────────────────────────────────────────────────────────
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

    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Parse CORS_ORIGINS_STR into a list of allowed origins."""
        raw = self.CORS_ORIGINS_STR.strip()
        if raw.startswith("["):
            import json
            return json.loads(raw)
        return [o.strip() for o in raw.split(",") if o.strip()]


# Module-level singleton — import this everywhere instead of re-instantiating.
settings = Settings()
