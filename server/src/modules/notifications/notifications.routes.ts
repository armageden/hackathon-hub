import { Router } from "express";
import { notificationsController } from "./notifications.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireEventRole } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  notificationsController.listNotifications
);

router.get(
  "/unread-count",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  notificationsController.getUnreadCount
);

router.post(
  "/read-all",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  notificationsController.markAllAsRead
);

router.post(
  "/:notificationId/read",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  notificationsController.markAsRead
);

router.delete(
  "/:notificationId",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  notificationsController.delete
);

export default router;
