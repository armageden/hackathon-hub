import { Router } from "express";
import { eventsController } from "./events.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

// List events for current user
router.get(
  "/",
  authenticate,
  eventsController.list
);

// Create new event
router.post(
  "/",
  authenticate,
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
