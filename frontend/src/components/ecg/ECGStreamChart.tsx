import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { ECGStreamPoint } from '@/types';

interface ECGStreamChartProps {
  data: ECGStreamPoint[];
  height?: number;
}

export function ECGStreamChart({ data, height = 220 }: ECGStreamChartProps) {
  const chartData = useMemo(
    () =>
      data.map((pt) => ({
        t: pt.timestamp,
        v: pt.value,
        a: pt.is_anomalous_region ? pt.value : null,
      })),
    [data],
  );

  return (
    <div className="w-full relative">
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
        <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary to-transparent opacity-30 animate-scan-line" />
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            hide
          />
          <YAxis
            domain={[-0.5, 1.5]}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
            label={{ value: 'mV', angle: -90, position: 'insideLeft', offset: -5, style: { fill: '#64748b', fontSize: 10 } }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0].payload as { t: number; v: number; a: number | null };
              return (
                <div className="rounded-lg border border-white/10 bg-[#0d1530]/95 px-2 py-1.5 text-xs backdrop-blur-sm">
                  <span className="text-primary font-mono">{pt.v.toFixed(4)} mV</span>
                  {pt.a !== null && (
                    <span className="ml-2 text-danger text-[10px]">⚠ Anomaly</span>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

          {/* Normal ECG line */}
          <Line
            type="monotone"
            dataKey="v"
            stroke="#00d4aa"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* Anomalous overlay (red dots) */}
          <Line
            type="monotone"
            dataKey="a"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={{ r: 2, fill: '#ef4444', strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
