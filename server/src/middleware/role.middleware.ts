import type { Response, NextFunction } from "express";
import { pool } from "../db/pool.js";
import { AuthorizationError } from "./error.middleware.js";
import type { AuthRequest } from "../types/index.js";

// The JWT's globalRole claim is trusted for cheap checks elsewhere, but these
// gates protect destructive actions — re-read the role so demotion takes
// effect immediately instead of at token expiry. Temporary admins
// (users.admin_expires_at) count as admins only while their window is open.
export function requireGlobalRole(...roles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const result = await pool.query(
        "SELECT global_role, admin_expires_at FROM users WHERE id = $1",
        [req.user.id]
      );
      const row = result.rows[0] as
        | { global_role: string; admin_expires_at: Date | string | null }
        | undefined;
      const dbRole = row ? effectiveGlobalRole(row) : undefined;

      if (!dbRole || !roles.includes(dbRole)) {
        throw new AuthorizationError(
          `Requires one of the following roles: ${roles.join(", ")}`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// Single source of truth for temporary-admin expiry: an admin whose window
// has lapsed is effectively a plain user.
export function effectiveGlobalRole(user: {
  global_role: string;
  admin_expires_at?: Date | string | null;
}): string {
  if (
    user.global_role === "admin" &&
    user.admin_expires_at != null &&
    new Date(user.admin_expires_at) <= new Date()
  ) {
    return "user";
  }
  return user.global_role;
}
