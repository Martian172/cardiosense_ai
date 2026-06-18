import { motion } from 'framer-motion';
import { Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SkeletonBlock } from '@/components/ui/LoadingSpinner';
import { formatRelativeTime, formatAnomalyScore } from '@/lib/utils';
import type { ScanStats } from '@/types';

interface StatsCardsProps {
  stats: ScanStats | undefined;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Scans',
      value: stats?.total_scans ?? 0,
      subtext: 'All time',
      icon: <Activity className="h-5 w-5" />,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
      glow: 'primary' as const,
    },
    {
      label: 'Anomalies Detected',
      value: stats?.anomalous_scans ?? 0,
      subtext: `${stats ? Math.round((stats.anomalous_scans / Math.max(stats.total_scans, 1)) * 100) : 0}% of scans`,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-danger',
      bg: 'bg-danger/10 border-danger/20',
      glow: 'danger' as const,
    },
    {
      label: 'Avg Anomaly Score',
      value: stats ? formatAnomalyScore(stats.avg_anomaly_score) : '0.0%',
      subtext: 'Risk indicator',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-secondary-300',
      bg: 'bg-secondary/10 border-secondary/20',
      glow: 'secondary' as const,
    },
    {
      label: 'Last Scan',
      value: stats?.last_scan_at ? formatRelativeTime(stats.last_scan_at) : 'Never',
      subtext: stats?.last_scan_at ? 'Most recent analysis' : 'Run your first scan',
      icon: <Clock className="h-5 w-5" />,
      color: 'text-slate-300',
      bg: 'bg-white/5 border-white/10',
      glow: 'none' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
        >
          {isLoading ? (
            <SkeletonBlock className="h-32 rounded-xl" />
          ) : (
            <Card hoverable glow={card.glow} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.subtext}</p>
                </div>
                <div className={`rounded-lg border p-2.5 ${card.bg} ${card.color}`}>
                  {card.icon}
                </div>
              </div>
              {/* Decorative gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </Card>
          )}
        </motion.div>
      ))}
    </div>
  );
}
