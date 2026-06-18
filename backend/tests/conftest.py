"""
tests/conftest.py — Pytest fixtures for the CardioSense AI backend test suite.

Provides:
- ``app``        : The FastAPI application configured for testing.
- ``client``     : Async HTTPX client wired to the test app.
- ``db_session`` : An AsyncSession connected to an in-memory SQLite database.
- ``auth_headers``: Helper fixture that registers + logs in a test user.
"""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app
from app.services.ecg_model import initialise_ecg_service

# ── Test DB ───────────────────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Pytest config ─────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop shared across the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Database setup ────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables in the in-memory test database before tests run."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_ecg_service():
    """Ensure the ECG model service is initialised (uses random weights in tests)."""
    initialise_ecg_service()


# ── DB session override ───────────────────────────────────────────────────────
@pytest_asyncio.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an AsyncSession backed by the test in-memory database."""
    async with TestSessionLocal() as session:
        yield session


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = _override_get_db


# ── HTTP client ───────────────────────────────────────────────────────────────
@pytest_asyncio.fixture()
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Yield an async HTTPX client pointed at the test FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


# ── Auth helper ───────────────────────────────────────────────────────────────
@pytest_asyncio.fixture()
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Register a test user and return Bearer auth headers.

    The user email is unique per fixture invocation to avoid conflicts
    when tests run in the same session with a persistent DB.
    """
    import uuid
    unique_email = f"test-{uuid.uuid4().hex[:8]}@cardiosense.test"

    reg_resp = await client.post(
        "/api/auth/register",
        json={
            "email": unique_email,
            "password": "TestP@ss123",
            "full_name": "Test User",
        },
    )
    assert reg_resp.status_code == 201, reg_resp.text
    token = reg_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
