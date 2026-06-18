import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { PageLayout } from '@/components/layout/PageLayout';

// Pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { AnalyzePage } from '@/pages/AnalyzePage';
import { ScanDetailPage } from '@/pages/ScanDetailPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';

// ── Route Guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* ── Public routes ── */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* ── Protected routes (wrapped in PageLayout with Sidebar + ChatWidget) ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageLayout>
                <DashboardPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitor"
          element={
            <ProtectedRoute>
              <PageLayout>
                <MonitorPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze"
          element={
            <ProtectedRoute>
              <PageLayout>
                <AnalyzePage />
              </PageLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze/:scanId"
          element={
            <ProtectedRoute>
              <PageLayout>
                <ScanDetailPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scans/:scanId"
          element={
            <ProtectedRoute>
              <PageLayout>
                <ScanDetailPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <PageLayout>
                <AnalyticsPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageLayout>
                <SettingsPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
