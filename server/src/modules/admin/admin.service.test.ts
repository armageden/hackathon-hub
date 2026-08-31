import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./admin.repository.js", () => ({
  adminRepository: {
    listAdmins: vi.fn(),
    setAdminRole: vi.fn(),
    countPermanentAdmins: vi.fn(),
  },
}));

vi.mock("../auth/auth.repository.js", () => ({
  authRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
  },
}));

import { adminService } from "./admin.service.js";
import { adminRepository } from "./admin.repository.js";
import { authRepository } from "../auth/auth.repository.js";

const repo = adminRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const authRepo = authRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

const PERMANENT_ACTOR = { id: "admin-1" };
const TEMP_ACTOR = { id: "admin-2" };

describe("adminService.grantAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRepo.findById.mockImplementation(async (id: string) =>
      id === "admin-1"
        ? { id, global_role: "admin", admin_expires_at: null }
        : { id, global_role: "admin", admin_expires_at: new Date(Date.now() + 3_600_000) }
    );
  });

  it("grants a temporary admin with a future expiry", async () => {
    authRepo.findByEmail.mockResolvedValue({ id: "u1", email: "u@test", global_role: "user" });
    repo.setAdminRole.mockResolvedValue({ id: "u1", global_role: "admin" });
    const result = await adminService.grantAdmin(
      PERMANENT_ACTOR.id,
      "u@test",
      new Date(Date.now() + 86_400_000).toISOString()
    );
    expect(repo.setAdminRole).toHaveBeenCalledWith("u1", "admin", expect.any(Date));
    expect(result.global_role).toBe("admin");
  });

  it("grants permanent admin only to a permanent admin actor", async () => {
    authRepo.findByEmail.mockResolvedValue({ id: "u1", email: "u@test", global_role: "user" });
    await adminService.grantAdmin(PERMANENT_ACTOR.id, "u@test");
    expect(repo.setAdminRole).toHaveBeenCalledWith("u1", "admin", null);

    repo.setAdminRole.mockClear();
    await expect(adminService.grantAdmin(TEMP_ACTOR.id, "u@test")).rejects.toThrow(
      "Only a permanent admin can grant permanent admin access"
    );
    expect(repo.setAdminRole).not.toHaveBeenCalled();
  });

  it("rejects an expiry in the past", async () => {
    await expect(
      adminService.grantAdmin(PERMANENT_ACTOR.id, "u@test", new Date(Date.now() - 1000).toISOString())
    ).rejects.toThrow("must be a date in the future");
    expect(repo.setAdminRole).not.toHaveBeenCalled();
  });

  it("rejects an unknown email", async () => {
    authRepo.findByEmail.mockResolvedValue(null);
    await expect(adminService.grantAdmin(PERMANENT_ACTOR.id, "ghost@test")).rejects.toThrow(
      "User not found"
    );
    expect(repo.setAdminRole).not.toHaveBeenCalled();
  });
});

describe("adminService.demoteAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("demotes an admin and clears the expiry", async () => {
    authRepo.findById.mockResolvedValue({ id: "u1", global_role: "admin", admin_expires_at: null });
    repo.countPermanentAdmins.mockResolvedValue(2);
    repo.setAdminRole.mockResolvedValue({ id: "u1", global_role: "user" });
    await adminService.demoteAdmin("admin-1", "u1");
    expect(repo.setAdminRole).toHaveBeenCalledWith("u1", "user", null);
  });

  it("refuses to demote the last permanent admin", async () => {
    authRepo.findById.mockResolvedValue({ id: "u1", global_role: "admin", admin_expires_at: null });
    repo.countPermanentAdmins.mockResolvedValue(0);
    await expect(adminService.demoteAdmin("admin-1", "u1")).rejects.toThrow(
      "last permanent admin"
    );
    expect(repo.setAdminRole).not.toHaveBeenCalled();
  });

  it("refuses to demote your own account", async () => {
    await expect(adminService.demoteAdmin("admin-1", "admin-1")).rejects.toThrow(
      "cannot demote your own account"
    );
    expect(authRepo.findById).not.toHaveBeenCalled();
  });

  it("rejects demoting a user who is not an admin", async () => {
    authRepo.findById.mockResolvedValue({ id: "u1", global_role: "user", admin_expires_at: null });
    await expect(adminService.demoteAdmin("admin-1", "u1")).rejects.toThrow("not an admin");
    expect(repo.setAdminRole).not.toHaveBeenCalled();
  });
});

describe("adminService.listAdmins", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to the repository", async () => {
    const rows = [{ id: "a1", email: "a@test", admin_expires_at: null }];
    repo.listAdmins.mockResolvedValue(rows);
    expect(await adminService.listAdmins()).toEqual(rows);
  });
});
