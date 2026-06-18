import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { SkeletonBlock } from '@/components/ui/LoadingSpinner';
import { useScansList, useScanStats } from '@/hooks/useScans';
import { format, subDays } from 'date-fns';

// Generate mock analytics data
function useMockAnalytics() {
  return useMemo(() => {
    const days = 30;
    const daily = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i);
      const total = Math.floor(Math.random() * 8) + 1;
      const anomalous = Math.floor(Math.random() * Math.min(total, 4));
      return {
        date: format(date, 'MMM d'),
        total,
        anomalous,
        normal: total - anomalous,
      };
    });

    const scoreTimeline = Array.from({ length: days }, (_, i) => ({
      date: format(subDays(new Date(), days - 1 - i), 'MMM d'),
      avg_score: parseFloat((0.1 + Math.random() * 0.7).toFixed(3)),
      threshold: 0.5,
    }));

    return { daily, scoreTimeline };
  }, []);
}

const CHART_COLORS = {
  primary: '#00d4aa',
  danger: '#ef4444',
  secondary: '#6366f1',
  warning: '#f59e0b',
};

const tooltipStyle = {
  contentStyle: {
    background: '#0d1530',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#f1f5f9',
  },
};

export function AnalyticsPage() {
  const { data: stats, isLoading: isLoadingStats } = useScanStats();
  const { isLoading: isLoadingScans } = useScansList(1, 1);
  const { daily, scoreTimeline } = useMockAnalytics();

  const isLoading = isLoadingStats || isLoadingScans;

  const pieData = stats
    ? [
        { name: 'Normal', value: stats.normal_scans, color: CHART_COLORS.primary },
        { name: 'Anomalous', value: stats.anomalous_scans, color: CHART_COLORS.danger },
      ]
    : [];

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        </div>
        <p className="text-sm text-slate-500">Historical scan analysis and trends — last 30 days</p>
      </motion.div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: stats?.total_scans ?? '—', color: 'text-primary' },
          { label: 'Anomalous', value: stats?.anomalous_scans ?? '—', color: 'text-danger' },
          { label: 'Normal', value: stats?.normal_scans ?? '—', color: 'text-emerald-400' },
          {
            label: 'Anomaly Rate',
            value: stats ? `${Math.round((stats.anomalous_scans / Math.max(stats.total_scans, 1)) * 100)}%` : '—',
            color: 'text-warning',
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            {isLoading ? (
              <SkeletonBlock className="h-20 rounded-xl" />
            ) : (
              <Card padding="md" className="text-center">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </Card>
            )}
          </motion.div>
        ))}
      </div>

      {/* Anomaly Score Timeline — Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Score Timeline</CardTitle>
          <span className="text-xs text-slate-500">Average score per day</span>
        </CardHeader>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={scoreTimeline} margin={{ top: 5, right: 5, bottom: 5, left: 30 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.15} />
                <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Avg Score']} />
            <Legend formatter={(v: string) => <span className="text-xs text-slate-400">{v}</span>} />
            <Area
              type="monotone"
              dataKey="avg_score"
              name="Avg Score"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#areaGrad)"
            />
            <Area
              type="monotone"
              dataKey="threshold"
              name="Threshold (50%)"
              stroke={CHART_COLORS.danger}
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="url(#dangerGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom row: Bar chart + Pie chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scans per day — Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Scans Per Day</CardTitle>
            <span className="text-xs text-slate-500">Normal vs Anomalous</span>
          </CardHeader>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Legend formatter={(v: string) => <span className="text-xs text-slate-400 capitalize">{v}</span>} />
              <Bar dataKey="normal" name="Normal" fill={CHART_COLORS.primary} opacity={0.8} radius={[2, 2, 0, 0]} />
              <Bar dataKey="anomalous" name="Anomalous" fill={CHART_COLORS.danger} opacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Distribution</CardTitle>
            <span className="text-xs text-slate-500">All time</span>
          </CardHeader>
          {isLoading ? (
            <SkeletonBlock className="h-52 rounded-lg" />
          ) : pieData.every((d) => d.value === 0) ? (
            <div className="flex h-52 items-center justify-center">
              <p className="text-sm text-slate-500">No scan data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) => [v, name]}
                />
                <Legend formatter={(v: string) => <span className="text-xs text-slate-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
