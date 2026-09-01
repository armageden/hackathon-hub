import type { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service.js";
import { ValidationError } from "../../middleware/error.middleware.js";
import { p, type AuthRequest } from "../../types/index.js";

export const adminController = {
  async listAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await adminService.listAdmins();
      res.json({ success: true, data: { admins } });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await adminService.listUsers();
      res.json({ success: true, data: { users } });
    } catch (err) {
      next(err);
    }
  },

  async grantAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ValidationError("Authentication required");
      const { email, expires_at } = req.body as { email?: string; expires_at?: string };
      if (!email || typeof email !== "string" || !email.includes("@")) {
        throw new ValidationError("A valid email is required");
      }
      const admin = await adminService.grantAdmin(req.user.id, email.trim().toLowerCase(), expires_at);
      res.status(201).json({ success: true, data: { admin } });
    } catch (err) {
      next(err);
    }
  },

  async demoteAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ValidationError("Authentication required");
      const userId = p(req, "userId");
      if (!userId) throw new ValidationError("User ID is required");
      const admin = await adminService.demoteAdmin(req.user.id, userId);
      res.json({ success: true, data: { admin } });
    } catch (err) {
      next(err);
    }
  },
};
