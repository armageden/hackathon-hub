import { Router } from "express";
import { venueController } from "./venue.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireEventRole } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

router.get(
  "/locations",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  venueController.listLocations
);

router.post("/locations", authenticate, requireEventRole("organizer"), venueController.createLocation);

router.put(
  "/locations/:locationId",
  authenticate,
  requireEventRole("organizer"),
  venueController.updateLocation
);

router.delete(
  "/locations/:locationId",
  authenticate,
  requireEventRole("organizer"),
  venueController.deleteLocation
);

router.get(
  "/assignments",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  venueController.listAssignments
);

router.post(
  "/assignments",
  authenticate,
  requireEventRole("organizer"),
  venueController.createAssignment
);

router.put(
  "/assignments/:assignmentId",
  authenticate,
  requireEventRole("organizer"),
  venueController.updateAssignment
);

router.delete(
  "/assignments/:assignmentId",
  authenticate,
  requireEventRole("organizer"),
  venueController.cancelAssignment
);

export default router;
