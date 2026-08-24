'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface PieChartDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface PieChartProps {
  data: PieChartDataPoint[];
  nameKey?: string;
  valueKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  className?: string;
  animate?: boolean;
  animationDuration?: number;
  colors?: string[];
  label?: boolean;
  labelFormatter?: (value: number, name: string) => string;
}

export const PieChart = forwardRef<HTMLDivElement, PieChartProps>(
  (
    {
      data,
      nameKey = 'name',
      valueKey = 'value',
      innerRadius = 60,
      outerRadius = 100,
      height = 300,
      showLegend = true,
      showTooltip = true,
      tooltipFormatter,
      className,
      animate = true,
      animationDuration = 800,
      colors,
      label = false,
      labelFormatter,
    },
    ref
  ) => {
    const defaultColors = [
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

    const chartColors = colors || defaultColors;

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; payload: PieChartDataPoint }> }) => {
      if (!active || !payload) return null;

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[160px]">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300">{entry.name}:</span>
              <span className="font-mono font-medium text-white ml-auto">
                {tooltipFormatter ? tooltipFormatter(entry.value, entry.name)[0] : `${entry.value.toLocaleString()} (${((entry.value / payload.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%)`}
              </span>
            </div>
          ))}
        </div>
      );
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius: ir, outerRadius: or, percent, index }: {
      cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; index: number;
    }) => {
      if (percent < 0.05) return null;
      const radius = ir + (or - ir) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
      const value = data[index]?.[valueKey] as number;
      const name = data[index]?.[nameKey] as string;
      
      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={midAngle > 90 && midAngle < 270 ? 'end' : 'start'}
          dominantBaseline="middle"
          fontSize={11}
          fontFamily="var(--font-mono)"
          fontWeight={500}
          pointerEvents="none"
        >
          {labelFormatter ? labelFormatter(value, name) : `${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              nameKey={nameKey}
              dataKey={valueKey}
              paddingAngle={2}
              label={label ? CustomLabel : false}
              isAnimationActive={animate}
              animationDuration={animate ? animationDuration : 0}
              animationEasing="ease-out"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: 'transparent', boxShadow: 'none' }} />}
            {showLegend && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ paddingTop: 20 }}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

PieChart.displayName = 'PieChart';

// DonutChart alias
export const DonutChart = PieChart;