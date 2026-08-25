import type { Response, NextFunction } from "express";
import { pool } from "../db/pool.js";
import { AuthorizationError } from "./error.middleware.js";
import type { AuthRequest } from "../types/index.js";

// The JWT's globalRole claim is trusted for cheap checks elsewhere, but these
// gates protect destructive actions — re-read the role so demotion takes
// effect immediately instead of at token expiry.
export function requireGlobalRole(...roles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError("Authentication required");
      }

      const result = await pool.query(
        "SELECT global_role FROM users WHERE id = $1",
        [req.user.id]
      );
      const dbRole = result.rows[0]?.global_role;

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
