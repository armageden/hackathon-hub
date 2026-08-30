import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { authRepository } from "./auth.repository.js";
import { ConflictError, AuthenticationError, NotFoundError } from "../../middleware/error.middleware.js";
import { effectiveGlobalRole } from "../../middleware/role.middleware.js";
import type { JwtPayload, UserPublic } from "../../types/index.js";

export const authService = {
  async register(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ user: UserPublic; token: string }> {
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await authRepository.create(email, passwordHash, fullName);

    const token = generateToken({
      sub: user.id,
      email: user.email,
      globalRole: effectiveGlobalRole(user) as "admin" | "user",
    });

    return { user: withEffectiveRole(user), token };
  },

  async login(
    email: string,
    password: string
  ): Promise<{ user: UserPublic; token: string }> {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    const token = generateToken({
      sub: user.id,
      email: user.email,
      globalRole: effectiveGlobalRole(user) as "admin" | "user",
    });

    return { user: withEffectiveRole(user), token };
  },

  async getMe(userId: string): Promise<UserPublic> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return withEffectiveRole(user);
  },
};

// Apply the temporary-admin rule to what the API reports: a lapsed admin is
// a plain user, so the client renders (and requests) accordingly.
function withEffectiveRole<
  T extends { global_role: string; admin_expires_at?: Date | string | null },
>(user: T) {
  return { ...user, global_role: effectiveGlobalRole(user) as "admin" | "user" };
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}
