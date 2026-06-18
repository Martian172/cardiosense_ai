import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  type TooltipProps,
} from 'recharts';
import { downsampleECG } from '@/lib/utils';
import type { AnomalyRegion } from '@/types';

interface ECGChartProps {
  data: number[];
  anomalyRegions?: AnomalyRegion[];
  sampleRate?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  title?: string;
}

interface ChartDataPoint {
  index: number;
  timeMs: number;
  value: number;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartDataPoint;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1530]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="text-slate-400">Time: <span className="text-slate-200">{d.timeMs.toFixed(0)} ms</span></p>
      <p className="text-slate-400">Value: <span className="text-primary font-mono">{d.value.toFixed(4)} mV</span></p>
    </div>
  );
};

export function ECGChart({
  data,
  anomalyRegions = [],
  sampleRate = 250,
  height = 200,
  color = '#00d4aa',
  showGrid = true,
  title,
}: ECGChartProps) {
  const displayData = downsampleECG(data, 800);

  const chartData: ChartDataPoint[] = displayData.map((value, index) => {
    const originalIndex = Math.round((index / displayData.length) * data.length);
    return {
      index: originalIndex,
      timeMs: (originalIndex / sampleRate) * 1000,
      value,
    };
  });

  // Scale anomaly regions to downsampled indices
  const scale = displayData.length / Math.max(data.length, 1);
  const scaledRegions = anomalyRegions.map((r) => ({
    start: Math.round(r.start * scale),
    end: Math.round(r.end * scale),
  }));

  return (
    <div className="w-full">
      {title && (
        <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
          )}
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

          {/* Baseline reference */}
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

          {/* Anomaly region highlights */}
          {scaledRegions.map((r, i) => (
            <ReferenceArea
              key={i}
              x1={chartData[r.start]?.timeMs}
              x2={chartData[Math.min(r.end, chartData.length - 1)]?.timeMs}
              fill="rgba(239,68,68,0.15)"
              stroke="rgba(239,68,68,0.4)"
              strokeWidth={1}
            />
          ))}

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
