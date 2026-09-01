'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Tabs, TabsListComp as TabsList, TabsTriggerComp as TabsTrigger, TabsContentComp as TabsContent } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Input';
import { hardwareApi, hardwareQueryKeys } from '../api';
import type { HardwareItem, HardwareCheckout } from '@/types/api';
import { CheckoutModal } from '../components/CheckoutModal';
import { Toaster, toast } from '@/components/ui/Toast';
import { Package, Search, Package as PackageIcon, MapPin, Info } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hardwareMutationKeys } from '../api';
import { useAuth } from '@/app/providers';
import { getDueState, dueStateStyles, formatStatus, formatDateTime } from '@/lib/formatters';

export default function HardwareBrowsePage({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    status: 'available',
    category: '',
    search: '',
  });
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<HardwareItem | null>(null);

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
      toast.info(`"${item.name}" is ${formatStatus(item.status).toLowerCase()} right now`);
    }
    setSearchParams({}, { replace: true });
  }, [scannedItemId, scannedData, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: hardwareQueryKeys.items(eventId, filters),
    queryFn: () => hardwareApi.getItems(eventId, filters),
    placeholderData: (prev) => prev,
  });

  const { data: myCheckoutsData } = useQuery({
    queryKey: hardwareQueryKeys.myCheckouts(eventId),
    queryFn: () => hardwareApi.getMyCheckouts(eventId),
  });

  const checkoutMutation = useMutation({
    mutationKey: hardwareMutationKeys.checkout(),
    mutationFn: (data: any) => hardwareApi.checkoutItem(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.items(eventId) });
      queryClient.invalidateQueries({ queryKey: hardwareQueryKeys.myCheckouts(eventId) });
      toast.success('Item checked out successfully');
      setCheckoutModalOpen(false);
      setCheckoutItem(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCheckout = (item: HardwareItem) => {
    setCheckoutItem(item);
    setCheckoutModalOpen(true);
  };

  // The list endpoint returns a paginated payload; treat the items as the item array here
  const items = data?.data as unknown as HardwareItem[] | undefined;
  const myCheckouts = myCheckoutsData?.data as (HardwareCheckout & { hardware_item_name?: string })[] | undefined;

  const handleCheckoutSubmit = async (data: any) => {
    await checkoutMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Hardware Inventory</h1>
          <p className="text-gray-400 mt-1">Browse and check out available hardware</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Hardware</TabsTrigger>
          <TabsTrigger value="my-checkouts">My Checkouts</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search hardware..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="input-base pl-10"
                  />
                </div>
                <Select
                  value={filters.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  options={[
                    { value: '', label: 'All Categories' },
                    { value: 'Microcontrollers', label: 'Microcontrollers' },
                    { value: 'Sensors', label: 'Sensors' },
                    { value: 'Actuators', label: 'Actuators' },
                    { value: 'Displays', label: 'Displays' },
                    { value: 'Communication', label: 'Communication' },
                    { value: 'Power', label: 'Power' },
                    { value: 'Tools', label: 'Tools' },
                    { value: 'Cables & Connectors', label: 'Cables & Connectors' },
                    { value: 'Kits', label: 'Kits' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Category"
                  className="w-[180px]"
                />
                <Select
                  value={filters.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  options={[
                    { value: 'available', label: 'Available' },
                    { value: 'checked_out', label: 'Checked Out' },
                    { value: 'damaged', label: 'Damaged' },
                    { value: 'all', label: 'All' },
                  ]}
                  placeholder="Status"
                  className="w-[160px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="skeleton h-12 w-full mb-3" />
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-4 w-1/2 mb-2" />
                  <div className="flex gap-2 mt-4">
                    <div className="skeleton h-6 w-20" />
                    <div className="skeleton h-6 w-24" />
                  </div>
                </Card>
              ))
            ) : !items || items.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                <p className="text-lg">No hardware items found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              items.map((item) => (
                <HardwareItemCard key={item.id} item={item} onCheckout={handleCheckout} />
              ))
            )}
          </div>
        </TabsContent>

        {/* My Checkouts Tab */}
        <TabsContent value="my-checkouts">
          <Card>
            <CardHeader>
              <CardTitle>My Active Checkouts</CardTitle>
            </CardHeader>
            <CardContent>
              {myCheckouts?.length === 0 || !myCheckouts ? (
                <div className="text-center py-12 text-gray-500">
                  <PackageIcon className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                  <p className="text-lg">No active checkouts</p>
                  <p className="text-sm">Items you check out will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myCheckouts.map((checkout) => (
                    <div key={checkout.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <Package className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{checkout.hardware_item_name}</p>
                          <p className="text-sm text-gray-400">
                            Checked out: {formatDateTime(checkout.checked_out_at)}
                            {checkout.due_at && (
                              <>
                                {' · '}
                                <span className={dueStateStyles[getDueState(checkout.due_at, checkout.status)].text}>
                                  Due: {formatDateTime(checkout.due_at)}
                                  {getDueState(checkout.due_at, checkout.status) === 'overdue' && ' (OVERDUE)'}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={checkout.status}
                        label={
                          getDueState(checkout.due_at, checkout.status) === 'overdue'
                            ? "Checked Out"
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        item={checkoutItem}
        participants={user ? [{ id: user.id, full_name: user.full_name, email: user.email }] as unknown as import('@/types/api').User[] : []}
        onSubmit={handleCheckoutSubmit}
        isLoading={checkoutMutation.isPending}
      />

      <Toaster />
    </div>
  );
}

function HardwareItemCard({ item, onCheckout }: { item: any; onCheckout: (item: any) => void }) {
  const isAvailable = item.status === 'available' && item.quantity_available > 0;

  return (
    <Card className="p-4 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-3 bg-indigo-500/20 rounded-lg flex-shrink-0">
          <Package className="h-6 w-6 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{item.name}</h3>
          <p className="text-sm text-gray-400 truncate">{item.category || 'No category'}</p>
          {item.model && <p className="text-xs text-gray-500 font-mono">{item.model}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <StatusBadge status={item.status} />
        <Badge variant="primary">{item.quantity_available} available</Badge>
        {item.condition && <Badge variant="neutral">{item.condition}</Badge>}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        {item.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {item.location}
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <Button
          variant={isAvailable ? 'primary' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => onCheckout(item)}
          disabled={!isAvailable}
        >
          {isAvailable ? 'Check Out' : 'Unavailable'}
        </Button>
        <Button variant="ghost" size="sm" className="p-2" aria-label={`About ${item.name}`} title={item.notes || item.name}>
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}