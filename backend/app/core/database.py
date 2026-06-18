"""
app/core/database.py — SQLAlchemy 2.0 async database engine and session factory.

Provides:
- `engine`     : AsyncEngine (created once at import time)
- `AsyncSessionLocal` : sessionmaker producing AsyncSession instances
- `Base`       : DeclarativeBase for all ORM models
- `get_db()`   : FastAPI dependency that yields a managed AsyncSession
- `create_tables()` : helper called at startup to create missing tables
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
# `connect_args` is SQLite-specific; remove when using PostgreSQL.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Declarative base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


# ── Dependency ────────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session per request.

    The session is automatically committed on success or rolled back on
    any unhandled exception, and always closed afterwards.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Startup helper ────────────────────────────────────────────────────────────
async def create_tables() -> None:
    """Create all tables defined via the ORM (used at startup, not for migrations)."""
    # Import models here to ensure they are registered on Base.metadata
    from app.models import scan, user  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
