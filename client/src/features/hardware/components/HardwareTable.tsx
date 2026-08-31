'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, createColumns } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/Button';
import { Select } from "@/components/ui/Input";
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogCloseButton } from '@/components/ui/Dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { toast } from '@/components/ui/Toast';
import { hardwareApi, hardwareQueryKeys, hardwareMutationKeys } from '../api';
import type { HardwareItem } from '../types';
import { HARDWARE_CATEGORIES, HARDWARE_CONDITIONS, HARDWARE_STATUSES } from '../types';
import { Plus, Search, MoreVertical, Edit, Trash2, History, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/export-csv';

interface HardwareTableProps {
  eventId: string;
  onEdit?: (item: HardwareItem) => void;
  onViewHistory?: (item: HardwareItem) => void;
  onAddItem?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function HardwareTable({ eventId, onEdit, onViewHistory, onAddItem, canEdit = true, canDelete = true }: HardwareTableProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: '',
    page: 1,
    pageSize: 25,
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<HardwareItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: hardwareQueryKeys.items(eventId, filters),
    queryFn: () => hardwareApi.getItems(eventId, filters),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationKey: hardwareMutationKeys.deleteItem(),
    mutationFn: (itemId: string) => hardwareApi.deleteItem(eventId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      toast.success('Hardware item deleted');
      setDeleteDialogOpen(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleEdit = useCallback((item: HardwareItem) => {
    onEdit?.(item);
  }, [onEdit]);

  const columns = useMemo(() => {
    const columnHelper = createColumns<HardwareItem>();
    return [
      columnHelper.accessor('name', {
        header: 'Item',
        cell: (info) => (
          <div>
            <p className="font-medium text-white">{info.getValue()}</p>
            {info.row.original.model && (
              <p className="text-xs text-gray-500">{info.row.original.model}</p>
            )}
            {info.row.original.serial_number && (
              <p className="text-xs text-gray-500 font-mono">{info.row.original.serial_number}</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => info.getValue() ? (
          <Badge variant="primary">{info.getValue()}</Badge>
        ) : (
          <span className="text-gray-500 text-xs">—</span>
        ),
      }),
      columnHelper.accessor('quantity_available', {
        header: 'Available',
        cell: (info) => (
          <span className="font-mono tabular-nums text-lg">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('condition', {
        header: 'Condition',
        cell: (info) => {
          const condition = HARDWARE_CONDITIONS.find(c => c.value === info.getValue());
          return condition ? (
            <Badge variant={condition.value === 'damaged' ? 'danger' : condition.value === 'new' ? 'success' : 'neutral'}>
              {condition.label}
            </Badge>
          ) : (
            <Badge variant="neutral">{info.getValue()}</Badge>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => info.getValue() || <span className="text-gray-500 text-xs">—</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleEdit(info.row.original)}
                disabled={!canEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewHistory?.(info.row.original)}
              >
                <History className="h-4 w-4 mr-2" />
                View History
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(info.row.original)}
                disabled={!canDelete}
                className="text-red-400 focus:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ];
  }, [canEdit, canDelete, handleEdit, onViewHistory]);

  const handleDeleteConfirm = () => {
    if (deleteDialogOpen) {
      deleteMutation.mutate(deleteDialogOpen.id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hardware Inventory</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => {
              const rows = ((data?.data ?? []) as unknown as HardwareItem[]).map((i) => ({
                name: i.name, category: i.category, model: i.model, serial_number: i.serial_number,
                quantity_available: i.quantity_available, condition: i.condition, status: i.status,
                location: i.location, notes: i.notes,
              }));
              downloadCsv(`hardware-inventory-${eventId.slice(0, 8)}`, rows);
            }}
          >
            Export CSV
          </Button>
          <Button onClick={() => onAddItem?.()} leftIcon={<Plus className="h-4 w-4" />}>
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-900/50 rounded-lg">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="input-base pl-10"
            />
          </div>
          <div className="w-[160px]">
            <Select
              value={filters.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              options={[{ value: '', label: 'All Status' }, ...HARDWARE_STATUSES.map(s => ({ value: s.value, label: s.label }))]}
              placeholder="Status"
              className="w-full"
            />
          </div>
          <div className="w-[160px]">
            <Select
              value={filters.category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
              options={[{ value: '', label: 'All Categories' }, ...HARDWARE_CATEGORIES.map(c => ({ value: c, label: c }))]}
              placeholder="Category"
              className="w-full"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : data ? (
          <DataTable
            data={data.data as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            pagination={true}
            pageSize={filters.pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyMessage="No hardware items found"
          />
        ) : (
          <div className="text-center py-8 text-gray-500">Failed to load hardware items</div>
        )}

        {/* Delete Dialog */}
        <Dialog open={!!deleteDialogOpen} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Delete Hardware Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteDialogOpen?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogCloseButton>Cancel</DialogCloseButton>
              <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}