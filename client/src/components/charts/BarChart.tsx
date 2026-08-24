'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface BarChartDataPoint {
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  xKey: string;
  bars: Array<{
    key: string;
    label: string;
    color?: string;
    radius?: number[];
  }>;
  layout?: 'vertical' | 'horizontal';
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
  maxBarSize?: number;
  barGap?: number;
  categoryGap?: number;
}

export const BarChart = forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      data,
      xKey,
      bars,
      layout = 'horizontal',
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
      maxBarSize = 40,
      barGap = 4,
      categoryGap = '20%',
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

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
      if (!active || !payload) return null;

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[160px]">
          <p className="text-xs text-gray-400 mb-2 font-mono">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300">{entry.name}:</span>
              <span className="font-mono font-medium text-white ml-auto">
                {tooltipFormatter ? tooltipFormatter(entry.value, entry.name)[0] : yAxisFormatter ? yAxisFormatter(entry.value) : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    };

    const isVertical = layout === 'vertical';

    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={{ top: 8, right: isVertical ? 24 : 80, left: isVertical ? 60 : 0, bottom: isVertical ? 0 : 24 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border-subtle)"
                vertical={!isVertical}
                horizontal={isVertical}
              />
            )}
            <XAxis
              type={isVertical ? 'number' : 'category'}
              dataKey={isVertical ? undefined : xKey}
              tick={{ fill: 'var(--color-fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={isVertical ? yAxisFormatter : xAxisFormatter}
              interval="preserveStartEnd"
              width={isVertical ? 50 : undefined}
            />
            <YAxis
              type={isVertical ? 'category' : 'number'}
              dataKey={isVertical ? xKey : undefined}
              tick={{ fill: 'var(--color-fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={isVertical ? xAxisFormatter : yAxisFormatter}
              width={isVertical ? 120 : 50}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: 'transparent', boxShadow: 'none' }} />}
            {showLegend && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="square"
                wrapperStyle={{ paddingTop: 20 }}
              />
            )}
            {bars.map((bar, index) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.label}
                fill={bar.color || colors[index % colors.length]}
                radius={(bar.radius || [4, 4, 0, 0]) as [number, number, number, number]}
                maxBarSize={maxBarSize}
                {...({ barGap, categoryGap } as object)}
                isAnimationActive={animate}
                animationDuration={animate ? animationDuration : 0}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={`cell-${bar.key}-${i}`} fill={bar.color || colors[index % colors.length]} />
                ))}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

BarChart.displayName = 'BarChart';