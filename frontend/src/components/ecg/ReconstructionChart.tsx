import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  type TooltipProps,
} from 'recharts';
import { downsampleECG } from '@/lib/utils';
import type { AnomalyRegion } from '@/types';

interface ReconstructionChartProps {
  original: number[];
  reconstructed: number[];
  anomalyRegions?: AnomalyRegion[];
  sampleRate?: number;
  height?: number;
}

interface ChartDataPoint {
  timeMs: number;
  original: number;
  reconstructed: number;
  error: number;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartDataPoint;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1530]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm space-y-1">
      <p className="text-slate-400">Time: <span className="text-slate-200">{d.timeMs.toFixed(0)} ms</span></p>
      <p className="text-slate-400">Original: <span className="text-primary font-mono">{d.original.toFixed(4)} mV</span></p>
      <p className="text-slate-400">Reconstructed: <span className="text-secondary-300 font-mono">{d.reconstructed.toFixed(4)} mV</span></p>
      <p className="text-slate-400">Error: <span className={`font-mono ${d.error > 0.1 ? 'text-danger' : 'text-emerald-400'}`}>{d.error.toFixed(4)}</span></p>
    </div>
  );
};

export function ReconstructionChart({
  original,
  reconstructed,
  sampleRate = 250,
  height = 220,
}: ReconstructionChartProps) {
  const chartData = useMemo(() => {
    const displayOrig = downsampleECG(original, 600);
    const displayRecon = downsampleECG(reconstructed, 600);
    const len = Math.min(displayOrig.length, displayRecon.length);

    return Array.from({ length: len }, (_, i) => {
      const origIdx = Math.round((i / len) * original.length);
      return {
        timeMs: (origIdx / sampleRate) * 1000,
        original: displayOrig[i] ?? 0,
        reconstructed: displayRecon[i] ?? 0,
        error: Math.abs((displayOrig[i] ?? 0) - (displayRecon[i] ?? 0)),
      };
    });
  }, [original, reconstructed, sampleRate]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="timeMs"
          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`}
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          tickFormatter={(v: number) => v.toFixed(2)}
          label={{ value: 'mV', angle: -90, position: 'insideLeft', offset: -5, style: { fill: '#64748b', fontSize: 10 } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-slate-400 capitalize">{value}</span>
          )}
          wrapperStyle={{ paddingTop: '8px' }}
        />
        <Line
          type="monotone"
          dataKey="original"
          stroke="#00d4aa"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          name="Original"
        />
        <Line
          type="monotone"
          dataKey="reconstructed"
          stroke="#6366f1"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          strokeDasharray="4 2"
          name="Reconstructed"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
