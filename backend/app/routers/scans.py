"""
app/routers/scans.py — ECG scan analysis endpoints.

Routes
------
POST   /api/scans/analyze      — Analyse uploaded ECG, persist result (auth required).
GET    /api/scans              — List current user's scans (paginated).
GET    /api/scans/{scan_id}    — Get single scan with full signal data.
DELETE /api/scans/{scan_id}    — Delete a scan.
POST   /api/scans/demo         — Run analysis on a generated signal (no auth required).
"""

from __future__ import annotations

import json
import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.scan import ECGScan
from app.models.user import User
from app.schemas.scan import (
    AnomalyRegion,
    DemoScanResponse,
    ScanAnalyzeRequest,
    ScanDetail,
    ScanListItem,
    ScanListResponse,
    ScanResult,
    ScanStats,
    ScanUpdateRequest,
)
from app.services.ecg_generator import ECGVariant, generate_ecg, generate_random_ecg
from app.services.ecg_model import get_ecg_service

router = APIRouter(prefix="/api/scans", tags=["ECG Scans"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _parse_anomaly_regions(json_str: str | None) -> list[AnomalyRegion]:
    """Deserialise stored JSON anomaly regions to schema objects."""
    if not json_str:
        return []
    try:
        raw = json.loads(json_str)
        return [AnomalyRegion(start=r["start"], end=r["end"]) for r in raw]
    except (json.JSONDecodeError, KeyError, TypeError):
        return []


def _parse_float_list(json_str: str | None) -> list[float]:
    """Deserialise a stored JSON float array."""
    if not json_str:
        return []
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return []


# ── Analyse ───────────────────────────────────────────────────────────────────

@router.post(
    "/analyze",
    response_model=ScanResult,
    status_code=status.HTTP_201_CREATED,
    summary="Analyse an ECG signal",
    description=(
        "Runs the ECG autoencoder on the provided signal, detects anomalies, "
        "persists the result to the database, and returns the full analysis."
    ),
)
async def analyze_scan(
    payload: ScanAnalyzeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScanResult:
    """Perform ECG anomaly detection and persist the result."""
    ecg_service = get_ecg_service()

    prediction = ecg_service.predict(payload.ecg_data)

    scan = ECGScan(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        scan_name=payload.scan_name,
        notes=payload.notes,
        raw_ecg_data=json.dumps(payload.ecg_data),
        reconstructed_ecg_data=json.dumps(prediction["reconstructed_signal"]),
        reconstruction_error=prediction["reconstruction_error"],
        anomaly_score=prediction["anomaly_score"],
        is_anomalous=prediction["is_anomalous"],
        anomaly_regions=json.dumps(prediction["anomaly_regions"]),
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)

    regions = [
        AnomalyRegion(start=r["start"], end=r["end"])
        for r in prediction["anomaly_regions"]
    ]

    return ScanResult(
        id=scan.id,
        scan_name=scan.scan_name,
        reconstruction_error=scan.reconstruction_error,
        anomaly_score=scan.anomaly_score,
        is_anomalous=scan.is_anomalous,
        anomaly_regions=regions,
        raw_ecg_data=payload.ecg_data,
        reconstructed_signal=prediction["reconstructed_signal"],
        created_at=scan.created_at,
        notes=scan.notes,
    )


# ── List ──────────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=ScanListResponse,
    summary="List user's scans (paginated)",
)
async def list_scans(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)."),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page."),
) -> ScanListResponse:
    """Return a paginated list of the current user's ECG scans."""
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(ECGScan.id)).where(ECGScan.user_id == current_user.id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(ECGScan)
        .where(ECGScan.user_id == current_user.id)
        .order_by(ECGScan.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    scans = result.scalars().all()

    items = [
        ScanListItem(
            id=s.id,
            scan_name=s.scan_name,
            reconstruction_error=s.reconstruction_error,
            anomaly_score=s.anomaly_score,
            is_anomalous=s.is_anomalous,
            created_at=s.created_at,
            notes=s.notes,
        )
        for s in scans
    ]

    return ScanListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


# ── Stats ────────────────────────────────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=ScanStats,
    summary="Get aggregated scan statistics for the current user",
)
async def get_scan_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScanStats:
    """Return total / anomalous / normal counts and avg anomaly score."""
    from sqlalchemy import func as fn
    from app.models.scan import ECGScan as ECGScanModel

    total_res = await db.execute(
        select(fn.count(ECGScanModel.id)).where(ECGScanModel.user_id == current_user.id)
    )
    total = total_res.scalar_one() or 0

    anomalous_res = await db.execute(
        select(fn.count(ECGScanModel.id)).where(
            ECGScanModel.user_id == current_user.id,
            ECGScanModel.is_anomalous == True,  # noqa: E712
        )
    )
    anomalous = anomalous_res.scalar_one() or 0

    avg_res = await db.execute(
        select(fn.avg(ECGScanModel.anomaly_score)).where(
            ECGScanModel.user_id == current_user.id
        )
    )
    avg_score = avg_res.scalar_one() or 0.0

    last_res = await db.execute(
        select(ECGScanModel.created_at)
        .where(ECGScanModel.user_id == current_user.id)
        .order_by(ECGScanModel.created_at.desc())
        .limit(1)
    )
    last_at = last_res.scalar_one_or_none()

    return ScanStats(
        total_scans=total,
        anomalous_scans=anomalous,
        normal_scans=total - anomalous,
        avg_anomaly_score=round(float(avg_score), 4),
        last_scan_at=last_at,
    )


# ── Detail ────────────────────────────────────────────────────────────────────

@router.get(
    "/{scan_id}",
    response_model=ScanDetail,
    summary="Get a single scan with full signal data",
)
async def get_scan(
    scan_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScanDetail:
    """Retrieve a single ECG scan including raw and reconstructed signals.

    Raises:
        404 Not Found: If the scan does not exist or belongs to another user.
    """
    result = await db.execute(
        select(ECGScan).where(
            ECGScan.id == scan_id,
            ECGScan.user_id == current_user.id,
        )
    )
    scan: ECGScan | None = result.scalar_one_or_none()

    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found.",
        )

    return ScanDetail(
        id=scan.id,
        scan_name=scan.scan_name,
        reconstruction_error=scan.reconstruction_error,
        anomaly_score=scan.anomaly_score,
        is_anomalous=scan.is_anomalous,
        created_at=scan.created_at,
        notes=scan.notes,
        raw_ecg_data=_parse_float_list(scan.raw_ecg_data),
        reconstructed_signal=_parse_float_list(scan.reconstructed_ecg_data),
        anomaly_regions=_parse_anomaly_regions(scan.anomaly_regions),
    )


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete(
    "/{scan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a scan",
)
async def delete_scan(
    scan_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Permanently delete an ECG scan record.

    Raises:
        404 Not Found: If the scan does not exist or belongs to another user.
    """
    result = await db.execute(
        select(ECGScan).where(
            ECGScan.id == scan_id,
            ECGScan.user_id == current_user.id,
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found.",
        )

    await db.execute(
        delete(ECGScan).where(ECGScan.id == scan_id)
    )


# ── Update Notes ──────────────────────────────────────────────────────────────

@router.patch(
    "/{scan_id}",
    response_model=ScanListItem,
    summary="Update scan notes",
)
async def update_scan_notes(
    scan_id: str,
    payload: ScanUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScanListItem:
    """Update the notes field of a scan."""
    result = await db.execute(
        select(ECGScan).where(
            ECGScan.id == scan_id,
            ECGScan.user_id == current_user.id,
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found.",
        )
    scan.notes = payload.notes
    await db.flush()
    await db.refresh(scan)
    return ScanListItem.model_validate(scan)




@router.post(
    "/demo",
    response_model=DemoScanResponse,
    summary="Run a demo analysis on a generated ECG (no auth required)",
    description=(
        "Generates a random ECG signal (normal or anomalous) and runs the "
        "full inference pipeline. Useful for UI demos and integration testing."
    ),
)
async def demo_scan(
    variant: ECGVariant | None = None,
) -> DemoScanResponse:
    """Run ECG analysis on a synthetically generated signal without authentication.

    Args:
        variant: Optionally specify the ECG type. Defaults to a weighted random choice.
    """
    ecg_service = get_ecg_service()

    if variant is not None:
        ecg_signal = generate_ecg(variant, n_samples=500)
        chosen_variant = variant
    else:
        ecg_signal, chosen_variant = generate_random_ecg(n_samples=500)

    ecg_list = ecg_signal.tolist()
    prediction = ecg_service.predict(ecg_list)

    regions = [
        AnomalyRegion(start=r["start"], end=r["end"])
        for r in prediction["anomaly_regions"]
    ]

    return DemoScanResponse(
        scan_type=chosen_variant.value,
        raw_ecg_data=ecg_list,
        reconstruction_error=prediction["reconstruction_error"],
        anomaly_score=prediction["anomaly_score"],
        is_anomalous=prediction["is_anomalous"],
        anomaly_regions=regions,
        reconstructed_signal=prediction["reconstructed_signal"],
    )
