"""
tests/test_auth.py — Authentication endpoint tests.

Covers:
- Successful registration → JWT response
- Duplicate email rejection
- Successful login
- Wrong password rejection
- Protected /me endpoint with valid and invalid tokens
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── Registration ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    """Valid registration should return 201 with a JWT and user data."""
    resp = await client.post(
        "/api/auth/register",
        json={
            "email": "alice@example.com",
            "password": "SecureP@ss1",
            "full_name": "Alice Example",
        },
    )
    assert resp.status_code == 201, resp.text

    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["full_name"] == "Alice Example"
    assert "hashed_password" not in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Registering with an existing email should return 409 Conflict."""
    payload = {
        "email": "duplicate@example.com",
        "password": "Pass1234!",
        "full_name": "First User",
    }
    resp1 = await client.post("/api/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/auth/register", json=payload)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient) -> None:
    """Password shorter than 8 characters should fail validation (422)."""
    resp = await client.post(
        "/api/auth/register",
        json={"email": "weakpass@example.com", "password": "short"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient) -> None:
    """Invalid email format should return 422 Unprocessable Entity."""
    resp = await client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "ValidPass123!"},
    )
    assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient) -> None:
    """Valid credentials should return a JWT token."""
    email = "bob@example.com"
    password = "Bob$ecure99"

    await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Bob"},
    )

    resp = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == email


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient) -> None:
    """Wrong password should return 401 Unauthorized."""
    email = "carol@example.com"
    await client.post(
        "/api/auth/register",
        json={"email": email, "password": "RightPass99!", "full_name": "Carol"},
    )

    resp = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPass99!"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient) -> None:
    """Logging in with an email that was never registered should return 401."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": "ghost@example.com", "password": "AnyPass123!"},
    )
    assert resp.status_code == 401


# ── Protected endpoint ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict) -> None:
    """GET /api/auth/me with a valid token should return the user profile."""
    resp = await client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert "email" in data
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient) -> None:
    """GET /api/auth/me without a token should return 401."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient) -> None:
    """GET /api/auth/me with a forged token should return 401."""
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert resp.status_code == 401


# ── Token validation ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_token_is_valid_jwt(client: AsyncClient) -> None:
    """The issued token should decode to a valid JWT with a 'sub' claim."""
    from jose import jwt
    from app.core.config import settings

    resp = await client.post(
        "/api/auth/register",
        json={"email": "jwttest@example.com", "password": "JwtTest123!"},
    )
    token = resp.json()["access_token"]

    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "sub" in payload
    assert "exp" in payload
