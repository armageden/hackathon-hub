import { api, queryKeys, mutationKeys } from '@/lib/api';
import type {
  HardwareItem,
  HardwareCheckout,
  HardwareReturn,
  HardwareDamageReport,
  HardwareAnalytics,
  CreateHardwareItemRequest,
  UpdateHardwareItemRequest,
  CheckoutHardwareRequest,
  ReturnHardwareRequest,
  CreateDamageReportRequest,
  PaginatedResponse,
} from '@/types/api';

export const hardwareApi = {
  // Items
  getItems: (eventId: string, params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get<PaginatedResponse<HardwareItem>>(`/events/${eventId}/hardware/items`, params),

  getItem: (eventId: string, itemId: string) => api.get<HardwareItem>(`/events/${eventId}/hardware/items/${itemId}`),

  createItem: (eventId: string, data: CreateHardwareItemRequest) => api.post<HardwareItem>(`/events/${eventId}/hardware/items`, data),

  createItemsBulk: (eventId: string, items: CreateHardwareItemRequest[]) =>
    api.post<{ created: number; items: HardwareItem[] }>(`/events/${eventId}/hardware/items/bulk`, { items }),

  updateItem: (eventId: string, itemId: string, data: UpdateHardwareItemRequest) => api.put<HardwareItem>(`/events/${eventId}/hardware/items/${itemId}`, data),

  deleteItem: (eventId: string, itemId: string) => api.delete<{ message: string }>(`/events/${eventId}/hardware/items/${itemId}`),

  // Checkouts
  getCheckouts: (eventId: string) => api.get<HardwareCheckout[]>(`/events/${eventId}/hardware/checkouts`),

  getCheckout: (eventId: string, checkoutId: string) => api.get<HardwareCheckout>(`/events/${eventId}/hardware/checkouts/${checkoutId}`),

  checkoutItem: (eventId: string, data: CheckoutHardwareRequest) => api.post<HardwareCheckout>(`/events/${eventId}/hardware/checkouts`, data),

  // Returns
  returnItem: (eventId: string, data: ReturnHardwareRequest) => api.post<{ checkout: HardwareCheckout; returnRecord: HardwareReturn }>(`/events/${eventId}/hardware/returns`, data),

  // Damage Reports
  getDamageReports: (eventId: string) => api.get<HardwareDamageReport[]>(`/events/${eventId}/hardware/damage-reports`),

  createDamageReport: (eventId: string, data: CreateDamageReportRequest) => api.post<HardwareDamageReport>(`/events/${eventId}/hardware/damage-reports`, data),

  resolveDamageReport: (eventId: string, reportId: string, restore = false) =>
    api.put<HardwareDamageReport>(`/events/${eventId}/hardware/damage-reports/${reportId}/resolve`, restore ? { restore: true } : undefined),

  // Analytics
  getAnalytics: (eventId: string) => api.get<HardwareAnalytics>(`/events/${eventId}/hardware/analytics`),

  // Overdue
  getOverdue: (eventId: string) => api.get<HardwareCheckout[]>(`/events/${eventId}/hardware/overdue`),

  markOverdue: (eventId: string) => api.post<{ marked: number }>(`/events/${eventId}/hardware/overdue/mark`),

  // User checkouts
  getMyCheckouts: (eventId: string) => api.get<HardwareCheckout[]>(`/events/${eventId}/hardware/my-checkouts`),

  // Item history / timeline (audit trail)
  getItemTimeline: (eventId: string, itemId: string) =>
    api.get<HardwareTimelineEvent[]>(`/events/${eventId}/hardware/items/${itemId}/timeline`),
};

export interface HardwareTimelineEvent {
  type: 'created' | 'checked_out' | 'returned' | 'damaged' | 'status_change';
  timestamp: string;
  user_name: string | null;
  details: Record<string, unknown>;
}

// Query keys for TanStack Query
export const hardwareQueryKeys = {
  items: (eventId: string, params?: Record<string, unknown>) =>
    [...queryKeys.hardwareItems(eventId, params)],
  item: (eventId: string, itemId: string) =>
    [...queryKeys.hardwareItems(eventId), itemId],
  checkouts: (eventId: string) =>
    queryKeys.hardwareCheckouts(eventId),
  damageReports: (eventId: string) =>
    queryKeys.hardwareDamageReports(eventId),
  analytics: (eventId: string) =>
    queryKeys.hardwareAnalytics(eventId),
  overdue: (eventId: string) =>
    [...queryKeys.hardwareCheckouts(eventId), 'overdue'],
  myCheckouts: (eventId: string) =>
    [...queryKeys.hardwareCheckouts(eventId), 'my'],
  timeline: (eventId: string, itemId: string) =>
    [...queryKeys.hardwareItems(eventId), itemId, 'timeline'],
};

// Mutation keys
export const hardwareMutationKeys = {
  createItem: () => mutationKeys.createHardwareItem,
  updateItem: () => mutationKeys.updateHardwareItem,
  deleteItem: () => mutationKeys.deleteHardwareItem,
  checkout: () => mutationKeys.checkoutHardware,
  return: () => mutationKeys.returnHardware,
  createDamageReport: () => mutationKeys.createDamageReport,
};