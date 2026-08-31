'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, createColumns } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { hardwareApi, hardwareQueryKeys } from '../api';
import type { HardwareDamageReport } from '@/types/api';
import { formatRelativeTime, formatDateTime } from '@/lib/formatters';
import { AlertTriangle, CheckCircle, MoreVertical, RotateCcw, Download, Wrench } from 'lucide-react';
import { downloadCsv } from '@/lib/export-csv';

// API may enrich damage report rows with these display fields
type EnrichedDamageReport = HardwareDamageReport & {
  hardware_item_name?: string;
  reported_by_name?: string;
};

interface DamageReportsTableProps {
  eventId: string;
  onResolve: (reportId: string) => void;
  onResolveAndRestore?: (reportId: string) => void;
  onViewDetails?: (item: { id: string; name: string }) => void;
}

export function DamageReportsTable({ eventId, onResolve, onResolveAndRestore, onViewDetails }: DamageReportsTableProps) {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    pageSize: 25,
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  const { data, isLoading } = useQuery({
    queryKey: [...hardwareQueryKeys.damageReports(eventId), filters],
    queryFn: () => hardwareApi.getDamageReports(eventId),
    placeholderData: (prev) => prev,
  });

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    return (data.data as EnrichedDamageReport[]).filter((report) => {
      if (filters.status && report.status !== filters.status) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const hardwareName = report.hardware_item_name?.toLowerCase() || '';
        const reporterName = report.reported_by_name?.toLowerCase() || '';
        const description = report.description?.toLowerCase() || '';
        if (!hardwareName.includes(searchLower) && !reporterName.includes(searchLower) && !description.includes(searchLower)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const columns = useMemo(() => {
    const columnHelper = createColumns<EnrichedDamageReport>();
    return [
      columnHelper.accessor('hardware_item_name', {
        header: 'Item',
        cell: (info) => (
          <div>
            <p className="font-medium text-white">{info.getValue() || 'Unknown'}</p>
            {info.row.original.description && (
              <p className="text-xs text-gray-500 line-clamp-1">{info.row.original.description}</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('reported_by_name', {
        header: 'Reported By',
        cell: (info) => info.getValue() || <span className="text-gray-500 text-xs">—</span>,
      }),
      columnHelper.accessor('severity', {
        header: 'Severity',
        cell: (info) => {
          const severityColors: Record<string, 'info' | 'warning' | 'danger' | 'neutral'> = {
            minor: 'info',
            moderate: 'warning',
            major: 'danger',
            critical: 'danger',
          };
          return (
            <Badge variant={severityColors[info.getValue()] || 'neutral'}>
              {info.getValue()}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('created_at', {
        header: 'Reported',
        cell: (info) => (
          <div className="flex items-center gap-1">
            <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm text-white">{formatRelativeTime(info.getValue())}</span>
          </div>
        ),
      }),
      columnHelper.accessor('resolved_at', {
        header: 'Resolved',
        cell: (info) => {
          const resolvedAt = info.getValue();
          if (!resolvedAt) return <span className="text-gray-500 text-xs">—</span>;
          return (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-sm text-emerald-400">{formatDateTime(resolvedAt)}</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => {
          const report = info.row.original;
          const canResolve = report.status === 'open';

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canResolve && (
                  <DropdownMenuItem
                    onClick={() => onResolve(report.id)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Resolve
                  </DropdownMenuItem>
                )}
                {canResolve && onResolveAndRestore && (
                  <DropdownMenuItem
                    onClick={() => onResolveAndRestore(report.id)}
                    className="flex items-center gap-2 text-emerald-400"
                  >
                    <Wrench className="h-4 w-4" />
                    Resolve & Restore Item
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onViewDetails?.({ id: report.hardware_item_id, name: report.hardware_item_name || 'Unknown' })}
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    View Details
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ];
  }, [onResolve, onResolveAndRestore, onViewDetails]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Damage Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={5} columns={7} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Damage Reports</CardTitle>
        <Button
          variant="outline"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => {
            const rows = ((data?.data ?? []) as unknown as EnrichedDamageReport[]).map((r) => ({
              item: r.hardware_item_name, severity: r.severity, status: r.status,
              description: r.description, reported_by: r.reported_by_name,
              resolved_at: r.resolved_at ?? '',
            }));
            downloadCsv(`hardware-damage-reports-${eventId.slice(0, 8)}`, rows);
          }}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-900/50 rounded-lg">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search damage reports..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input-base pl-10"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
            className="input-base w-[160px] bg-gray-800 border-gray-700"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Table */}
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto text-gray-700 mb-4" />
            <p className="text-lg">No damage reports found</p>
            <p className="text-sm">Damage reports will appear here when items are reported as damaged</p>
          </div>
        ) : (
          <DataTable
            data={filteredData as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            pagination={true}
            pageSize={filters.pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyMessage="No damage reports found"
          />
        )}
      </CardContent>
    </Card>
  );
}