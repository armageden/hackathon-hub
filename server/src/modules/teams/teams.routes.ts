import { Router } from "express";
import { teamsController } from "./teams.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireEventRole } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

// View routes - everyone can see teams
router.get(
  "/",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  teamsController.listTeams
);

router.get(
  "/:teamId",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  teamsController.getTeam
);

// Participant-only routes
router.post(
  "/",
  authenticate,
  requireEventRole("organizer", "participant"),
  teamsController.createTeam
);

router.put(
  "/:teamId",
  authenticate,
  requireEventRole("participant"),
  teamsController.updateTeam
);

router.delete(
  "/:teamId",
  authenticate,
  requireEventRole("organizer", "participant"),
  teamsController.deleteTeam
);

router.post(
  "/:teamId/join",
  authenticate,
  requireEventRole("participant"),
  teamsController.joinTeam
);

router.post(
  "/:teamId/leave",
  authenticate,
  requireEventRole("participant"),
  teamsController.leaveTeam
);

router.delete(
  "/:teamId/members/:userId",
  authenticate,
  requireEventRole("organizer", "participant"),
  teamsController.removeMember
);

router.post(
  "/:teamId/applications",
  authenticate,
  requireEventRole("participant"),
  teamsController.applyToTeam
);

router.get(
  "/:teamId/applications",
  authenticate,
  requireEventRole("participant"),
  teamsController.listApplications
);

router.put(
  "/:applicationId/review",
  authenticate,
  requireEventRole("participant"),
  teamsController.reviewApplication
);

// Organizer-only admin routes
router.post(
  "/auto-assign",
  authenticate,
  requireEventRole("organizer"),
  teamsController.autoAssign
);

router.delete(
  "/:teamId/admin",
  authenticate,
  requireEventRole("organizer"),
  teamsController.deleteTeamByOrganizer
);

router.post(
  "/:teamId/admin/join",
  authenticate,
  requireEventRole("organizer"),
  teamsController.forceJoinTeam
);

export default router;
