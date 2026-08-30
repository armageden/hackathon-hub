import { pool } from "../../db/pool.js";
import type { User } from "../../types/index.js";

export interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  global_role: "admin" | "user";
  admin_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const adminRepository = {
  async listAdmins(): Promise<AdminAccount[]> {
    // Permanent admins first, then temporary ones by soonest expiry.
    const result = await pool.query<AdminAccount>(
      `SELECT id, email, full_name, global_role, admin_expires_at, created_at, updated_at
       FROM users
       WHERE global_role = 'admin'
       ORDER BY (admin_expires_at IS NULL) DESC, COALESCE(admin_expires_at, 'infinity') ASC`
    );
    return result.rows;
  },

  async setAdminRole(
    userId: string,
    role: "admin" | "user",
    adminExpiresAt: Date | null
  ): Promise<AdminAccount> {
    const result = await pool.query<AdminAccount>(
      `UPDATE users SET global_role = $2, admin_expires_at = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, full_name, global_role, admin_expires_at, created_at, updated_at`,
      [userId, role, adminExpiresAt]
    );
    return result.rows[0];
  },

  /** Active, non-expiring admins other than `excludeUserId`. */
  async countPermanentAdmins(excludeUserId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM users
       WHERE global_role = 'admin'
         AND (admin_expires_at IS NULL OR admin_expires_at > NOW())
         AND id <> $1`,
      [excludeUserId]
    );
    return result.rows[0].count;
  },
};

export type { User };
