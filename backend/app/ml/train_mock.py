"""
app/ml/train_mock.py — Generate mock model weights for development.

This script:
  1. Creates an ECGAutoencoder instance.
  2. Runs a short training loop on synthetically generated ECG data.
  3. Saves the trained weights to ``app/ml/ecg_autoencoder.pt``.

Run from the *backend/* directory::

    python -m app.ml.train_mock

Or directly::

    python app/ml/train_mock.py

This simulates having a pre-trained model available without requiring
a full training dataset. The resulting weights are "good enough" for
realistic reconstruction error calculations.
"""

from __future__ import annotations

import math
import os
import sys

import numpy as np
import torch
import torch.nn as nn
from torch.optim import Adam
from torch.optim.lr_scheduler import CosineAnnealingLR

# Allow running as a standalone script from the backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.ml.model import ECGAutoencoder  # noqa: E402


# ── Synthetic ECG Generator ───────────────────────────────────────────────────

def _gaussian(x: np.ndarray, mu: float, sigma: float, amplitude: float) -> np.ndarray:
    return amplitude * np.exp(-((x - mu) ** 2) / (2 * sigma**2))


def generate_ecg_batch(batch_size: int, n_samples: int = 500) -> torch.Tensor:
    """Generate a batch of synthetic PQRST ECG signals.

    The signal is constructed by superimposing Gaussian bumps for each
    wave component (P, Q, R, S, T) with slight per-sample randomness to
    create realistic variability.
    """
    t = np.linspace(0, 2 * math.pi, n_samples)
    batch = np.zeros((batch_size, 1, n_samples), dtype=np.float32)

    for i in range(batch_size):
        # Random heart rate: 50–100 bpm → 1–2 beats in 2-second window
        bpm = np.random.uniform(50, 100)
        beats_per_window = bpm / 60 * 2  # ~1.7 beats on average
        cycle_len = int(n_samples / beats_per_window)

        signal = np.zeros(n_samples, dtype=np.float32)

        for beat_start in range(0, n_samples - cycle_len // 2, cycle_len):
            x = np.arange(cycle_len, dtype=np.float64)

            # P wave  (atrial depolarisation)
            p = _gaussian(x, 0.15 * cycle_len, 0.02 * cycle_len, 0.15 + np.random.normal(0, 0.02))
            # Q wave  (small negative deflection)
            q = _gaussian(x, 0.40 * cycle_len, 0.01 * cycle_len, -(0.08 + np.random.normal(0, 0.01)))
            # R wave  (dominant positive spike)
            r = _gaussian(x, 0.44 * cycle_len, 0.012 * cycle_len, 1.0 + np.random.normal(0, 0.05))
            # S wave  (small negative deflection after R)
            s = _gaussian(x, 0.48 * cycle_len, 0.01 * cycle_len, -(0.15 + np.random.normal(0, 0.01)))
            # T wave  (ventricular repolarisation)
            t_wave = _gaussian(x, 0.65 * cycle_len, 0.04 * cycle_len, 0.35 + np.random.normal(0, 0.03))

            beat = (p + q + r + s + t_wave).astype(np.float32)
            end = min(beat_start + cycle_len, n_samples)
            signal[beat_start:end] += beat[: end - beat_start]

        # Baseline wander + noise
        baseline = 0.05 * np.sin(2 * np.pi * 0.2 * np.linspace(0, 2, n_samples))
        noise = np.random.normal(0, 0.01, n_samples).astype(np.float32)
        signal += baseline + noise

        # Normalise to [-1, 1]
        rng = signal.max() - signal.min()
        if rng > 0:
            signal = 2 * (signal - signal.min()) / rng - 1

        batch[i, 0, :] = signal

    return torch.from_numpy(batch)


# ── Training ──────────────────────────────────────────────────────────────────

def train(
    epochs: int = 30,
    batch_size: int = 32,
    batches_per_epoch: int = 20,
    lr: float = 1e-3,
    output_path: str = "app/ml/ecg_autoencoder.pt",
) -> None:
    """Train the autoencoder on synthetic ECG data and save weights.

    Args:
        epochs: Number of training epochs.
        batch_size: Number of ECG windows per mini-batch.
        batches_per_epoch: How many batches to generate each epoch.
        lr: Initial learning rate.
        output_path: Path to save the final model weights.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[train_mock] Training on device: {device}")

    model = ECGAutoencoder(latent_dim=32).to(device)
    optimizer = Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)
    criterion = nn.MSELoss()

    model.train()
    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        for _ in range(batches_per_epoch):
            x = generate_ecg_batch(batch_size).to(device)
            optimizer.zero_grad()
            x_hat = model(x)
            loss = criterion(x_hat, x)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            epoch_loss += loss.item()

        scheduler.step()
        avg_loss = epoch_loss / batches_per_epoch
        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:3d}/{epochs}  loss={avg_loss:.6f}  lr={scheduler.get_last_lr()[0]:.2e}")

    # Save weights
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    torch.save(model.state_dict(), output_path)
    print(f"\n[train_mock] Model saved -> {output_path}")


if __name__ == "__main__":
    train()
