import { Router } from "express";
import { eventMembersController } from "./event-members.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireGlobalRole } from "../../middleware/role.middleware.js";
import { requireEventRole, requireEventRoleOrAdmin } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

router.get(
  "/me",
  authenticate,
  eventMembersController.getMyRole
);

router.get(
  "/",
  authenticate,
  // Any event member can view the directory; platform admins also pass so
  // they can manage events they aren't personally members of.
  requireEventRoleOrAdmin("organizer", "participant", "volunteer", "judge"),
  eventMembersController.listMembers
);

router.post(
  "/",
  authenticate,
  requireGlobalRole("admin"),
  eventMembersController.addMember
);

router.put(
  "/:userId",
  authenticate,
  requireGlobalRole("admin"),
  eventMembersController.updateRole
);

router.delete(
  "/:userId",
  authenticate,
  requireGlobalRole("admin"),
  eventMembersController.removeMember
);

export default router;
