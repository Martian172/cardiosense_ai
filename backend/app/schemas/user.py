"""
app/schemas/user.py — Pydantic v2 schemas for User serialization.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Shared fields used across request/response schemas."""

    email: EmailStr
    full_name: str = Field(default="", max_length=255)


class UserCreate(UserBase):
    """Schema for user registration requests."""

    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """Schema for partial profile updates."""

    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserResponse(UserBase):
    """Schema for serialising a User record in API responses."""

    id: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    """Minimal public representation (safe to embed in other responses)."""

    id: str
    email: EmailStr
    full_name: str

    model_config = {"from_attributes": True}
