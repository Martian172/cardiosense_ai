"""
app/routers/websocket.py — Real-time ECG streaming via WebSocket.

Endpoint
--------
WS /ws/ecg-stream

Protocol
--------
On connection the server immediately starts streaming ECG data points.

Client → Server messages (JSON):
    {"action": "set_variant", "variant": "afib"}   — switch signal type
    {"action": "stop"}                               — stop streaming

Server → Client messages (JSON):
    {
        "timestamp": 1234567890.123,  # Unix timestamp (float)
        "value": 0.42,                # ECG amplitude in [-1, 1]
        "sample_index": 250,          # Position in current beat cycle
        "is_anomalous_region": false, # True when cursor is inside an anomaly window
        "variant": "normal"           # Current signal variant
    }

Performance
-----------
- 25 samples are sent every 100 ms → 250 samples/second (250 Hz).
- An anomaly segment is injected roughly every 10 seconds.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ecg_generator import ECGVariant, ecg_stream_chunk, generate_ecg
from app.services.ecg_model import get_ecg_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

# Streaming constants
_CHUNK_SIZE = 25        # samples per send
_INTERVAL_S = 0.1      # seconds between sends  (25 * 10 = 250 Hz)
_ANOMALY_EVERY_N = 100  # inject anomaly every N chunks (~10 s)


@router.websocket("/ws/ecg-stream")
async def ecg_stream(websocket: WebSocket) -> None:
    """Stream synthetic ECG data to the connected client in real time.

    The signal loops continuously. Every ~10 seconds a brief anomalous
    segment is injected so the frontend can demonstrate alert behaviour.
    """
    await websocket.accept()
    logger.info("WebSocket client connected: %s", websocket.client)

    current_variant = ECGVariant.NORMAL
    signal: np.ndarray = generate_ecg(current_variant, n_samples=500)

    # Pre-compute anomaly regions using the ML model for the initial signal
    ecg_service = get_ecg_service()
    prediction = ecg_service.predict(signal.tolist())
    anomaly_windows: list[tuple[int, int]] = [
        (r["start"], r["end"]) for r in prediction["anomaly_regions"]
    ]

    cursor = 0
    chunk_count = 0
    anomalous_signal: np.ndarray | None = None

    def _is_in_anomaly_region(sample_idx: int) -> bool:
        for start, end in anomaly_windows:
            if start <= (sample_idx % len(signal)) < end:
                return True
        return False

    try:
        while True:
            # Check for incoming client control messages (non-blocking)
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                msg = json.loads(raw)
                action = msg.get("action", "")

                if action == "set_variant":
                    requested = msg.get("variant", "normal")
                    try:
                        current_variant = ECGVariant(requested)
                    except ValueError:
                        current_variant = ECGVariant.NORMAL
                    signal = generate_ecg(current_variant, n_samples=500)
                    prediction = ecg_service.predict(signal.tolist())
                    anomaly_windows = [
                        (r["start"], r["end"]) for r in prediction["anomaly_regions"]
                    ]
                    cursor = 0
                    anomalous_signal = None
                    logger.debug("WebSocket variant changed to %s", current_variant)

                elif action == "stop":
                    logger.info("WebSocket client requested stop.")
                    break

            except asyncio.TimeoutError:
                pass  # No message — continue streaming
            except json.JSONDecodeError:
                pass  # Ignore malformed messages

            # ── Periodic anomaly injection ────────────────────────────────────
            chunk_count += 1
            if chunk_count % _ANOMALY_EVERY_N == 0:
                # Switch briefly to an anomalous pattern
                if current_variant == ECGVariant.NORMAL:
                    import random
                    anomaly_type = random.choice(
                        [ECGVariant.ST_ELEVATION, ECGVariant.AFIB, ECGVariant.PVC]
                    )
                    anomalous_signal = generate_ecg(anomaly_type, n_samples=500)
                else:
                    anomalous_signal = None

            # Decide which signal to stream this chunk from
            active_signal = signal
            is_injected_anomaly = False
            if anomalous_signal is not None:
                # Stream 2 seconds of anomalous data then reset
                if chunk_count % _ANOMALY_EVERY_N < 20:
                    active_signal = anomalous_signal
                    is_injected_anomaly = True
                else:
                    anomalous_signal = None

            # ── Send chunk ────────────────────────────────────────────────────
            chunk, cursor = ecg_stream_chunk(active_signal, cursor % len(active_signal), _CHUNK_SIZE)
            now = time.time()

            frames = []
            for i, value in enumerate(chunk):
                sample_idx = (cursor - _CHUNK_SIZE + i) % len(active_signal)
                frames.append({
                    "timestamp": round(now + i / 250, 6),
                    "value": round(float(value), 6),
                    "sample_index": sample_idx,
                    "is_anomalous_region": is_injected_anomaly or _is_in_anomaly_region(sample_idx),
                    "variant": current_variant.value,
                })

            await websocket.send_json({"frames": frames, "chunk_index": chunk_count})
            await asyncio.sleep(_INTERVAL_S)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected: %s", websocket.client)
    except Exception as exc:
        logger.error("WebSocket error: %s", exc, exc_info=True)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
