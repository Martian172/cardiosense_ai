// ── User & Auth ──────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

// ── ECG & Scans ───────────────────────────────────────────────────────────────
export interface AnomalyRegion {
  start: number;
  end: number;
}

export interface ECGScan {
  id: string;
  scan_name: string;
  reconstruction_error: number;
  anomaly_score: number;
  is_anomalous: boolean;
  anomaly_regions: AnomalyRegion[];
  raw_ecg_data: number[];
  created_at: string;
  notes?: string;
}

export interface ScanAnalysisResult extends ECGScan {
  reconstructed_signal?: number[];
  scan_type?: string; // from demo endpoint
}

export interface ScanListItem {
  id: string;
  scan_name: string;
  reconstruction_error: number;
  anomaly_score: number;
  is_anomalous: boolean;
  created_at: string;
}

export interface CreateScanPayload {
  scan_name: string;
  ecg_data: number[];
  notes?: string;
}

export interface ScanStats {
  total_scans: number;
  anomalous_scans: number;
  normal_scans: number;
  avg_anomaly_score: number;
  last_scan_at: string | null;
}

// ── Real-time ECG Streaming ──────────────────────────────────────────────────
export interface ECGStreamPoint {
  timestamp: number;
  value: number;
  is_anomalous_region: boolean;
}

export interface StreamStatus {
  connected: boolean;
  heart_rate: number;
  signal_quality: 'excellent' | 'good' | 'poor' | 'lost';
  anomaly_detected: boolean;
}

// ── Chat / Agent ──────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  scan_id?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  sources?: string[];
  fallback?: boolean;
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface DailyCount {
  date: string;
  total: number;
  anomalous: number;
}

export interface AnalyticsData {
  daily_counts: DailyCount[];
  score_timeline: { date: string; avg_score: number }[];
  anomaly_distribution: { label: string; value: number }[];
}

// ── UI State ──────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
