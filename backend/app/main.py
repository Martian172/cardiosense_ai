"""
app/main.py — CardioSense AI FastAPI application entrypoint.

Startup sequence
----------------
1. Create database tables (SQLAlchemy async DDL).
2. Load ECG Autoencoder model weights.
3. Initialise LangChain agent service.
4. Mount CORS middleware.
5. Register all routers.

Shutdown sequence
-----------------
1. Dispose of the database engine connection pool.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import create_tables, engine
from app.routers import agent, auth, scans, websocket
from app.services.agent_service import initialise_agent_service
from app.services.ecg_model import initialise_ecg_service

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:  # noqa: ARG001
    """Manage application startup and shutdown lifecycle."""
    # ── Startup ───────────────────────────────────────────────────────────────
    logger.info("🚀 CardioSense AI starting up…")

    logger.info("  ▶ Creating database tables…")
    await create_tables()

    logger.info("  ▶ Loading ECG autoencoder model…")
    initialise_ecg_service()

    logger.info("  ▶ Initialising AI agent service…")
    initialise_agent_service()

    logger.info("✅ CardioSense AI is ready.")

    yield  # Application is running

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("🛑 CardioSense AI shutting down…")
    await engine.dispose()
    logger.info("  ✔ Database connections closed.")


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User registration, login, and profile management.",
        },
        {
            "name": "ECG Scans",
            "description": "ECG analysis, anomaly detection, and scan history.",
        },
        {
            "name": "AI Agent",
            "description": "LangChain-powered cardiology Q&A assistant.",
        },
        {
            "name": "WebSocket",
            "description": "Real-time ECG data streaming.",
        },
        {
            "name": "Health",
            "description": "Service health and readiness checks.",
        },
    ],
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(scans.router)
app.include_router(agent.router)
app.include_router(websocket.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
    response_description="Service health status",
)
async def health_check() -> JSONResponse:
    """Return the current health status of the service.

    Checks:
    - API is reachable.
    - ECG model is loaded.
    - Agent service is initialised.
    """
    from app.services.ecg_model import _service_instance as ecg_svc
    from app.services.agent_service import _instance as agent_svc

    model_loaded = ecg_svc is not None and ecg_svc._loaded
    agent_ready = agent_svc is not None

    all_healthy = model_loaded and agent_ready
    status_code = 200 if all_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "version": settings.APP_VERSION,
            "components": {
                "ecg_model": "loaded" if model_loaded else "not_loaded",
                "agent": "ready" if agent_ready else "not_initialised",
                "database": "connected",
            },
        },
    )


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="API root")
async def root() -> dict[str, str]:
    """Return a brief welcome message with links to documentation."""
    return {
        "message": f"Welcome to {settings.APP_NAME} v{settings.APP_VERSION}",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }
