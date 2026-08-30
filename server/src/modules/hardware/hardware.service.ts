import { hardwareRepository } from "./hardware.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { ConflictError, NotFoundError, ValidationError, AuthorizationError } from "../../middleware/error.middleware.js";
import type {
  HardwareItem,
  HardwareCheckout,
  HardwareReturn,
  HardwareDamageReport,
  HardwareAnalytics,
  HardwareTimelineEvent,
  CreateHardwareItemRequest,
  UpdateHardwareItemRequest,
  CheckoutHardwareRequest,
  ReturnHardwareRequest,
  CreateDamageReportRequest,
} from "../../types/index.js";

export const hardwareService = {
  // Hardware Items
  async listItems(eventId: string, params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: HardwareItem[]; total: number }> {
    return hardwareRepository.listByEvent(eventId, params);
  },

  async getItem(eventId: string, itemId: string): Promise<HardwareItem> {
    const item = await hardwareRepository.getById(eventId, itemId);
    if (!item) throw new NotFoundError('Hardware item not found');
    return item;
  },

  async createItem(eventId: string, data: CreateHardwareItemRequest, userId: string): Promise<HardwareItem> {
    // Validate quantity
    if (data.quantity_available !== undefined && data.quantity_available < 0) {
      throw new ValidationError('Quantity cannot be negative');
    }

    // Validate status
    const validStatuses = ['available', 'checked_out', 'damaged', 'lost', 'retired'];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new ValidationError('Invalid status');
    }

    // Validate condition
    const validConditions = ['new', 'good', 'fair', 'damaged', 'retired'];
    if (data.condition && !validConditions.includes(data.condition)) {
      throw new ValidationError('Invalid condition');
    }

    return hardwareRepository.create(eventId, data, userId);
  },

  async createItemsBulk(
    eventId: string,
    items: CreateHardwareItemRequest[],
    userId: string
  ): Promise<{ created: number; items: HardwareItem[] }> {
    // Reuse the single-item rules so a batch can never contain a row that
    // the regular create endpoint would reject
    for (const data of items) {
      if (data.quantity_available !== undefined && data.quantity_available < 0) {
        throw new ValidationError('Quantity cannot be negative');
      }
      const validStatuses = ['available', 'checked_out', 'damaged', 'lost', 'retired'];
      if (data.status && !validStatuses.includes(data.status)) {
        throw new ValidationError('Invalid status');
      }
      const validConditions = ['new', 'good', 'fair', 'damaged', 'retired'];
      if (data.condition && !validConditions.includes(data.condition)) {
        throw new ValidationError('Invalid condition');
      }
    }

    const created = await hardwareRepository.createMany(eventId, items, userId);
    return { created: created.length, items: created };
  },

  async updateItem(eventId: string, itemId: string, data: UpdateHardwareItemRequest, actorId?: string): Promise<HardwareItem> {
    const item = await hardwareRepository.getById(eventId, itemId);
    if (!item) throw new NotFoundError('Hardware item not found');

    // Validate status transitions
    if (data.status) {
      const validStatuses = ['available', 'checked_out', 'damaged', 'lost', 'retired'];
      if (!validStatuses.includes(data.status)) {
        throw new ValidationError('Invalid status');
      }

      // A checked-out unit is still in the field: it can only be marked
      // damaged or lost, never retired or reset to available.
      if (item.status === 'checked_out' && data.status !== 'damaged' && data.status !== 'lost') {
        if (data.status === 'available') {
          const activeCheckout = await hardwareRepository.getActiveCheckoutForItem(itemId);
          if (activeCheckout) {
            throw new ConflictError('Cannot mark as available while checked out');
          }
        }
        throw new ConflictError('Cannot change status while item is checked out');
      }
    }

    // Validate quantity
    if (data.quantity_available !== undefined && data.quantity_available < 0) {
      throw new ValidationError('Quantity cannot be negative');
    }

    // Validate condition
    if (data.condition) {
      const validConditions = ['new', 'good', 'fair', 'damaged', 'retired'];
      if (!validConditions.includes(data.condition)) {
        throw new ValidationError('Invalid condition');
      }
    }

    const updated = await hardwareRepository.update(eventId, itemId, data);
    if (!updated) throw new NotFoundError('Hardware item not found');

    // Status transitions land in audit_logs so the item timeline can show
    // them as auditable "status changed" history entries.
    if (data.status !== undefined && data.status !== item.status) {
      await hardwareRepository.writeStatusChangeAudit(eventId, itemId, actorId ?? null, item, updated);
    }
    return updated;
  },

  async deleteItem(eventId: string, itemId: string): Promise<void> {
    const item = await hardwareRepository.getById(eventId, itemId);
    if (!item) throw new NotFoundError('Hardware item not found');

    // Check for active checkouts
    const activeCheckout = await hardwareRepository.getActiveCheckoutForItem(itemId);
    if (activeCheckout) {
      throw new ConflictError('Cannot delete item with active checkout');
    }

    await hardwareRepository.delete(eventId, itemId);
  },

  // Checkouts
  async listCheckouts(eventId: string): Promise<HardwareCheckout[]> {
    await hardwareRepository.markOverdue(eventId);
    return hardwareRepository.listCheckouts(eventId);
  },

  async getCheckout(eventId: string, checkoutId: string): Promise<HardwareCheckout> {
    const checkout = await hardwareRepository.getCheckoutById(eventId, checkoutId);
    if (!checkout) throw new NotFoundError('Checkout not found');
    return checkout;
  },

  async checkoutItem(
    eventId: string,
    data: CheckoutHardwareRequest,
    actor: { id: string; globalRole: "admin" | "user"; eventRole?: string }
  ): Promise<HardwareCheckout> {
    // Validate item exists and is available
    const item = await hardwareRepository.getById(eventId, data.hardware_item_id);
    if (!item) throw new NotFoundError('Hardware item not found');
    if (item.status !== 'available') throw new ConflictError('Item is not available for checkout');
    if (item.quantity_available <= 0) throw new ConflictError('No quantity available');

    // Validate borrower exists
    const borrower = await authRepository.findById(data.borrower_user_id);
    if (!borrower) throw new NotFoundError('Borrower not found');

    // Hardware belongs to an event: borrower and actor must belong to it too
    if (!(await hardwareRepository.isEventMember(eventId, data.borrower_user_id))) {
      throw new AuthorizationError('Borrower is not an active member of this event');
    }
    if (actor.globalRole !== 'admin' && !(await hardwareRepository.isEventMember(eventId, actor.id))) {
      throw new AuthorizationError('You are not an active member of this event');
    }

    // PRD: participants request checkouts for themselves; only organizers,
    // volunteers, or platform admins check out on behalf of someone else.
    const canBorrowForOthers =
      actor.globalRole === 'admin' ||
      actor.eventRole === 'organizer' ||
      actor.eventRole === 'volunteer';
    if (!canBorrowForOthers && data.borrower_user_id !== actor.id) {
      throw new AuthorizationError('Participants can only check out items for themselves');
    }

    // Validate due date
    if (!data.due_at) {
      throw new ValidationError('Due time is required');
    }
    const dueDate = new Date(data.due_at);
    if (dueDate <= new Date()) {
      throw new ValidationError('Due date must be in the future');
    }

    return hardwareRepository.checkout(eventId, data, actor.id);
  },

  // Returns
  async returnItem(eventId: string, data: ReturnHardwareRequest): Promise<{ checkout: HardwareCheckout; returnRecord: HardwareReturn }> {
    // Validate checkout exists
    const checkout = await hardwareRepository.getCheckoutById(eventId, data.checkout_id);
    if (!checkout) throw new NotFoundError('Checkout not found');

    // Validate condition
    const validConditions = ['new', 'good', 'fair', 'damaged'];
    if (!validConditions.includes(data.condition)) {
      throw new ValidationError('Invalid condition');
    }

    // Validate severity up front so the transaction below cannot fail halfway
    let damage: { description: string; severity: string } | undefined;
    if (data.condition === 'damaged') {
      const severity = data.damage_severity || 'moderate';
      const validSeverities = ['minor', 'moderate', 'major', 'critical'];
      if (!validSeverities.includes(severity)) {
        throw new ValidationError('Invalid severity');
      }
      damage = {
        description: data.notes || 'Item returned in damaged condition',
        severity,
      };
    }

    // The receiving volunteer/organizer is recorded on the return record;
    // they must be a member of this event, not a cross-event user.
    if (!(await hardwareRepository.isEventMember(eventId, data.received_by))) {
      throw new AuthorizationError('Received-by user is not an active member of this event');
    }

    // Per PRD: a damaged return automatically creates its damage report.
    // Both writes happen inside one repository transaction.
    return hardwareRepository.returnHardware(eventId, data, damage);
  },

  // Timeline / history
  async getItemTimeline(eventId: string, itemId: string): Promise<HardwareTimelineEvent[]> {
    const item = await hardwareRepository.getById(eventId, itemId);
    if (!item) throw new NotFoundError('Hardware item not found');
    return hardwareRepository.getItemTimeline(eventId, itemId);
  },

  // Damage Reports
  async listDamageReports(eventId: string): Promise<HardwareDamageReport[]> {
    return hardwareRepository.listDamageReports(eventId);
  },

  async createDamageReport(eventId: string, data: CreateDamageReportRequest, reportedBy: string): Promise<HardwareDamageReport> {
    // Validate item exists
    const item = await hardwareRepository.getById(eventId, data.hardware_item_id);
    if (!item) throw new NotFoundError('Hardware item not found');

    // Validate severity
    const validSeverities = ['minor', 'moderate', 'major', 'critical'];
    if (!validSeverities.includes(data.severity)) {
      throw new ValidationError('Invalid severity');
    }

    // If checkout_id provided, verify it belongs to this item
    if (data.checkout_id) {
      const checkout = await hardwareRepository.getCheckoutById(eventId, data.checkout_id);
      if (!checkout) throw new NotFoundError('Checkout not found');
      if (checkout.hardware_item_id !== data.hardware_item_id) {
        throw new ValidationError('Checkout does not match hardware item');
      }
    }

    return hardwareRepository.createDamageReport(eventId, data, reportedBy);
  },

  async resolveDamageReport(eventId: string, reportId: string, resolvedBy: string, restore = false): Promise<HardwareDamageReport> {
    const report = await hardwareRepository.resolveDamageReport(eventId, reportId, resolvedBy, restore);
    if (!report) throw new NotFoundError('Damage report not found');
    return report;
  },

  // Analytics
  async getAnalytics(eventId: string): Promise<HardwareAnalytics> {
    await hardwareRepository.markOverdue(eventId);
    return hardwareRepository.getAnalytics(eventId);
  },

  // Overdue Management
  async getOverdueItems(eventId: string): Promise<HardwareCheckout[]> {
    await hardwareRepository.markOverdue(eventId);
    return hardwareRepository.getOverdueCheckouts(eventId);
  },

  async markOverdueItems(eventId: string): Promise<number> {
    return hardwareRepository.markOverdue(eventId);
  },

  // User-specific
  async getUserActiveCheckouts(eventId: string, userId: string): Promise<HardwareCheckout[]> {
    return hardwareRepository.getUserActiveCheckouts(eventId, userId);
  },
};