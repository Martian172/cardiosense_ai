"""
app/services/ecg_model.py — ECG Autoencoder inference service.

Implements a singleton ``ECGModelService`` that:
1. Loads pre-trained ``ECGAutoencoder`` weights on startup.
2. Provides a ``predict()`` method that runs full inference on an ECG signal.
3. Detects anomalous windows by sliding over the signal and comparing local
   MSE reconstruction error against a configurable threshold.
4. Returns a rich result dict used by the API routers.

Usage::

    from app.services.ecg_model import get_ecg_service

    service = get_ecg_service()
    result = service.predict(ecg_data)
"""

from __future__ import annotations

import logging
import os
from typing import TypedDict

import numpy as np
import torch
import torch.nn.functional as F

from app.core.config import settings
from app.ml.model import ECGAutoencoder

logger = logging.getLogger(__name__)


# ── Type aliases ──────────────────────────────────────────────────────────────

class AnomalyRegionDict(TypedDict):
    start: int
    end: int


class PredictionResult(TypedDict):
    reconstruction_error: float
    anomaly_score: float
    is_anomalous: bool
    anomaly_regions: list[AnomalyRegionDict]
    reconstructed_signal: list[float]


# ── Service ───────────────────────────────────────────────────────────────────

class ECGModelService:
    """Singleton service wrapping the ECG Autoencoder for inference.

    Attributes:
        model: Loaded ``ECGAutoencoder`` in eval mode.
        device: Torch device used for inference (CPU in production w/o GPU).
        segment_length: Expected input length (500 samples).
        threshold: MSE threshold above which a window is flagged anomalous.
    """

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.segment_length: int = settings.ECG_SEGMENT_LENGTH
        self.threshold: float = settings.ANOMALY_THRESHOLD
        self.model: ECGAutoencoder | None = None
        self._loaded: bool = False

    def load(self) -> None:
        """Load model weights from disk.

        If the weight file does not exist, the model is initialised with
        random weights and a warning is emitted (useful in CI/CD pipelines
        before ``train_mock.py`` has been run).
        """
        model = ECGAutoencoder(latent_dim=32).to(self.device)

        path = settings.MODEL_PATH
        if os.path.exists(path):
            state_dict = torch.load(path, map_location=self.device, weights_only=True)
            model.load_state_dict(state_dict)
            logger.info("ECGAutoencoder loaded from %s", path)
        else:
            logger.warning(
                "Model weights not found at %s. Using random initialisation. "
                "Run `python -m app.ml.train_mock` to generate weights.",
                path,
            )

        model.eval()
        self.model = model
        self._loaded = True

    def _preprocess(self, ecg_signal: list[float]) -> torch.Tensor:
        """Convert a raw signal list to a properly shaped tensor.

        Steps:
        1. Pad or truncate to ``segment_length`` samples.
        2. Normalise to [-1, 1].
        3. Reshape to ``(1, 1, segment_length)`` for the model.
        """
        arr = np.array(ecg_signal, dtype=np.float32)

        # Pad or truncate
        if len(arr) < self.segment_length:
            arr = np.pad(arr, (0, self.segment_length - len(arr)), mode="edge")
        else:
            arr = arr[: self.segment_length]

        # Normalise
        rng = arr.max() - arr.min()
        if rng > 1e-8:
            arr = 2 * (arr - arr.min()) / rng - 1

        tensor = torch.from_numpy(arr).unsqueeze(0).unsqueeze(0)  # (1, 1, L)
        return tensor.to(self.device)

    def _find_anomaly_regions(
        self,
        original: np.ndarray,
        reconstructed: np.ndarray,
        window_size: int = 50,
        step: int = 25,
    ) -> list[AnomalyRegionDict]:
        """Slide a window over the signal and flag high-error regions.

        Args:
            original: Raw ECG signal array.
            reconstructed: Autoencoder output array (same shape).
            window_size: Window length in samples.
            step: Stride between windows.

        Returns:
            List of ``{start, end}`` dicts for anomalous windows.
            Adjacent/overlapping windows are merged into contiguous regions.
        """
        raw_regions: list[tuple[int, int]] = []

        for start in range(0, len(original) - window_size + 1, step):
            end = start + window_size
            window_err = float(
                np.mean((original[start:end] - reconstructed[start:end]) ** 2)
            )
            if window_err > self.threshold:
                raw_regions.append((start, end))

        if not raw_regions:
            return []

        # Merge overlapping / adjacent windows
        merged: list[AnomalyRegionDict] = []
        cur_start, cur_end = raw_regions[0]
        for s, e in raw_regions[1:]:
            if s <= cur_end:  # overlapping or adjacent
                cur_end = max(cur_end, e)
            else:
                merged.append({"start": cur_start, "end": cur_end})
                cur_start, cur_end = s, e
        merged.append({"start": cur_start, "end": cur_end})
        return merged

    @torch.no_grad()
    def predict(self, ecg_signal: list[float]) -> PredictionResult:
        """Run the autoencoder on *ecg_signal* and return a full result dict.

        Args:
            ecg_signal: Raw ECG amplitude values (any length; will be padded
                or truncated to ``segment_length`` internally).

        Returns:
            ``PredictionResult`` typed dict with all inference outputs.

        Raises:
            RuntimeError: If ``load()`` has not been called yet.
        """
        if not self._loaded or self.model is None:
            raise RuntimeError(
                "ECGModelService.load() must be called before predict()."
            )

        # Preprocess
        x = self._preprocess(ecg_signal)

        # Forward pass
        x_hat = self.model(x)

        # MSE reconstruction error
        mse = float(F.mse_loss(x_hat, x).item())

        # Anomaly score: scale MSE relative to threshold for 0-1 output
        # Using a softer scaling: score = mse / (mse + threshold)
        # This gives 0.5 at threshold and saturates slowly, avoiding always-1.0
        threshold = max(self.threshold, 1e-9)
        anomaly_score = float(mse / (mse + threshold))
        anomaly_score = round(min(max(anomaly_score, 0.0), 0.99), 4)

        is_anomalous = mse > self.threshold


        # Extract numpy arrays for region detection
        orig_np = x.squeeze().cpu().numpy()
        recon_np = x_hat.squeeze().cpu().numpy()

        anomaly_regions = self._find_anomaly_regions(orig_np, recon_np)

        return {
            "reconstruction_error": mse,
            "anomaly_score": anomaly_score,
            "is_anomalous": is_anomalous,
            "anomaly_regions": anomaly_regions,
            "reconstructed_signal": recon_np.tolist(),
        }


# ── Module-level singleton ────────────────────────────────────────────────────
_service_instance: ECGModelService | None = None


def get_ecg_service() -> ECGModelService:
    """Return the module-level singleton ECGModelService.

    Raises RuntimeError if ``initialise_ecg_service()`` has not been called.
    """
    global _service_instance
    if _service_instance is None:
        raise RuntimeError(
            "ECG service has not been initialised. "
            "Call initialise_ecg_service() during app startup."
        )
    return _service_instance


def initialise_ecg_service() -> ECGModelService:
    """Create and load the singleton ECGModelService.

    Idempotent — safe to call multiple times.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = ECGModelService()
        _service_instance.load()
    return _service_instance
