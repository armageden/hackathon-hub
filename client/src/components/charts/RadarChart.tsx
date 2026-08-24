'use client';

import {
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface RadarChartDataPoint {
  subject: string;
  [key: string]: string | number;
}

interface RadarChartProps {
  data: RadarChartDataPoint[];
  radars: Array<{
    key: string;
    label: string;
    color?: string;
    fillOpacity?: number;
    strokeWidth?: number;
  }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  className?: string;
  animate?: boolean;
  animationDuration?: number;
  maxValue?: number;
}

export const RadarChart = forwardRef<HTMLDivElement, RadarChartProps>(
  (
    {
      data,
      radars,
      height = 300,
      showGrid = true,
      showLegend = true,
      showTooltip = true,
      tooltipFormatter,
      className,
      animate = true,
      animationDuration = 800,
      maxValue,
    },
    ref
  ) => {
    const colors = [
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
      'var(--color-chart-4)',
      'var(--color-chart-5)',
    ];

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
      if (!active || !payload) return null;

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[160px]">
          <p className="text-xs text-gray-400 mb-2 font-medium">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300">{entry.name}:</span>
              <span className="font-mono font-medium text-white ml-auto">
                {tooltipFormatter ? tooltipFormatter(entry.value, entry.name)[0] : `${entry.value.toFixed(1)}`}
              </span>
            </div>
          ))}
        </div>
      );
    };

    const maxVal = maxValue || Math.max(...radars.flatMap(r => data.map(d => d[r.key] as number)), 100);

    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            {showGrid && <PolarGrid gridType="polygon" radialLines={true} stroke="var(--color-border-subtle)" />}
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'var(--color-fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxVal]}
              tick={{ fill: 'var(--color-fg-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
              tickFormatter={(v) => v.toString()}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: 'transparent', boxShadow: 'none' }} />}
            {showLegend && (
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                iconType="line"
                wrapperStyle={{ paddingBottom: 20 }}
              />
            )}
            {radars.map((radar, index) => (
              <Radar
                key={radar.key}
                dataKey={radar.key}
                name={radar.label}
                stroke={radar.color || colors[index % colors.length]}
                fill={radar.color || colors[index % colors.length]}
                fillOpacity={radar.fillOpacity || 0.15}
                strokeWidth={radar.strokeWidth || 2}
                dot={false}
                isAnimationActive={animate}
                animationDuration={animate ? animationDuration : 0}
                animationEasing="ease-out"
              />
            ))}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

RadarChart.displayName = 'RadarChart';