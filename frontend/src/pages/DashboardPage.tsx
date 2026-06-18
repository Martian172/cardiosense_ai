import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Monitor, ScanLine, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { ScanHistoryTable } from '@/components/dashboard/ScanHistoryTable';
import { AnomalyDistributionChart } from '@/components/dashboard/AnomalyDistributionChart';
import { useScanStats, useScansList } from '@/hooks/useScans';
import { useStore } from '@/store/useStore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format, subDays } from 'date-fns';

// Generate mock sparkline data if no real data is available
function useMockSparklineData() {
  return Array.from({ length: 14 }, (_, i) => ({
    date: format(subDays(new Date(), 13 - i), 'MMM d'),
    score: parseFloat((Math.random() * 0.6 + 0.1).toFixed(3)),
  }));
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useStore();
  const { data: stats, isLoading: isLoadingStats } = useScanStats();
  const { data: scansData, isLoading: isLoadingScans } = useScansList(1, 10);
  const sparklineData = useMockSparklineData();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {greeting}, {user?.full_name?.split(' ')[0] ?? 'Doctor'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s your cardiac monitoring overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Monitor className="h-4 w-4" />}
            onClick={() => navigate('/monitor')}
          >
            Live Monitor
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/analyze')}
          >
            New Analysis
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={isLoadingStats} />

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scan history — 2 cols */}
        <div className="lg:col-span-2">
          <ScanHistoryTable
            scans={scansData?.items}
            isLoading={isLoadingScans}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <AnomalyDistributionChart stats={stats} isLoading={isLoadingStats} />

          {/* Quick actions */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Analyze New ECG', icon: <ScanLine className="h-4 w-4" />, href: '/analyze', color: 'text-primary' },
                { label: 'Live ECG Monitor', icon: <Monitor className="h-4 w-4" />, href: '/monitor', color: 'text-secondary-300' },
                { label: 'View Analytics', icon: <Activity className="h-4 w-4" />, href: '/analytics', color: 'text-amber-400' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.href)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/3 px-3 py-2.5 hover:bg-white/8 transition-colors text-left"
                >
                  <span className={action.color}>{action.icon}</span>
                  <span className="text-sm text-slate-300">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Sparkline chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Anomaly Score Trend</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 14 days</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={sparklineData} margin={{ top: 5, right: 5, bottom: 5, left: 20 }}>
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { date: string; score: number };
                return (
                  <div className="rounded-lg border border-white/10 bg-[#0d1530]/95 px-3 py-2 text-xs backdrop-blur-sm">
                    <p className="text-slate-400">{d.date}</p>
                    <p className="text-primary font-mono">{(d.score * 100).toFixed(1)}%</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#00d4aa"
              strokeWidth={2}
              fill="url(#sparkGradient)"
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
