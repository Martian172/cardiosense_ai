import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  User,
  ECGScan,
  ScanAnalysisResult,
  ScanListItem,
  CreateScanPayload,
  ScanStats,
  ChatRequest,
  ChatResponse,
  AnalyticsData,
  PaginatedResponse,
} from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Axios Instance ─────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Request interceptor: attach Bearer token ───────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const raw = localStorage.getItem('cardiosense-store');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { state?: { token?: string } };
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // ignore parse errors
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor: handle 401 ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on auth pages
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('cardiosense-store');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Full auth response type (includes user) ───────────────────────────────────
interface FullAuthResponse extends AuthTokens {
  user: User;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<FullAuthResponse> => {
    const { data } = await apiClient.post<FullAuthResponse>('/api/auth/login', credentials);
    return data;
  },

  register: async (credentials: RegisterCredentials): Promise<FullAuthResponse> => {
    const { data } = await apiClient.post<FullAuthResponse>('/api/auth/register', credentials);
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/api/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Logout errors are non-fatal — clear local state regardless
    }
  },
};

// ── Scans API ─────────────────────────────────────────────────────────────────
export const scansApi = {
  list: async (page = 1, size = 20): Promise<PaginatedResponse<ScanListItem>> => {
    const { data } = await apiClient.get<PaginatedResponse<ScanListItem>>('/api/scans', {
      params: { page, size },
    });
    return data;
  },

  get: async (id: string): Promise<ScanAnalysisResult> => {
    const { data } = await apiClient.get<ScanAnalysisResult>(`/api/scans/${id}`);
    return data;
  },

  create: async (payload: CreateScanPayload): Promise<ScanAnalysisResult> => {
    const { data } = await apiClient.post<ScanAnalysisResult>('/api/scans/analyze', payload);
    return data;
  },

  demo: async (): Promise<ScanAnalysisResult> => {
    const { data } = await apiClient.post<ScanAnalysisResult>('/api/scans/demo');
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/scans/${id}`);
  },

  stats: async (): Promise<ScanStats> => {
    const { data } = await apiClient.get<ScanStats>('/api/scans/stats');
    return data;
  },

  updateNotes: async (id: string, notes: string): Promise<ECGScan> => {
    const { data } = await apiClient.patch<ECGScan>(`/api/scans/${id}`, { notes });
    return data;
  },
};

// ── Agent/Chat API ─────────────────────────────────────────────────────────────
export const agentApi = {
  chat: async (request: ChatRequest): Promise<ChatResponse> => {
    const { data } = await apiClient.post<ChatResponse>('/api/agent/chat', request);
    return data;
  },
};

// ── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  getData: async (days = 30): Promise<AnalyticsData> => {
    const { data } = await apiClient.get<AnalyticsData>('/api/analytics', {
      params: { days },
    });
    return data;
  },
};
