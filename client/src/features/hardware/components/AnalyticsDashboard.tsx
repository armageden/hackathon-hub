'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { hardwareApi, hardwareQueryKeys } from '../api';
import { formatCompact, formatShortDate } from '@/lib/formatters';
import { Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsDashboardProps {
  eventId: string;
}

export function AnalyticsDashboard({ eventId }: AnalyticsDashboardProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: hardwareQueryKeys.analytics(eventId),
    queryFn: () => hardwareApi.getAnalytics(eventId),
  });

  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="skeleton h-8 w-24 mb-2" />
            <div className="skeleton h-12 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">Failed to load analytics</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const kpiCards = [
    {
      label: 'Total Items',
      value: formatCompact(analytics.totalItems),
      icon: Package,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      trend: null,
    },
    {
      label: 'Available',
      value: formatCompact(analytics.availableItems),
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      trend: { value: `${analytics.availableItems}/${analytics.totalItems}`, positive: true },
    },
    {
      label: 'Checked Out',
      value: formatCompact(analytics.checkedOutItems),
      icon: Package,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      trend: analytics.overdueItems > 0 ? { value: `${analytics.overdueItems} overdue`, positive: false } : null,
    },
    {
      label: 'Damaged',
      value: formatCompact(analytics.damagedItems),
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      trend: null,
    },
    {
      label: 'Active Checkouts',
      value: formatCompact(analytics.activeCheckouts),
      icon: Package,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      trend: analytics.overdueItems > 0 ? { value: `${analytics.overdueItems} overdue`, positive: false } : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{kpi.label}</p>
                <p className="text-3xl font-bold font-mono tabular-nums text-white">{kpi.value}</p>
                {kpi.trend && (
                  <p className={cn('text-xs mt-1', kpi.trend.positive ? 'text-emerald-400' : 'text-red-400')}>
                    {kpi.trend.value}
                  </p>
                )}
              </div>
              <div className={cn('p-3 rounded-xl', kpi.bg)}>
                <kpi.icon className={cn('h-6 w-6', kpi.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checkouts Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Checkouts Over Time (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.checkoutsOverTime.length > 0 ? (
              <LineChart
                data={analytics.checkoutsOverTime}
                xKey="date"
                lines={[
                  { key: 'count', label: 'Checkouts', color: 'var(--color-chart-1)' },
                ]}
                height={300}
                showTooltip={true}
                xAxisFormatter={(v) => formatShortDate(v as string)}
                yAxisFormatter={(v) => v.toString()}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">No checkout data for the last 30 days</div>
            )}
          </CardContent>
        </Card>

        {/* Items by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(analytics.itemsByCategory).length > 0 ? (
              <PieChart
                data={Object.entries(analytics.itemsByCategory).map(([name, value]) => ({ name, value }))}
                height={300}
                innerRadius={50}
                showLegend={true}
                label={true}
                labelFormatter={(value) => value.toString()}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">No category data available</div>
            )}
          </CardContent>
        </Card>

        {/* Items by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Items by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(analytics.itemsByStatus).length > 0 ? (
              <BarChart
                data={Object.entries(analytics.itemsByStatus).map(([name, value]) => ({ name, value }))}
                xKey="name"
                bars={[{ key: 'value', label: 'Count', color: 'var(--color-chart-1)' }]}
                layout="horizontal"
                height={300}
                showLegend={false}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">No status data available</div>
            )}
          </CardContent>
        </Card>

        {/* Top Borrowed Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Borrowed Items</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topBorrowedItems.length > 0 ? (
              <div className="space-y-3">
                {analytics.topBorrowedItems.slice(0, 10).map((item, index) => (
                  <div key={item.item.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                    <span className="w-8 text-center text-gray-500 font-mono">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{item.item.name}</p>
                      <p className="text-xs text-gray-500">{item.item.category || 'No category'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{item.checkoutCount} checkouts</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No checkout history yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}