'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsListComp as TabsList, TabsTriggerComp as TabsTrigger, TabsContentComp as TabsContent } from '@/components/ui/Tabs';
import { hardwareApi, hardwareQueryKeys, hardwareMutationKeys } from '../api';
import type { HardwareItem, HardwareCheckout, CreateHardwareItemRequest } from '@/types/api';
import { HardwareTable } from '../components/HardwareTable';
import { HardwareCheckoutsTable } from '../components/HardwareCheckoutsTable';
import { DamageReportsTable } from '../components/DamageReportsTable';
import { ItemForm } from '../components/ItemForm';
import { CheckoutModal } from '../components/CheckoutModal';
import { ReturnModal } from '../components/ReturnModal';
import { DamageReportModal } from '../components/DamageReportModal';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { QrLabelsModal } from '../components/QrLabelsModal';
import { ImportItemsDialog } from '../components/ImportItemsDialog';
import { ItemDetailsModal } from '../components/ItemDetailsModal';
import { Toaster, toast } from '@/components/ui/Toast';
import { Package, QrCode } from 'lucide-react';
import { formatStatus } from '@/lib/formatters';

export default function HardwareDashboardPage({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HardwareItem | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<HardwareItem | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnCheckout, setReturnCheckout] = useState<HardwareCheckout | null>(null);
  const [damageReportOpen, setDamageReportOpen] = useState(false);
  const [damageReportItem, setDamageReportItem] = useState<{ id: string; name: string; checkoutId?: string } | null>(null);
  const [detailsItem, setDetailsItem] = useState<{ id: string; name: string } | null>(null);
  const [qrLabelsOpen, setQrLabelsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Deep link from a scanned QR label (?item=<id>)
  const [searchParams, setSearchParams] = useSearchParams();
  const scannedItemId = searchParams.get('item');
  const { data: scannedData } = useQuery({
    queryKey: [...hardwareQueryKeys.item(eventId, scannedItemId || 'none')],
    queryFn: () => hardwareApi.getItem(eventId, scannedItemId!),
    enabled: !!scannedItemId,
  });

  useEffect(() => {
    if (!scannedItemId || !scannedData?.data) return;
    const item = scannedData.data as HardwareItem;
    if (item.status === 'available') {
      setCheckoutItem(item);
      setCheckoutModalOpen(true);
      toast.success(`Scanned: ${item.name}`);
    } else {
      setDetailsItem({ id: item.id, name: item.name });
      toast.info(`Scanned: ${item.name} (${formatStatus(item.status).toLowerCase()})`);
    }
    setSearchParams({}, { replace: true });
  }, [scannedItemId, scannedData, setSearchParams]);

  // Fetch participants for checkout dropdown
  const { data: participantsData } = useQuery({
    queryKey: ['event-members', eventId, 'participants'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/members`);
      if (!res.ok) throw new Error('Failed to fetch participants');
      const data = await res.json();
      return data.data.filter((m: any) => m.role === 'participant').map((m: any) => m.user);
    },
  });

  // Fetch organizers for return dropdown
  const { data: organizersData } = useQuery({
    queryKey: ['event-members', eventId, 'organizers'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/events/${eventId}/members`);
      if (!res.ok) throw new Error('Failed to fetch organizers');
      const data = await res.json();
      return data.data.filter((m: any) => m.role === 'organizer').map((m: any) => m.user);
    },
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationKey: hardwareMutationKeys.createItem(),
    mutationFn: (data: any) => hardwareApi.createItem(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Hardware item created');
      setItemFormOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateItemMutation = useMutation({
    mutationKey: hardwareMutationKeys.updateItem(),
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) => hardwareApi.updateItem(eventId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Hardware item updated');
      setItemFormOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const checkoutMutation = useMutation({
    mutationKey: hardwareMutationKeys.checkout(),
    mutationFn: (data: any) => hardwareApi.checkoutItem(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.checkouts(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Item checked out successfully');
      setCheckoutModalOpen(false);
      setCheckoutItem(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const returnMutation = useMutation({
    mutationKey: hardwareMutationKeys.return(),
    mutationFn: (data: any) => hardwareApi.returnItem(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.checkouts(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Item returned successfully');
      setReturnModalOpen(false);
      setReturnCheckout(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const damageReportMutation = useMutation({
    mutationKey: hardwareMutationKeys.createDamageReport(),
    mutationFn: (data: any) => hardwareApi.createDamageReport(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.damageReports(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Damage report submitted');
      setDamageReportOpen(false);
      setDamageReportItem(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resolveDamageReportMutation = useMutation({
    mutationKey: ['hardware', 'resolve-damage-report'],
    mutationFn: (reportId: string) => hardwareApi.resolveDamageReport(eventId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.damageReports(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Damage report resolved');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resolveRestoreDamageReportMutation = useMutation({
    mutationKey: ['hardware', 'resolve-damage-report-restore'],
    mutationFn: (reportId: string) => hardwareApi.resolveDamageReport(eventId, reportId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.damageReports(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success('Damage report resolved — item restored to available');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationKey: ['hardware', 'import-items'],
    mutationFn: (items: CreateHardwareItemRequest[]) => hardwareApi.createItemsBulk(eventId, items),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.analytics(eventId) });
      toast.success(`Imported ${res.data?.created ?? 0} items`);
      setImportOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setItemFormOpen(true);
  };

  const handleEdit = (item: HardwareItem) => {
    setEditingItem(item);
    setItemFormOpen(true);
  };

  const handleReturn = (checkout: HardwareCheckout) => {
    setReturnCheckout(checkout);
    setReturnModalOpen(true);
  };

  const handleDamageReport = (item: { id: string; name: string }, checkoutId?: string) => {
    setDamageReportItem({ id: item.id, name: item.name, checkoutId });
    setDamageReportOpen(true);
  };

  const handleItemFormSubmit = async (data: any) => {
    if (editingItem) {
      await updateItemMutation.mutateAsync({ itemId: editingItem.id, data });
    } else {
      await createItemMutation.mutateAsync(data);
    }
  };

  const handleCheckoutSubmit = async (data: any) => {
    await checkoutMutation.mutateAsync(data);
  };

  const handleReturnSubmit = async (data: any) => {
    await returnMutation.mutateAsync(data);
  };

  const handleDamageReportSubmit = async (data: any) => {
    await damageReportMutation.mutateAsync(data);
  };

  const handleResolveDamageReport = (reportId: string) => {
    resolveDamageReportMutation.mutate(reportId);
  };

  const handleResolveAndRestoreDamageReport = (reportId: string) => {
    resolveRestoreDamageReportMutation.mutate(reportId);
  };

  const isLoading = createItemMutation.isPending || updateItemMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Hardware Inventory</h1>
          <p className="text-gray-400 mt-1">Manage hardware items, checkouts, and returns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button variant="outline" onClick={() => setQrLabelsOpen(true)} leftIcon={<QrCode className="h-4 w-4" />}>
            QR Labels
          </Button>
          <Button onClick={handleOpenCreate} leftIcon={<Package className="h-4 w-4" />}>
            Add Item
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="checkouts">Checkouts</TabsTrigger>
          <TabsTrigger value="damage-reports">Damage Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <HardwareTable
            eventId={eventId}
            onEdit={handleEdit}
            onViewHistory={setDetailsItem}
            onAddItem={handleOpenCreate}
          />
        </TabsContent>

        {/* Checkouts Tab */}
        <TabsContent value="checkouts">
          <Card>
            <CardHeader>
              <CardTitle>Active Checkouts</CardTitle>
            </CardHeader>
            <CardContent>
              <HardwareCheckoutsTable
                eventId={eventId}
                onReturn={handleReturn}
                onDamageReport={handleDamageReport}
                onViewDetails={setDetailsItem}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Damage Reports Tab */}
        <TabsContent value="damage-reports">
          <Card>
            <CardHeader>
              <CardTitle>Damage Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <DamageReportsTable
                eventId={eventId}
                onResolve={handleResolveDamageReport}
                onResolveAndRestore={handleResolveAndRestoreDamageReport}
                onViewDetails={setDetailsItem}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsDashboard eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ItemForm
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        onSubmit={handleItemFormSubmit}
        initialData={editingItem}
        isLoading={isLoading}
        title={editingItem ? 'Edit Hardware Item' : 'Add Hardware Item'}
      />

      <CheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        item={checkoutItem}
        participants={participantsData?.data || []}
        onSubmit={handleCheckoutSubmit}
        isLoading={checkoutMutation.isPending}
      />

      <ReturnModal
        open={returnModalOpen}
        onOpenChange={setReturnModalOpen}
        checkout={returnCheckout}
        organizers={organizersData?.data || []}
        onSubmit={handleReturnSubmit}
        isLoading={returnMutation.isPending}
      />

      <DamageReportModal
        open={damageReportOpen}
        onOpenChange={setDamageReportOpen}
        itemId={damageReportItem?.id || ''}
        itemName={damageReportItem?.name || ''}
        checkoutId={damageReportItem?.checkoutId}
        onSubmit={handleDamageReportSubmit}
        isLoading={damageReportMutation.isPending}
      />

      {/* QR labels dialog */}
      <QrLabelsModal open={qrLabelsOpen} onOpenChange={setQrLabelsOpen} eventId={eventId} />

      {/* Bulk import dialog */}
      <ImportItemsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSubmit={async (items) => {
          await importMutation.mutateAsync(items);
        }}
        isLoading={importMutation.isPending}
      />

      {/* Item details / lifecycle dialog */}
      <ItemDetailsModal
        open={!!detailsItem}
        onOpenChange={(open) => !open && setDetailsItem(null)}
        eventId={eventId}
        itemId={detailsItem?.id ?? null}
        itemName={detailsItem?.name}
      />

      <Toaster />
    </div>
  );
}