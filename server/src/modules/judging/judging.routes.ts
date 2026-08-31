import { Router } from "express";
import { judgingController } from "./judging.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireEventRole } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

router.get(
  "/projects",
  authenticate,
  requireEventRole("judge", "organizer"),
  judgingController.listScorable
);

router.post(
  "/projects/:projectId/scores",
  authenticate,
  requireEventRole("judge", "organizer"),
  judgingController.score
);

// Score list for a project — judges see their own context, organizers manage edits.
router.get(
  "/projects/:projectId/scores",
  authenticate,
  requireEventRole("judge", "organizer"),
  judgingController.listScores
);

// PRD: scores are final unless the organizer allows an edit — organizer-only.
router.put(
  "/scores/:scoreId",
  authenticate,
  requireEventRole("organizer"),
  judgingController.updateScore
);

router.get(
  "/leaderboard",
  authenticate,
  requireEventRole("organizer", "participant", "volunteer", "judge"),
  judgingController.leaderboard
);

export default router;
