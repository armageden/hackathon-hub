import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { hardwareService } from "./hardware.service.js";
import { hardwareRepository } from "./hardware.repository.js";
import { ValidationError, NotFoundError, AuthorizationError } from "../../middleware/error.middleware.js";
import type { AuthRequest } from "../../types/index.js";

// Helper to safely get string param
const getParam = (params: Record<string, unknown>, key: string): string => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : (value as string);
};

// Zod schemas
const createHardwareItemSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  model: z.string().max(255).optional(),
  serial_number: z.string().max(255).optional(),
  quantity_available: z.number().int().min(0).default(1),
  condition: z.enum(['new', 'good', 'fair', 'damaged', 'retired']).default('good'),
  status: z.enum(['available', 'checked_out', 'damaged', 'lost', 'retired']).default('available'),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
});

const updateHardwareItemSchema = createHardwareItemSchema.partial();

const bulkItemsSchema = z.object({
  items: z.array(createHardwareItemSchema).min(1).max(200),
});

const checkoutSchema = z.object({
  hardware_item_id: z.string().uuid(),
  borrower_user_id: z.string().uuid(),
  due_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const returnSchema = z.object({
  checkout_id: z.string().uuid(),
  condition: z.enum(['new', 'good', 'fair', 'damaged']),
  received_by: z.string().uuid(),
  notes: z.string().optional(),
  damage_severity: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
});

const damageReportSchema = z.object({
  hardware_item_id: z.string().uuid(),
  checkout_id: z.string().uuid().optional(),
  description: z.string().min(1),
  severity: z.enum(['minor', 'moderate', 'major', 'critical']),
});

const queryParamsSchema = z.object({
  status: z.enum(['available', 'checked_out', 'damaged', 'lost', 'retired']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['name', 'category', 'model', 'quantity_available', 'status', 'created_at', 'updated_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const hardwareController = {
  // Hardware Items
  async listItems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      const params = queryParamsSchema.parse(req.query);
      const result = await hardwareService.listItems(eventId, params);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / params.pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      const itemId = getParam(req.params, 'itemId');
      if (!eventId || !itemId) throw new ValidationError('Event ID and Item ID required');

      const item = await hardwareService.getItem(eventId, itemId);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  async createItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const data = createHardwareItemSchema.parse(req.body);
      const item = await hardwareService.createItem(eventId, data, req.user.id);

      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  async createItemsBulk(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const { items } = bulkItemsSchema.parse(req.body);
      const result = await hardwareService.createItemsBulk(eventId, items, req.user.id);

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      const itemId = getParam(req.params, 'itemId');
      if (!eventId || !itemId) throw new ValidationError('Event ID and Item ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const data = updateHardwareItemSchema.parse(req.body);
      const item = await hardwareService.updateItem(eventId, itemId, data, req.user.id);

      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  async deleteItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      const itemId = getParam(req.params, 'itemId');
      if (!eventId || !itemId) throw new ValidationError('Event ID and Item ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      await hardwareService.deleteItem(eventId, itemId);
      res.json({ success: true, data: { message: 'Item deleted' } });
    } catch (err) {
      next(err);
    }
  },

  // Checkouts
  async listCheckouts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      const checkouts = await hardwareService.listCheckouts(eventId);
      res.json({ success: true, data: checkouts });
    } catch (err) {
      next(err);
    }
  },

  async getCheckout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      const checkoutId = getParam(req.params, 'checkoutId');
      if (!eventId || !checkoutId) throw new ValidationError('Event ID and Checkout ID required');

      const checkout = await hardwareService.getCheckout(eventId, checkoutId);
      res.json({ success: true, data: checkout });
    } catch (err) {
      next(err);
    }
  },

  async checkoutItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const data = checkoutSchema.parse(req.body);
      // eventRole is stamped by requireEventRoleOrAdmin and distinguishes
      // "borrowing for self" (participants) from "borrowing for others".
      const eventRole = (req as any).eventRole as string | undefined;
      const checkout = await hardwareService.checkoutItem(eventId, data, { ...req.user, eventRole });

      res.status(201).json({ success: true, data: checkout });
    } catch (err) {
      next(err);
    }
  },

  // Returns
  async returnItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const data = returnSchema.parse(req.body);
      const result = await hardwareService.returnItem(eventId, data);

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  // Damage Reports
  async listDamageReports(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      const reports = await hardwareService.listDamageReports(eventId);
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  },

  async createDamageReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const data = damageReportSchema.parse(req.body);
      const report = await hardwareService.createDamageReport(eventId, data, req.user.id);

      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },

  async resolveDamageReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      const reportId = getParam(req.params, 'reportId');
      if (!eventId || !reportId) throw new ValidationError('Event ID and Report ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const report = await hardwareService.resolveDamageReport(
        eventId,
        reportId,
        req.user.id,
        Boolean((req.body as { restore?: boolean } | undefined)?.restore)
      );
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },

  // Item timeline
  async getItemTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      const itemId = getParam(req.params, 'itemId');
      if (!eventId || !itemId) throw new ValidationError('Event ID and Item ID required');

      const timeline = await hardwareService.getItemTimeline(eventId, itemId);
      res.json({ success: true, data: timeline });
    } catch (err) {
      next(err);
    }
  },

  // Analytics
  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      const analytics = await hardwareService.getAnalytics(eventId);
      res.json({ success: true, data: analytics });
    } catch (err) {
      next(err);
    }
  },

  // Overdue
  async getOverdue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      const overdue = await hardwareService.getOverdueItems(eventId);
      res.json({ success: true, data: overdue });
    } catch (err) {
      next(err);
    }
  },

  async markOverdue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const count = await hardwareService.markOverdueItems(eventId);
      res.json({ success: true, data: { marked: count } });
    } catch (err) {
      next(err);
    }
  },

  // User checkouts
  async getMyCheckouts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = getParam(req.params, 'eventId');
      if (!eventId) throw new ValidationError('Event ID required');

      if (!req.user) throw new AuthorizationError('Authentication required');

      const checkouts = await hardwareService.getUserActiveCheckouts(eventId, req.user.id);
      res.json({ success: true, data: checkouts });
    } catch (err) {
      next(err);
    }
  },
};