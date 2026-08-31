import { Router } from "express";
import { eventsController } from "./events.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireGlobalRole } from "../../middleware/role.middleware.js";

const router = Router();

// List events for current user
router.get(
  "/",
  authenticate,
  eventsController.list
);

// Create new event — platform admins only (temporary admins pass while their
// admin_expires_at window is open; requireGlobalRole re-reads the role from
// the DB on every request, so a lapsed temp admin is rejected immediately).
router.post(
  "/",
  authenticate,
  requireGlobalRole("admin"),
  eventsController.create
);

// Get event by ID
router.get(
  "/:eventId",
  authenticate,
  eventsController.getById
);

// Update event
router.put(
  "/:eventId",
  authenticate,
  eventsController.update
);

// Delete event
router.delete(
  "/:eventId",
  authenticate,
  eventsController.delete
);

export default router;
