import { pool } from "../../db/pool.js";
import type { User } from "../../types/index.js";

export const authRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      "SELECT id, email, password_hash, full_name, global_role, admin_expires_at, created_at, updated_at FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<Omit<User, "password_hash"> | null> {
    const result = await pool.query(
      "SELECT id, email, full_name, global_role, admin_expires_at, created_at, updated_at FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  },

  async create(
    email: string,
    passwordHash: string,
    fullName: string,
    globalRole: "admin" | "user" = "user"
  ): Promise<Omit<User, "password_hash">> {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, global_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, global_role, admin_expires_at, created_at, updated_at`,
      [email, passwordHash, fullName, globalRole]
    );
    return result.rows[0];
  },
};
