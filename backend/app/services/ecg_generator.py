"""
app/services/ecg_generator.py — Realistic synthetic ECG signal generator.

Produces PQRST waveforms suitable for:
- Streaming via WebSocket
- Demo API endpoint
- Testing without real patient data

Supported signal types
----------------------
- ``normal``       : Clean sinus rhythm
- ``st_elevation`` : Elevated ST segment (myocardial infarction pattern)
- ``afib``         : Atrial fibrillation (irregular rhythm, no clear P wave)
- ``pvc``          : Premature ventricular contraction (extra wide QRS complex)
"""

from __future__ import annotations

import math
import random
from enum import Enum

import numpy as np


class ECGVariant(str, Enum):
    """Available ECG signal variants."""

    NORMAL = "normal"
    ST_ELEVATION = "st_elevation"
    AFIB = "afib"
    PVC = "pvc"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _gaussian(
    x: np.ndarray, mu: float, sigma: float, amplitude: float
) -> np.ndarray:
    """Evaluate a Gaussian function centred at *mu* with width *sigma*."""
    return amplitude * np.exp(-((x - mu) ** 2) / (2 * sigma**2))


def _build_normal_beat(
    cycle_len: int,
    *,
    p_amp: float = 0.15,
    r_amp: float = 1.0,
    t_amp: float = 0.35,
    st_elevation: float = 0.0,
) -> np.ndarray:
    """Construct a single PQRST beat of length *cycle_len* samples."""
    if cycle_len < 5:
        return np.zeros(cycle_len, dtype=np.float32)

    x = np.arange(cycle_len, dtype=np.float64)

    p = _gaussian(x, 0.15 * cycle_len, 0.02 * cycle_len, p_amp)
    q = _gaussian(x, 0.40 * cycle_len, 0.010 * cycle_len, -0.08)
    r = _gaussian(x, 0.44 * cycle_len, 0.012 * cycle_len, r_amp)
    s = _gaussian(x, 0.48 * cycle_len, 0.010 * cycle_len, -0.15)

    # ST segment flat region
    st_start = int(0.50 * cycle_len)
    st_end = int(0.58 * cycle_len)
    st = np.zeros(cycle_len)
    if st_end > st_start:
        st[st_start:st_end] = st_elevation

    t = _gaussian(x, 0.65 * cycle_len, 0.04 * cycle_len, t_amp)

    return (p + q + r + s + st + t).astype(np.float32)


def _build_pvc_beat(cycle_len: int) -> np.ndarray:
    """Produce a wide, aberrant PVC complex (no P wave, wide QRS)."""
    if cycle_len < 5:
        return np.zeros(cycle_len, dtype=np.float32)

    x = np.arange(cycle_len, dtype=np.float64)

    # No P wave; wide and large QRS
    r = _gaussian(x, 0.35 * cycle_len, 0.035 * cycle_len, 1.6)
    s = _gaussian(x, 0.50 * cycle_len, 0.030 * cycle_len, -0.60)
    # Inverted T wave follows PVC
    t = _gaussian(x, 0.70 * cycle_len, 0.05 * cycle_len, -0.30)

    return (r + s + t).astype(np.float32)


def _safe_write(
    signal: np.ndarray, beat: np.ndarray, pos: int
) -> None:
    """Write *beat* into *signal* at *pos*, safely clipping to array bounds."""
    n = len(signal)
    if pos >= n:
        return
    end = min(pos + len(beat), n)
    length = end - pos
    if length > 0:
        signal[pos:end] += beat[:length]


def _add_baseline_wander(signal: np.ndarray, n_samples: int) -> np.ndarray:
    """Add a low-frequency sinusoidal baseline wander artifact."""
    freq_hz = random.uniform(0.1, 0.4)
    amplitude = random.uniform(0.02, 0.06)
    phase = random.uniform(0, 2 * math.pi)
    t = np.linspace(0, 2, n_samples)
    return signal + (amplitude * np.sin(2 * math.pi * freq_hz * t + phase)).astype(np.float32)


def _add_noise(signal: np.ndarray, std: float = 0.01) -> np.ndarray:
    """Add Gaussian white noise to *signal*."""
    return signal + np.random.normal(0, std, len(signal)).astype(np.float32)


def _normalise(signal: np.ndarray) -> np.ndarray:
    """Min-max normalise *signal* to the range [-1, 1]."""
    rng = signal.max() - signal.min()
    if rng < 1e-8:
        return signal
    return (2 * (signal - signal.min()) / rng - 1).astype(np.float32)


# ── Public API ────────────────────────────────────────────────────────────────

def generate_ecg(
    variant: ECGVariant | str = ECGVariant.NORMAL,
    n_samples: int = 500,
    sample_rate: int = 250,
    heart_rate_bpm: float | None = None,
) -> np.ndarray:
    """Generate a synthetic ECG signal of length *n_samples*.

    Args:
        variant: Which ECG type to generate.
        n_samples: Total number of samples (default 500 = 2 s at 250 Hz).
        sample_rate: Sampling frequency in Hz (used only for beat timing).
        heart_rate_bpm: Override heart rate. Defaults to a random value.

    Returns:
        ``numpy.ndarray`` of shape ``(n_samples,)`` with dtype ``float32``.
    """
    variant = ECGVariant(variant)
    duration_s = n_samples / sample_rate

    if variant == ECGVariant.NORMAL:
        return _generate_normal(n_samples, duration_s, heart_rate_bpm)
    elif variant == ECGVariant.ST_ELEVATION:
        return _generate_st_elevation(n_samples, duration_s, heart_rate_bpm)
    elif variant == ECGVariant.AFIB:
        return _generate_afib(n_samples, duration_s)
    elif variant == ECGVariant.PVC:
        return _generate_pvc(n_samples, duration_s, heart_rate_bpm)
    else:
        raise ValueError(f"Unknown ECG variant: {variant!r}")


def generate_random_ecg(n_samples: int = 500) -> tuple[np.ndarray, ECGVariant]:
    """Generate a signal with a randomly chosen variant.

    Returns:
        Tuple of ``(signal, variant)`` so the caller knows which type was used.
    """
    # Normal is more common than anomalies (70/30 split)
    weights = [0.70, 0.10, 0.10, 0.10]
    variant = random.choices(list(ECGVariant), weights=weights, k=1)[0]
    return generate_ecg(variant, n_samples), variant


# ── Variant implementations ───────────────────────────────────────────────────

def _generate_normal(
    n_samples: int, duration_s: float, bpm: float | None
) -> np.ndarray:
    """Normal sinus rhythm."""
    bpm = bpm or random.uniform(60, 80)
    beats_per_sec = bpm / 60
    cycle_len = max(10, int(n_samples / (beats_per_sec * duration_s)))

    signal = np.zeros(n_samples, dtype=np.float32)
    pos = 0
    while pos < n_samples:
        beat = _build_normal_beat(cycle_len)
        _safe_write(signal, beat, pos)
        pos += cycle_len

    signal = _add_baseline_wander(signal, n_samples)
    signal = _add_noise(signal, std=0.008)
    return _normalise(signal)


def _generate_st_elevation(
    n_samples: int, duration_s: float, bpm: float | None
) -> np.ndarray:
    """ST-elevation pattern (STEMI indicator)."""
    bpm = bpm or random.uniform(70, 100)
    beats_per_sec = bpm / 60
    cycle_len = max(10, int(n_samples / (beats_per_sec * duration_s)))
    elevation = random.uniform(0.15, 0.35)

    signal = np.zeros(n_samples, dtype=np.float32)
    pos = 0
    while pos < n_samples:
        beat = _build_normal_beat(
            cycle_len,
            r_amp=random.uniform(0.9, 1.1),
            t_amp=random.uniform(0.40, 0.55),
            st_elevation=elevation,
        )
        _safe_write(signal, beat, pos)
        pos += cycle_len

    signal = _add_baseline_wander(signal, n_samples)
    signal = _add_noise(signal, std=0.012)
    return _normalise(signal)


def _generate_afib(n_samples: int, duration_s: float) -> np.ndarray:
    """Atrial fibrillation: irregularly irregular rhythm, no P waves."""
    signal = np.zeros(n_samples, dtype=np.float32)

    pos = 0
    while pos < n_samples:
        # Irregular RR interval (hallmark of AFib)
        rr_min = max(20, int(n_samples * 0.12))
        rr_max = max(rr_min + 1, int(n_samples * 0.30))
        cycle_len = random.randint(rr_min, rr_max)

        if cycle_len < 10 or pos + cycle_len > n_samples + cycle_len:
            break

        beat = _build_normal_beat(
            cycle_len,
            p_amp=0.0,  # No P wave in AFib
            r_amp=random.uniform(0.7, 1.2),
        )
        _safe_write(signal, beat, pos)
        pos += cycle_len

    # Fibrillatory baseline
    t = np.linspace(0, duration_s, n_samples)
    fib_freqs = [random.uniform(4, 8) for _ in range(6)]
    fib_baseline = sum(
        random.uniform(0.02, 0.05) * np.sin(2 * math.pi * f * t + random.uniform(0, 2 * math.pi))
        for f in fib_freqs
    )
    signal += fib_baseline.astype(np.float32)
    signal = _add_noise(signal, std=0.015)
    return _normalise(signal)


def _generate_pvc(
    n_samples: int, duration_s: float, bpm: float | None
) -> np.ndarray:
    """Normal rhythm with periodic premature ventricular contractions.

    Bug fix: compensatory pause is added AFTER writing the beat,
    not before — so pos/end alignment is always correct.
    """
    bpm = bpm or random.uniform(60, 80)
    beats_per_sec = bpm / 60
    cycle_len = max(10, int(n_samples / (beats_per_sec * duration_s)))

    # Every Nth beat is a PVC (bigeminy=2, trigeminy=3, quadrigeminy=4)
    pvc_period = random.choice([2, 3, 4])

    signal = np.zeros(n_samples, dtype=np.float32)
    pos = 0
    beat_idx = 0

    while pos < n_samples:
        is_pvc = (beat_idx % pvc_period == pvc_period - 1)

        if is_pvc:
            beat = _build_pvc_beat(cycle_len)
            _safe_write(signal, beat, pos)
            pos += cycle_len  # normal advance
            pos += cycle_len  # compensatory pause (extra cycle skipped)
        else:
            beat = _build_normal_beat(cycle_len)
            _safe_write(signal, beat, pos)
            pos += cycle_len

        beat_idx += 1

    signal = _add_baseline_wander(signal, n_samples)
    signal = _add_noise(signal, std=0.01)
    return _normalise(signal)


# ── Streaming helper ──────────────────────────────────────────────────────────

def ecg_stream_chunk(
    signal: np.ndarray,
    cursor: int,
    chunk_size: int = 25,
) -> tuple[list[float], int]:
    """Return the next *chunk_size* samples from *signal* starting at *cursor*.

    Wraps around when the end of the signal is reached (continuous loop).

    Returns:
        Tuple of ``(samples, new_cursor)``.
    """
    n = len(signal)
    if n == 0:
        return [], 0
    end = cursor + chunk_size
    if end <= n:
        chunk = signal[cursor:end].tolist()
        return chunk, end % n
    else:
        part1 = signal[cursor:].tolist()
        part2 = signal[: end - n].tolist()
        return part1 + part2, end % n
