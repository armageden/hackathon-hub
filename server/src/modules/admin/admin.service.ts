import { adminRepository } from "./admin.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../middleware/error.middleware.js";
import { effectiveGlobalRole } from "../../middleware/role.middleware.js";
import type { AdminAccount } from "./admin.repository.js";

export const adminService = {
  /**
   * Promote a user to admin. Without `expiresAt` the promotion is permanent
   * and can only be granted by a permanent admin — a temporary admin must
   * not be able to mint unlimited successors.
   */
  async grantAdmin(
    actorId: string,
    email: string,
    expiresAt?: string
  ): Promise<AdminAccount> {
    let expiry: Date | null = null;
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== "") {
      expiry = new Date(expiresAt);
      if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
        throw new ValidationError("Expiry must be a date in the future");
      }
    }

    if (expiry === null) {
      const actor = await authRepository.findById(actorId);
      const actorPermanent =
        actor != null &&
        effectiveGlobalRole({ global_role: actor.global_role, admin_expires_at: actor.admin_expires_at }) === "admin" &&
        actor.admin_expires_at == null;
      if (!actorPermanent) {
        throw new AuthorizationError("Only a permanent admin can grant permanent admin access");
      }
    }

    const user = await authRepository.findByEmail(email);
    if (!user) throw new NotFoundError("User not found");

    return adminRepository.setAdminRole(user.id, "admin", expiry);
  },

  async listAdmins(): Promise<AdminAccount[]> {
    return adminRepository.listAdmins();
  },

  async demoteAdmin(actorId: string, userId: string): Promise<AdminAccount> {
    if (actorId === userId) {
      throw new ConflictError("You cannot demote your own account");
    }

    const user = await authRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    // Raw role check (not the effective one): an expired temporary admin
    // must still be demotable — that IS the revoke path for a lapsed grant.
    if (user.global_role !== "admin") {
      throw new ConflictError("This user is not an admin");
    }

    // Never remove the last permanent admin — that would lock the platform.
    if (user.admin_expires_at == null || new Date(user.admin_expires_at) > new Date()) {
      const others = await adminRepository.countPermanentAdmins(userId);
      if (others === 0) {
        throw new ConflictError("Cannot demote the last permanent admin");
      }
    }

    return adminRepository.setAdminRole(userId, "user", null);
  },
};
