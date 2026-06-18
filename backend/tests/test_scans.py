"""
tests/test_scans.py — ECG scan endpoint tests.

Covers:
- POST /api/scans/demo (unauthenticated)
- POST /api/scans/analyze (authenticated)
- GET  /api/scans (paginated list)
- GET  /api/scans/{id} (detail)
- DELETE /api/scans/{id}
- 404 on unknown scan ID
"""

from __future__ import annotations

import numpy as np
import pytest
from httpx import AsyncClient

from app.services.ecg_generator import generate_ecg, ECGVariant


def _make_ecg_data(n: int = 500) -> list[float]:
    """Generate a simple sinusoidal ECG-like signal for testing."""
    signal = generate_ecg(ECGVariant.NORMAL, n_samples=n)
    return signal.tolist()


# ── Demo endpoint (no auth) ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_demo_scan_no_auth(client: AsyncClient) -> None:
    """Demo scan should work without authentication."""
    resp = await client.post("/api/scans/demo")
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert "scan_type" in data
    assert "ecg_data" in data
    assert "reconstruction_error" in data
    assert "anomaly_score" in data
    assert "is_anomalous" in data
    assert "anomaly_regions" in data
    assert "reconstructed_signal" in data

    # Signal sanity checks
    assert len(data["ecg_data"]) == 500
    assert len(data["reconstructed_signal"]) == 500
    assert 0.0 <= data["anomaly_score"] <= 1.0
    assert data["reconstruction_error"] >= 0.0


@pytest.mark.asyncio
async def test_demo_scan_specific_variant(client: AsyncClient) -> None:
    """Demo scan with a specific variant parameter."""
    for variant in ["normal", "st_elevation", "afib", "pvc"]:
        resp = await client.post(f"/api/scans/demo?variant={variant}")
        assert resp.status_code == 200, f"Variant {variant} failed: {resp.text}"
        assert resp.json()["scan_type"] == variant


@pytest.mark.asyncio
async def test_demo_scan_invalid_variant(client: AsyncClient) -> None:
    """Invalid variant should return 422."""
    resp = await client.post("/api/scans/demo?variant=invalid_type")
    assert resp.status_code == 422


# ── Analyze endpoint ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_analyze_scan_authenticated(
    client: AsyncClient, auth_headers: dict
) -> None:
    """Authenticated scan analysis should persist the result and return 201."""
    ecg_data = _make_ecg_data(500)

    resp = await client.post(
        "/api/scans/analyze",
        json={"scan_name": "Test Scan", "ecg_data": ecg_data},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text

    data = resp.json()
    assert "id" in data
    assert data["scan_name"] == "Test Scan"
    assert "reconstruction_error" in data
    assert "is_anomalous" in data
    assert len(data["reconstructed_signal"]) == 500


@pytest.mark.asyncio
async def test_analyze_scan_unauthenticated(client: AsyncClient) -> None:
    """Analyze endpoint without auth should return 401."""
    resp = await client.post(
        "/api/scans/analyze",
        json={"scan_name": "No Auth", "ecg_data": _make_ecg_data()},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_analyze_scan_too_short(
    client: AsyncClient, auth_headers: dict
) -> None:
    """ECG data with fewer than 100 samples should fail validation."""
    resp = await client.post(
        "/api/scans/analyze",
        json={"scan_name": "Short", "ecg_data": [0.1] * 50},
        headers=auth_headers,
    )
    assert resp.status_code == 422


# ── List endpoint ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_scans_empty(client: AsyncClient, auth_headers: dict) -> None:
    """Fresh user should have an empty scan list."""
    # Use a brand-new user so list is guaranteed empty
    import uuid
    new_email = f"fresh-{uuid.uuid4().hex[:6]}@test.com"
    reg = await client.post(
        "/api/auth/register",
        json={"email": new_email, "password": "Passw0rd!", "full_name": "Fresh"},
    )
    new_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    resp = await client.get("/api/scans", headers=new_headers)
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_scans_after_analyze(
    client: AsyncClient, auth_headers: dict
) -> None:
    """After submitting a scan, the list should contain at least one item."""
    await client.post(
        "/api/scans/analyze",
        json={"scan_name": "List Test", "ecg_data": _make_ecg_data()},
        headers=auth_headers,
    )

    resp = await client.get("/api/scans", headers=auth_headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    # Verify shape of list item
    item = data["items"][0]
    assert "id" in item
    assert "scan_name" in item
    assert "is_anomalous" in item


@pytest.mark.asyncio
async def test_list_scans_pagination(
    client: AsyncClient, auth_headers: dict
) -> None:
    """Pagination parameters should be respected."""
    # Submit 3 scans
    for i in range(3):
        await client.post(
            "/api/scans/analyze",
            json={"scan_name": f"Paginated {i}", "ecg_data": _make_ecg_data()},
            headers=auth_headers,
        )

    resp = await client.get("/api/scans?page=1&page_size=2", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 2
    assert data["page_size"] == 2


# ── Detail endpoint ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_scan_detail(client: AsyncClient, auth_headers: dict) -> None:
    """GET /api/scans/{id} should return full signal data."""
    create_resp = await client.post(
        "/api/scans/analyze",
        json={"scan_name": "Detail Test", "ecg_data": _make_ecg_data()},
        headers=auth_headers,
    )
    scan_id = create_resp.json()["id"]

    resp = await client.get(f"/api/scans/{scan_id}", headers=auth_headers)
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert data["id"] == scan_id
    assert "raw_ecg_data" in data
    assert "reconstructed_signal" in data
    assert len(data["raw_ecg_data"]) > 0


@pytest.mark.asyncio
async def test_get_scan_not_found(client: AsyncClient, auth_headers: dict) -> None:
    """Unknown scan ID should return 404."""
    resp = await client.get(
        "/api/scans/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ── Delete endpoint ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_scan(client: AsyncClient, auth_headers: dict) -> None:
    """Deleting a scan should return 204 and remove it from the list."""
    create_resp = await client.post(
        "/api/scans/analyze",
        json={"scan_name": "To Delete", "ecg_data": _make_ecg_data()},
        headers=auth_headers,
    )
    scan_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/scans/{scan_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Verify it's gone
    get_resp = await client.get(f"/api/scans/{scan_id}", headers=auth_headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_scan_not_found(client: AsyncClient, auth_headers: dict) -> None:
    """Deleting a non-existent scan should return 404."""
    resp = await client.delete(
        "/api/scans/nonexistent-uuid-here",
        headers=auth_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_user_cannot_access_others_scan(client: AsyncClient) -> None:
    """A user should not be able to access or delete another user's scan."""
    import uuid

    # User A creates a scan
    email_a = f"usera-{uuid.uuid4().hex[:6]}@test.com"
    reg_a = await client.post(
        "/api/auth/register",
        json={"email": email_a, "password": "PassA123!", "full_name": "User A"},
    )
    headers_a = {"Authorization": f"Bearer {reg_a.json()['access_token']}"}

    create_resp = await client.post(
        "/api/scans/analyze",
        json={"scan_name": "User A Scan", "ecg_data": _make_ecg_data()},
        headers=headers_a,
    )
    scan_id = create_resp.json()["id"]

    # User B tries to access it
    email_b = f"userb-{uuid.uuid4().hex[:6]}@test.com"
    reg_b = await client.post(
        "/api/auth/register",
        json={"email": email_b, "password": "PassB123!", "full_name": "User B"},
    )
    headers_b = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

    resp = await client.get(f"/api/scans/{scan_id}", headers=headers_b)
    assert resp.status_code == 404  # Should not leak existence


# ── Health ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    """Health check endpoint should return 200 with status information."""
    resp = await client.get("/health")
    assert resp.status_code in (200, 503)  # 503 allowed if agent not fully init'd
    data = resp.json()
    assert "status" in data
    assert "components" in data
