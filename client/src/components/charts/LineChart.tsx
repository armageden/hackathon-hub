'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface LineChartDataPoint {
  [key: string]: string | number | Date;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  xKey: string;
  lines: Array<{
    key: string;
    label: string;
    color?: string;
    strokeWidth?: number;
    dot?: boolean;
    type?: 'monotone' | 'linear' | 'step' | 'basis' | 'basisClosed' | 'basisOpen' | 'linearClosed' | 'natural' | 'monotoneX' | 'monotoneY';
  }>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  xAxisFormatter?: (value: string | number) => string;
  yAxisFormatter?: (value: number) => string;
  className?: string;
  animate?: boolean;
  animationDuration?: number;
}

export const LineChart = forwardRef<HTMLDivElement, LineChartProps>(
  (
    {
      data,
      xKey,
      lines,
      xAxisLabel: _xAxisLabel,
      yAxisLabel: _yAxisLabel,
      height = 300,
      showGrid = true,
      showLegend = false,
      showTooltip = true,
      tooltipFormatter,
      xAxisFormatter,
      yAxisFormatter,
      className,
      animate = true,
      animationDuration = 800,
    },
    ref
  ) => {
    const colors = [
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
      'var(--color-chart-4)',
      'var(--color-chart-5)',
      'var(--color-chart-6)',
      'var(--color-chart-7)',
      'var(--color-chart-8)',
      'var(--color-chart-9)',
      'var(--color-chart-10)',
    ];

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; payload: LineChartDataPoint }>; label?: string }) => {
      if (!active || !payload) return null;

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[160px]">
          {xAxisFormatter && label && <p className="text-xs text-gray-400 mb-2 font-mono">{xAxisFormatter(label)}</p>}
          {!xAxisFormatter && label && <p className="text-xs text-gray-400 mb-2 font-mono">{label}</p>}
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300">{entry.name}:</span>
              <span className="font-mono font-medium text-white ml-auto">
                {tooltipFormatter ? tooltipFormatter(entry.value, entry.name)[0] : yAxisFormatter ? yAxisFormatter(entry.value) : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            margin={{ top: 8, right: showLegend ? 80 : 24, left: 0, bottom: 0 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border-subtle)"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fill: 'var(--color-fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={xAxisFormatter}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--color-fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={yAxisFormatter}
              width={50}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: 'transparent', boxShadow: 'none' }} />}
            {showLegend && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="line"
                {...({ iconHeight: 3 } as object)}
                wrapperStyle={{ paddingTop: 20 }}
              />
            )}
            {lines.map((line, index) => (
              <Line
                key={line.key}
                type={line.type || 'monotone'}
                dataKey={line.key}
                name={line.label}
                stroke={line.color || colors[index % colors.length]}
                strokeWidth={line.strokeWidth || 2}
                dot={line.dot ?? false}
                activeDot={{ r: 6, strokeWidth: 2 }}
                animationDuration={animate ? animationDuration : 0}
                animationEasing="ease-out"
                isAnimationActive={animate}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

LineChart.displayName = 'LineChart';