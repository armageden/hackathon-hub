import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireGlobalRole } from "../../middleware/role.middleware.js";

const router = Router();

// Global-admin management is platform-level: every route requires a current
// (non-expired) global admin.
router.use(authenticate, requireGlobalRole("admin"));

router.get("/admins", adminController.listAdmins);
router.post("/admins", adminController.grantAdmin);
router.delete("/admins/:userId", adminController.demoteAdmin);

export default router;
