import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatAnomalyScore(score: number): string {
  return (score * 100).toFixed(1) + '%';
}

export function formatReconstructionError(err: number): string {
  return err.toFixed(4);
}

export function getAnomalySeverity(score: number): 'critical' | 'warning' | 'normal' {
  if (score >= 0.7) return 'critical';
  if (score >= 0.4) return 'warning';
  return 'normal';
}

export function generateDemoECG(lengthSeconds = 10, sampleRate = 250): number[] {
  const total = lengthSeconds * sampleRate;
  const data: number[] = [];
  const heartRateBpm = 72;
  const samplesPerBeat = Math.round((60 / heartRateBpm) * sampleRate);

  for (let i = 0; i < total; i++) {
    const posInBeat = i % samplesPerBeat;
    const normalizedPos = posInBeat / samplesPerBeat;
    let value = 0;

    // Baseline
    value += (Math.random() - 0.5) * 0.02;

    // P wave
    if (normalizedPos > 0.05 && normalizedPos < 0.15) {
      const pPhase = (normalizedPos - 0.05) / 0.10;
      value += 0.15 * Math.sin(Math.PI * pPhase);
    }

    // Q wave
    if (normalizedPos > 0.18 && normalizedPos < 0.21) {
      const qPhase = (normalizedPos - 0.18) / 0.03;
      value -= 0.1 * Math.sin(Math.PI * qPhase);
    }

    // R wave (main QRS spike)
    if (normalizedPos > 0.20 && normalizedPos < 0.26) {
      const rPhase = (normalizedPos - 0.20) / 0.06;
      value += 1.2 * Math.sin(Math.PI * rPhase);
    }

    // S wave
    if (normalizedPos > 0.25 && normalizedPos < 0.29) {
      const sPhase = (normalizedPos - 0.25) / 0.04;
      value -= 0.2 * Math.sin(Math.PI * sPhase);
    }

    // T wave
    if (normalizedPos > 0.35 && normalizedPos < 0.55) {
      const tPhase = (normalizedPos - 0.35) / 0.20;
      value += 0.3 * Math.sin(Math.PI * tPhase);
    }

    data.push(parseFloat(value.toFixed(4)));
  }

  return data;
}

export function injectAnomalies(data: number[]): { data: number[]; regions: [number, number][] } {
  const mutated = [...data];
  const regions: [number, number][] = [];

  // Inject 2-3 anomalous regions
  const numAnomalies = 2 + Math.floor(Math.random() * 2);
  for (let a = 0; a < numAnomalies; a++) {
    const start = Math.floor(Math.random() * (data.length - 150)) + 50;
    const length = 50 + Math.floor(Math.random() * 100);
    const end = Math.min(start + length, data.length - 1);
    regions.push([start, end]);

    for (let i = start; i <= end; i++) {
      // Exaggerated spike or flat segment
      if (Math.random() > 0.5) {
        mutated[i] = mutated[i] * (2 + Math.random() * 3);
      } else {
        mutated[i] = (Math.random() - 0.5) * 0.05;
      }
    }
  }

  return { data: mutated, regions };
}

export function calculateHeartRate(ecgData: number[], sampleRate = 250): number {
  if (ecgData.length < sampleRate) return 0;

  // Simple peak detection
  const threshold = Math.max(...ecgData) * 0.6;
  let peaks = 0;
  let inPeak = false;

  for (let i = 1; i < ecgData.length - 1; i++) {
    if (ecgData[i] > threshold && !inPeak) {
      peaks++;
      inPeak = true;
    } else if (ecgData[i] < threshold * 0.5) {
      inPeak = false;
    }
  }

  const durationSeconds = ecgData.length / sampleRate;
  return Math.round((peaks / durationSeconds) * 60);
}

export function downsampleECG(data: number[], targetPoints = 500): number[] {
  if (data.length <= targetPoints) return data;
  const factor = Math.ceil(data.length / targetPoints);
  return data.filter((_, i) => i % factor === 0);
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
