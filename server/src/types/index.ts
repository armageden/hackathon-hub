import type { Request } from "express";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  global_role: "admin" | "user";
  admin_expires_at?: Date | string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  global_role: "admin" | "user";
  admin_expires_at?: Date | string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    globalRole: "admin" | "user";
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  globalRole: "admin" | "user";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Hardware types
export interface HardwareItem {
  id: string;
  event_id: string;
  name: string;
  category: string | null;
  model: string | null;
  serial_number: string | null;
  quantity_available: number;
  condition: string;
  status: 'available' | 'checked_out' | 'damaged' | 'lost' | 'retired';
  location: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface HardwareCheckout {
  id: string;
  event_id: string;
  hardware_item_id: string;
  borrower_user_id: string;
  checked_out_by: string;
  checked_out_at: Date;
  due_at: Date | null;
  status: 'active' | 'overdue' | 'returned' | 'damaged';
  notes: string | null;
  hardware_item_name?: string;
  hardware_item_category?: string;
  borrower_name?: string;
  borrower_email?: string;
  checked_out_by_name?: string;
}

export interface HardwareReturn {
  id: string;
  checkout_id: string;
  returned_at: Date;
  condition: string | null;
  received_by: string;
  notes: string | null;
}

export interface HardwareDamageReport {
  id: string;
  event_id: string;
  hardware_item_id: string;
  checkout_id: string | null;
  reported_by: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  status: 'open' | 'resolved';
  resolved_at: Date | null;
  created_at: Date;
  hardware_item_name?: string;
  reported_by_name?: string;
}

export interface HardwareAnalytics {
  totalItems: number;
  availableItems: number;
  checkedOutItems: number;
  damagedItems: number;
  overdueItems: number;
  activeCheckouts: number;
  itemsByCategory: Record<string, number>;
  itemsByStatus: Record<string, number>;
  checkoutsOverTime: Array<{ date: string; count: number }>;
  topBorrowedItems: Array<{ item: HardwareItem; checkoutCount: number }>;
}

export interface CreateHardwareItemRequest {
  name: string;
  category?: string;
  model?: string;
  serial_number?: string;
  quantity_available?: number;
  condition?: string;
  status?: string;
  location?: string;
  notes?: string;
}

export interface UpdateHardwareItemRequest extends Partial<CreateHardwareItemRequest> {}

export interface CheckoutHardwareRequest {
  hardware_item_id: string;
  borrower_user_id: string;
  due_at?: string;
  notes?: string;
}

export interface ReturnHardwareRequest {
  checkout_id: string;
  condition: string;
  received_by: string;
  notes?: string;
  // Used when condition is 'damaged' to seed the auto-created damage report
  damage_severity?: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface HardwareTimelineEvent {
  type: 'created' | 'checked_out' | 'returned' | 'damaged' | 'status_change';
  timestamp: string;
  user_name: string | null;
  details: Record<string, unknown>;
}

export interface CreateDamageReportRequest {
  hardware_item_id: string;
  checkout_id?: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export function p(req: Request, key: string): string | undefined {
  const val = (req.params as Record<string, unknown>)[key];
  if (Array.isArray(val)) return val[0];
  if (typeof val === "string") return val;
  return undefined;
}
