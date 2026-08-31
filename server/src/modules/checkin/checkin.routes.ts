import { Router } from "express";
import { checkinController } from "./checkin.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireEventRole } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

router.get(
  "/",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  checkinController.listCheckins
);

router.post(
  "/manual",
  authenticate,
  requireEventRole("organizer", "volunteer"),
  checkinController.manualCheckin
);

router.post(
  "/qr",
  authenticate,
  requireEventRole("participant", "organizer", "volunteer"),
  checkinController.qrCheckin
);

router.post(
  "/qr/generate",
  authenticate,
  requireEventRole("organizer", "volunteer"),
  checkinController.generateQRToken
);

router.get(
  "/stats",
  authenticate,
  requireEventRole("organizer"),
  checkinController.getStats
);

router.post(
  "/bulk",
  authenticate,
  requireEventRole("organizer"),
  checkinController.bulkCheckin
);

router.post(
  "/:checkinId/checkout",
  authenticate,
  requireEventRole("organizer"),
  checkinController.checkout
);

export default router;