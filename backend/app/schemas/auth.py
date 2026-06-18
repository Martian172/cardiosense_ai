"""
app/schemas/auth.py — Pydantic v2 schemas for authentication flows.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    """Credentials submitted to POST /api/auth/login."""

    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    """Payload submitted to POST /api/auth/register."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(default="", max_length=255)


class TokenResponse(BaseModel):
    """JWT token response returned after successful auth."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Decoded token payload (internal use)."""

    sub: str  # user UUID
