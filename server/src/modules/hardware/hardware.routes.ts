import { Router } from "express";
import { hardwareController } from "./hardware.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireGlobalRole } from "../../middleware/role.middleware.js";
import { requireEventRoleOrAdmin } from "../../middleware/event-role.middleware.js";

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Any event member (or platform admin) may read; writes are organizer-scoped.
const ANY_MEMBER = ["organizer", "participant", "volunteer", "judge"] as const;

// Hardware Items
router.get("/items", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.listItems);
router.get("/items/:itemId", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.getItem);
router.get("/items/:itemId/timeline", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.getItemTimeline);
router.post("/items", requireEventRoleOrAdmin("organizer"), hardwareController.createItem);
router.post("/items/bulk", requireGlobalRole("admin"), hardwareController.createItemsBulk);
router.put("/items/:itemId", requireEventRoleOrAdmin("organizer"), hardwareController.updateItem);
router.delete("/items/:itemId", requireGlobalRole("admin"), hardwareController.deleteItem);

// Checkouts
router.get("/checkouts", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.listCheckouts);
router.get("/checkouts/:checkoutId", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.getCheckout);
router.post("/checkouts", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.checkoutItem);

// Returns
router.post("/returns", requireEventRoleOrAdmin("organizer", "volunteer"), hardwareController.returnItem);

// Damage Reports
router.get("/damage-reports", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.listDamageReports);
router.post("/damage-reports", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.createDamageReport);
router.put("/damage-reports/:reportId/resolve", requireEventRoleOrAdmin("organizer"), hardwareController.resolveDamageReport);

// Analytics
router.get("/analytics", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.getAnalytics);

// Overdue
router.get("/overdue", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.getOverdue);
router.post("/overdue/mark", requireEventRoleOrAdmin("organizer"), hardwareController.markOverdue);

// User's active checkouts
router.get("/my-checkouts", requireEventRoleOrAdmin(...ANY_MEMBER), hardwareController.getMyCheckouts);

export default router;
