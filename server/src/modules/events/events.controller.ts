import type { Request, Response, NextFunction } from "express";
import { eventsService } from "./events.service.js";
import { ValidationError } from "../../middleware/error.middleware.js";
import { p } from "../../types/index.js";
import type { AuthRequest } from "../../types/index.js";

export const eventsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ValidationError("Authentication required");

      const events = await eventsService.listByUser(req.user.id);
      res.json({ success: true, data: { events } });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");

      const event = await eventsService.getById(eventId, req.user.id);
      res.json({ success: true, data: { event } });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ValidationError("Authentication required");

      const { name, slug, description, starts_at, ends_at } = req.body;

      if (!name) throw new ValidationError("Event name is required");

      const event = await eventsService.create(
        { name, slug, description, starts_at, ends_at },
        req.user.id
      );

      res.status(201).json({ success: true, data: { event } });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");

      const { name, slug, description, starts_at, ends_at, status } = req.body;

      const event = await eventsService.update(
        eventId,
        { name, slug, description, starts_at, ends_at, status },
        req.user.id
      );

      res.json({ success: true, data: { event } });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");

      await eventsService.delete(eventId, req.user.id);
      res.json({ success: true, data: { message: "Event deleted" } });
    } catch (err) {
      next(err);
    }
  },
};
