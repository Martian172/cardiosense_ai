"""
app/routers/agent.py — AI cardiology agent endpoints.

Routes
------
POST /api/agent/chat                          — Send a message; receive AI response.
GET  /api/agent/sessions/{session_id}/history — Retrieve conversation history.
"""

from __future__ import annotations

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.scan import ECGScan
from app.models.user import User
from app.services.agent_service import get_agent_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["AI Agent"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str = Field(min_length=1, max_length=128)
    scan_id: str | None = Field(default=None)


class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: list[str] = []
    fallback: bool = False


class HistoryEntry(BaseModel):
    role: str
    content: str
    timestamp: str


class HistoryResponse(BaseModel):
    session_id: str
    history: list[HistoryEntry]
    total_turns: int


# ── Helper: optional current user from JWT ────────────────────────────────────

async def _optional_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return the authenticated user if a valid Bearer token is provided, else None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:  # noqa: BLE001
        return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with Dr. CardioBot (auth optional)",
)
async def chat(
    payload: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User | None, Depends(_optional_current_user)],
) -> ChatResponse:
    """Chat with the AI cardiology agent.

    - Unauthenticated users get standard AI responses.
    - Authenticated users can pass a ``scan_id`` for ECG-contextualised answers.
    """
    agent = get_agent_service()

    scan_context: dict[str, Any] | None = None
    if payload.scan_id and current_user:
        result = await db.execute(
            select(ECGScan).where(
                ECGScan.id == payload.scan_id,
                ECGScan.user_id == current_user.id,
            )
        )
        scan: ECGScan | None = result.scalar_one_or_none()
        if scan:
            try:
                regions = json.loads(scan.anomaly_regions or "[]")
            except (json.JSONDecodeError, TypeError):
                regions = []
            scan_context = {
                "scan_id": scan.id,
                "scan_name": scan.scan_name,
                "reconstruction_error": scan.reconstruction_error,
                "anomaly_score": scan.anomaly_score,
                "is_anomalous": scan.is_anomalous,
                "anomaly_regions": regions,
                "notes": scan.notes,
            }

    agent_response = await agent.chat(
        message=payload.message,
        session_id=payload.session_id,
        scan_context=scan_context,
    )

    return ChatResponse(
        response=agent_response["response"],
        session_id=agent_response["session_id"],
        sources=agent_response.get("sources", []),
        fallback=agent_response.get("fallback", False),
    )


@router.get(
    "/sessions/{session_id}/history",
    response_model=HistoryResponse,
    summary="Get conversation history for a session",
)
async def get_session_history(
    session_id: str,
    current_user: Annotated[User | None, Depends(_optional_current_user)],
) -> HistoryResponse:
    """Return all messages exchanged in a given chat session."""
    agent = get_agent_service()
    raw_history = agent.get_history(session_id)
    entries = [
        HistoryEntry(role=t["role"], content=t["content"], timestamp=t["timestamp"])
        for t in raw_history
    ]
    return HistoryResponse(
        session_id=session_id,
        history=entries,
        total_turns=len(entries),
    )
