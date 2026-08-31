-- Temporary admin support: when admin_expires_at is set, the user's admin
-- role is only effective until that instant (enforced in requireGlobalRole
-- and in the effective role reported by /auth/me and login). NULL means
-- permanent (or a plain user).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_expires_at TIMESTAMPTZ;
