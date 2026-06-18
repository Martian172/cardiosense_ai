"""
app/schemas/scan.py — Pydantic v2 schemas for ECGScan serialization.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ScanAnalyzeRequest(BaseModel):
    """Payload for POST /api/scans/analyze."""

    scan_name: str = Field(default="Untitled Scan", max_length=255)
    ecg_data: list[float] = Field(
        min_length=100,
        max_length=5000,
        description="Raw ECG signal as a list of float amplitude values.",
    )
    notes: str | None = Field(default=None, max_length=2000)


class AnomalyRegion(BaseModel):
    """A contiguous window of the ECG signal identified as anomalous."""

    start: int = Field(ge=0, description="Start sample index (inclusive).")
    end: int = Field(ge=0, description="End sample index (exclusive).")


class ScanResult(BaseModel):
    """Full inference result returned after analysis."""

    id: str
    scan_name: str
    reconstruction_error: float
    anomaly_score: float
    is_anomalous: bool
    anomaly_regions: list[AnomalyRegion]
    raw_ecg_data: list[float] = []
    reconstructed_signal: list[float]
    created_at: datetime
    notes: str | None

    model_config = {"from_attributes": True}


class ScanListItem(BaseModel):
    """Lightweight representation of a scan used in paginated lists."""

    id: str
    scan_name: str
    reconstruction_error: float
    anomaly_score: float
    is_anomalous: bool
    created_at: datetime
    notes: str | None

    model_config = {"from_attributes": True}


class ScanDetail(ScanListItem):
    """Full scan including raw + reconstructed signal data."""

    raw_ecg_data: list[float]
    reconstructed_signal: list[float]
    anomaly_regions: list[AnomalyRegion]


class ScanListResponse(BaseModel):
    """Paginated scan list response."""

    items: list[ScanListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class DemoScanResponse(BaseModel):
    """Response from the unauthenticated demo endpoint."""

    scan_type: str  # "normal" | "st_elevation" | "afib" | "pvc"
    raw_ecg_data: list[float]  # renamed from ecg_data to match frontend types
    reconstruction_error: float
    anomaly_score: float
    is_anomalous: bool
    anomaly_regions: list[AnomalyRegion]
    reconstructed_signal: list[float]


class ScanStats(BaseModel):
    """Aggregated statistics across all user scans."""

    total_scans: int
    anomalous_scans: int
    normal_scans: int
    avg_anomaly_score: float
    last_scan_at: datetime | None


class ScanUpdateRequest(BaseModel):
    """Payload for PATCH /api/scans/{id} — update notes only."""

    notes: str | None = Field(default=None, max_length=2000)
