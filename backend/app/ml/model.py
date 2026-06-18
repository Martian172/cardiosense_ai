"""
app/ml/model.py — PyTorch ECG Autoencoder architecture.

Architecture overview
---------------------
Input:  (batch, 1, 500)  — 500 samples at 250 Hz = 2 seconds of ECG
Encoder compresses the signal to a 32-dimensional latent vector via
1-D convolutional blocks with BatchNorm and MaxPool.
Decoder reconstructs the original length via transposed convolutions.
Reconstruction error (MSE) is used as the anomaly score at inference.

  Conv1d layers use causal-style padding to preserve time alignment.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    """Encoder building block: Conv1d → BatchNorm → ReLU."""

    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 7) -> None:
        super().__init__()
        padding = (kernel_size - 1) // 2
        self.block = nn.Sequential(
            nn.Conv1d(in_channels, out_channels, kernel_size, padding=padding),
            nn.BatchNorm1d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class TransposeConvBlock(nn.Module):
    """Decoder building block: ConvTranspose1d → BatchNorm → ReLU."""

    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 7) -> None:
        super().__init__()
        padding = (kernel_size - 1) // 2
        self.block = nn.Sequential(
            nn.ConvTranspose1d(in_channels, out_channels, kernel_size, padding=padding),
            nn.BatchNorm1d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class ECGEncoder(nn.Module):
    """Encodes a 500-sample ECG window into a compact latent representation."""

    def __init__(self, latent_dim: int = 32) -> None:
        super().__init__()
        # Progressive downsampling: 500 → 250 → 125 → 62 → 31
        self.conv1 = ConvBlock(1, 32, kernel_size=7)
        self.pool1 = nn.MaxPool1d(kernel_size=2, stride=2)  # → (32, 250)

        self.conv2 = ConvBlock(32, 64, kernel_size=5)
        self.pool2 = nn.MaxPool1d(kernel_size=2, stride=2)  # → (64, 125)

        self.conv3 = ConvBlock(64, 128, kernel_size=5)
        self.pool3 = nn.MaxPool1d(kernel_size=2, stride=2)  # → (128, 62)

        self.conv4 = ConvBlock(128, 256, kernel_size=3)
        self.pool4 = nn.MaxPool1d(kernel_size=2, stride=2)  # → (256, 31)

        # Flatten → latent projection
        self._flat_dim = 256 * 31
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(self._flat_dim, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(512, latent_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: (B, 1, 500) → latent: (B, latent_dim)"""
        x = self.pool1(self.conv1(x))
        x = self.pool2(self.conv2(x))
        x = self.pool3(self.conv3(x))
        x = self.pool4(self.conv4(x))
        return self.fc(x)


class ECGDecoder(nn.Module):
    """Reconstructs a 500-sample ECG window from a latent vector."""

    def __init__(self, latent_dim: int = 32) -> None:
        super().__init__()
        self._flat_dim = 256 * 31

        self.fc = nn.Sequential(
            nn.Linear(latent_dim, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(512, self._flat_dim),
            nn.ReLU(inplace=True),
        )
        self.unflatten = nn.Unflatten(1, (256, 31))

        # Progressive upsampling: 31 → 62 → 124 → 248 → 496 → pad/crop to 500
        self.deconv4 = TransposeConvBlock(256, 128, kernel_size=3)
        self.up4 = nn.Upsample(scale_factor=2, mode="linear", align_corners=False)  # → 62

        self.deconv3 = TransposeConvBlock(128, 64, kernel_size=5)
        self.up3 = nn.Upsample(scale_factor=2, mode="linear", align_corners=False)  # → 124

        self.deconv2 = TransposeConvBlock(64, 32, kernel_size=5)
        self.up2 = nn.Upsample(scale_factor=2, mode="linear", align_corners=False)  # → 248

        self.deconv1 = TransposeConvBlock(32, 16, kernel_size=7)
        self.up1 = nn.Upsample(scale_factor=2, mode="linear", align_corners=False)  # → 496

        # Final output — no activation (ECG values are unbounded floats)
        self.output_conv = nn.Conv1d(16, 1, kernel_size=5, padding=2)

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        """z: (B, latent_dim) → reconstructed: (B, 1, 500)"""
        x = self.unflatten(self.fc(z))                  # (B, 256, 31)
        x = self.up4(self.deconv4(x))                   # (B, 128, 62)
        x = self.up3(self.deconv3(x))                   # (B, 64, 124)
        x = self.up2(self.deconv2(x))                   # (B, 32, 248)
        x = self.up1(self.deconv1(x))                   # (B, 16, 496)
        x = self.output_conv(x)                         # (B, 1, 496)
        # Pad or crop to exactly 500 samples
        if x.size(-1) < 500:
            x = torch.nn.functional.pad(x, (0, 500 - x.size(-1)))
        elif x.size(-1) > 500:
            x = x[..., :500]
        return x


class ECGAutoencoder(nn.Module):
    """Full ECG Autoencoder combining encoder and decoder.

    Usage::

        model = ECGAutoencoder(latent_dim=32)
        x = torch.randn(4, 1, 500)   # batch of 4 ECG windows
        reconstructed = model(x)     # same shape as x
        loss = nn.MSELoss()(reconstructed, x)
    """

    def __init__(self, latent_dim: int = 32) -> None:
        super().__init__()
        self.encoder = ECGEncoder(latent_dim=latent_dim)
        self.decoder = ECGDecoder(latent_dim=latent_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Encode then decode *x*. Returns reconstruction of same shape."""
        z = self.encoder(x)
        return self.decoder(z)

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Return the latent representation without decoding."""
        return self.encoder(x)
