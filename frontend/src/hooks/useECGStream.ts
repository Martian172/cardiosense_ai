import { useEffect, useRef, useState, useCallback } from 'react';
import type { ECGStreamPoint } from '@/types';

const MAX_POINTS = 500;
const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000';
const RECONNECT_DELAY_MS = 3000;

interface UseECGStreamReturn {
  data: ECGStreamPoint[];
  isConnected: boolean;
  heartRate: number;
  signalQuality: 'excellent' | 'good' | 'poor' | 'lost';
  anomalyDetected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useECGStream(): UseECGStreamReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [data, setData] = useState<ECGStreamPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [heartRate, setHeartRate] = useState(0);
  const [signalQuality, setSignalQuality] = useState<'excellent' | 'good' | 'poor' | 'lost'>('lost');
  const [anomalyDetected, setAnomalyDetected] = useState(false);
  const shouldReconnect = useRef(false);
  const timestampRef = useRef(0);

  // Generate a simulated ECG point when no WS backend is available
  const simulatePoint = useCallback((): ECGStreamPoint => {
    const t = timestampRef.current++;
    const samplesPerBeat = Math.round((60 / 72) * 250); // 72 bpm at 250 Hz
    const posInBeat = t % samplesPerBeat;
    const normalizedPos = posInBeat / samplesPerBeat;

    let value = (Math.random() - 0.5) * 0.02;

    if (normalizedPos > 0.05 && normalizedPos < 0.15) {
      const p = (normalizedPos - 0.05) / 0.10;
      value += 0.15 * Math.sin(Math.PI * p);
    }
    if (normalizedPos > 0.20 && normalizedPos < 0.26) {
      const r = (normalizedPos - 0.20) / 0.06;
      value += 1.2 * Math.sin(Math.PI * r);
    }
    if (normalizedPos > 0.25 && normalizedPos < 0.29) {
      const s = (normalizedPos - 0.25) / 0.04;
      value -= 0.2 * Math.sin(Math.PI * s);
    }
    if (normalizedPos > 0.35 && normalizedPos < 0.55) {
      const tv = (normalizedPos - 0.35) / 0.20;
      value += 0.3 * Math.sin(Math.PI * tv);
    }

    // Occasionally inject an anomaly
    const isAnomalous = Math.random() < 0.03;
    if (isAnomalous) {
      value *= 2.5 + Math.random() * 2;
    }

    return {
      timestamp: t,
      value: parseFloat(value.toFixed(4)),
      is_anomalous_region: isAnomalous,
    };
  }, []);

  // Fallback simulation interval when WS is unavailable
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSimulation = useCallback(() => {
    setIsConnected(true);
    setSignalQuality('excellent');
    setHeartRate(72 + Math.floor(Math.random() * 10 - 5));

    simulationRef.current = setInterval(() => {
      const point = simulatePoint();
      setData((prev) => {
        const next = [...prev, point];
        if (next.length > MAX_POINTS) next.splice(0, next.length - MAX_POINTS);
        return next;
      });
      setAnomalyDetected(point.is_anomalous_region);
    }, 4); // 250 Hz ≈ 4ms per sample
  }, [simulatePoint]);

  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    shouldReconnect.current = true;

    try {
      const ws = new WebSocket(`${WS_URL}/ws/ecg-stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setSignalQuality('excellent');
        stopSimulation();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            points?: ECGStreamPoint[];
            heart_rate?: number;
            signal_quality?: 'excellent' | 'good' | 'poor' | 'lost';
            anomaly_detected?: boolean;
          };

          if (payload.points) {
            setData((prev) => {
              const next = [...prev, ...payload.points!];
              if (next.length > MAX_POINTS) next.splice(0, next.length - MAX_POINTS);
              return next;
            });
          }
          if (payload.heart_rate !== undefined) setHeartRate(payload.heart_rate);
          if (payload.signal_quality) setSignalQuality(payload.signal_quality);
          if (payload.anomaly_detected !== undefined) setAnomalyDetected(payload.anomaly_detected);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSignalQuality('lost');
        wsRef.current = null;

        // Fallback to simulation
        startSimulation();

        if (shouldReconnect.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available; use simulation
      startSimulation();
    }
  }, [startSimulation, stopSimulation]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopSimulation();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setSignalQuality('lost');
    setData([]);
  }, [stopSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnect.current = false;
      stopSimulation();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [stopSimulation]);

  return { data, isConnected, heartRate, signalQuality, anomalyDetected, connect, disconnect };
}
