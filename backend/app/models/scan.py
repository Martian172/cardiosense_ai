"""
app/models/scan.py — SQLAlchemy ORM model for the ECGScan entity.

Stores both the raw ECG signal (as JSON text) and the inference results
produced by the PyTorch autoencoder.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ECGScan(Base):
    """Represents a single ECG analysis session for a user."""

    __tablename__ = "ecg_scans"

    # ── Primary key ───────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    # ── Foreign key → User ────────────────────────────────────────────────────
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Metadata ──────────────────────────────────────────────────────────────
    scan_name: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled Scan")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Raw signal (stored as JSON array string) ──────────────────────────────
    raw_ecg_data: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="JSON array of float ECG sample values",
    )

    # ── Reconstruction (stored as JSON array string) ──────────────────────────
    reconstructed_ecg_data: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="JSON array of reconstructed ECG values from the autoencoder",
    )

    # ── Inference results ─────────────────────────────────────────────────────
    reconstruction_error: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    anomaly_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0,
        comment="Normalised score in [0, 1]; higher = more anomalous"
    )
    is_anomalous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Anomaly regions ───────────────────────────────────────────────────────
    anomaly_regions: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="JSON array of [start_idx, end_idx] pairs indicating anomalous windows",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="scans")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<ECGScan id={self.id!r} user_id={self.user_id!r} "
            f"is_anomalous={self.is_anomalous}>"
        )
