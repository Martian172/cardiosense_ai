"""
app/core/security.py — JWT authentication and password hashing utilities.

Provides:
- `hash_password`      : bcrypt hash a plaintext password
- `verify_password`    : verify plaintext against a bcrypt hash
- `create_access_token`: mint a signed JWT
- `decode_access_token`: validate and decode a JWT
- `get_current_user`   : FastAPI dependency — resolves Bearer token -> User ORM instance
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db


# ── Password hashing (direct bcrypt, no passlib) ─────────────────────────────

def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    # bcrypt has a 72-byte limit — truncate to be safe
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    try:
        pw_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except Exception:  # noqa: BLE001
        return False


# ── JWT ───────────────────────────────────────────────────────────────────────
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Mint a signed JWT containing *data* as the payload."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Validate and decode *token*.

    Raises:
        HTTPException 401: if the token is invalid or expired.

    Returns:
        The decoded payload dictionary.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("sub") is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_current_user(
    token: Annotated[str, Depends(_oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Resolve a Bearer token to the corresponding User ORM instance.

    Raises:
        HTTPException 401: invalid / expired token.
        HTTPException 403: account is deactivated.
        HTTPException 404: token references a user that no longer exists.
    """
    from app.models.user import User  # avoid circular import

    payload = decode_access_token(token)
    user_id: str = payload.get("sub", "")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )
    return user
