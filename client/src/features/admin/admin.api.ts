import { apiRequest } from "../../lib/api";
import type { User } from "@/types/api";

export interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  global_role: "admin" | "user";
  admin_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listAdmins(): Promise<AdminAccount[]> {
  const res = await apiRequest<{ admins: AdminAccount[] }>("/admin/admins");
  return res.admins;
}

export interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  global_role: "admin" | "user";
}

export async function listUsers(): Promise<PlatformUser[]> {
  const res = await apiRequest<{ users: PlatformUser[] }>("/admin/users");
  return res.users;
}

export async function grantAdmin(email: string, expiresAt?: string): Promise<AdminAccount> {
  const res = await apiRequest<{ admin: AdminAccount }>("/admin/admins", {
    method: "POST",
    body: JSON.stringify({ email, ...(expiresAt ? { expires_at: expiresAt } : {}) }),
  });
  return res.admin;
}

export async function demoteAdmin(userId: string): Promise<AdminAccount> {
  const res = await apiRequest<{ admin: AdminAccount }>(`/admin/admins/${userId}`, {
    method: "DELETE",
  });
  return res.admin;
}

export type { User };
