import type { Request, Response, NextFunction } from "express";
import { notificationsService } from "./notifications.service.js";
import { ValidationError } from "../../middleware/error.middleware.js";
import type { AuthRequest } from "../../types/index.js";
import { p } from "../../types/index.js";

export const notificationsController = {
  async listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");

      const unreadOnly = req.query.unread === "true";
      const notifications = await notificationsService.listNotifications(eventId, req.user.id, unreadOnly);
      res.json({ success: true, data: { notifications } });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");

      const count = await notificationsService.getUnreadCount(eventId, req.user.id);
      res.json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const notificationId = p(req, "notificationId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");
      if (!notificationId) throw new ValidationError("Notification ID is required");

      const notification = await notificationsService.markAsRead(eventId, notificationId, req.user.id);
      if (!notification) throw new ValidationError("Notification not found");
      res.json({ success: true, data: { notification } });
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");

      await notificationsService.markAllAsRead(eventId, req.user.id);
      res.json({ success: true, data: { marked: true } });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const eventId = p(req, "eventId");
      const notificationId = p(req, "notificationId");
      if (!eventId) throw new ValidationError("Event ID is required");
      if (!req.user) throw new ValidationError("Authentication required");
      if (!notificationId) throw new ValidationError("Notification ID is required");

      const deleted = await notificationsService.delete(eventId, notificationId, req.user.id);
      if (!deleted) throw new ValidationError("Notification not found");
      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  },
};
