import { Router } from "express";
import { demoController } from "./demo.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireGlobalRole } from "../../middleware/role.middleware.js";

const router = Router();

// Demo data is a global dev/demo tool, not an event-scoped resource: only
// global admins may seed or purge it. requireGlobalRole re-reads the role
// from the DB (and honours temporary-admin expiry) instead of trusting the
// JWT claim.
router.post("/enable", authenticate, requireGlobalRole("admin"), demoController.enable);
router.post("/disable", authenticate, requireGlobalRole("admin"), demoController.disable);
router.get("/status", authenticate, requireGlobalRole("admin"), demoController.status);

export default router;
