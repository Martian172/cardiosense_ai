import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { SkeletonBlock } from '@/components/ui/LoadingSpinner';
import type { ScanStats } from '@/types';

interface AnomalyDistributionChartProps {
  stats: ScanStats | undefined;
  isLoading: boolean;
}

const COLORS = ['#00d4aa', '#ef4444'];

export function AnomalyDistributionChart({ stats, isLoading }: AnomalyDistributionChartProps) {
  const data = stats
    ? [
        { name: 'Normal', value: stats.normal_scans },
        { name: 'Anomalous', value: stats.anomalous_scans },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Distribution</CardTitle>
      </CardHeader>

      {isLoading ? (
        <SkeletonBlock className="h-52 rounded-lg" />
      ) : !stats || stats.total_scans === 0 ? (
        <div className="flex h-52 items-center justify-center">
          <p className="text-sm text-slate-500">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0];
                return (
                  <div className="rounded-lg border border-white/10 bg-[#0d1530]/95 px-3 py-2 text-xs backdrop-blur-sm">
                    <p className="font-medium text-slate-200">{entry.name}</p>
                    <p className="text-slate-400">Count: <span className="text-slate-200">{entry.value}</span></p>
                  </div>
                );
              }}
            />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-slate-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* Center stats */}
      {stats && stats.total_scans > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <p className="text-lg font-bold text-primary">{stats.normal_scans}</p>
            <p className="text-xs text-slate-500">Normal</p>
          </div>
          <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-center">
            <p className="text-lg font-bold text-danger">{stats.anomalous_scans}</p>
            <p className="text-xs text-slate-500">Anomalous</p>
          </div>
        </div>
      )}
    </Card>
  );
}
