import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useAuth = vi.hoisted(() => vi.fn());
vi.mock("@/app/providers", () => ({ useAuth }));

const adminApi = vi.hoisted(() => ({
  listAdmins: vi.fn(),
  grantAdmin: vi.fn(),
  demoteAdmin: vi.fn(),
}));
vi.mock("./admin.api", () => adminApi);

import AdminPage from "./AdminPage";

const permanentAdmin = {
  id: "admin-1",
  email: "admin@hackathon.com",
  full_name: "Farmed Ahmed",
  global_role: "admin",
  admin_expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const tempAdmin = {
  id: "admin-2",
  email: "helper@hackathon.com",
  full_name: "Temp Helper",
  global_role: "admin",
  admin_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "admin-1", global_role: "admin" } });
    adminApi.listAdmins.mockResolvedValue([permanentAdmin, tempAdmin]);
    adminApi.grantAdmin.mockResolvedValue({ ...tempAdmin, full_name: "New Admin" });
    adminApi.demoteAdmin.mockResolvedValue({ ...tempAdmin, global_role: "user" });
  });

  it("lists permanent and temporary admins with their access windows", async () => {
    render(<AdminPage />);
    expect(await screen.findByText("Farmed Ahmed")).toBeInTheDocument();
    expect(screen.getByText("Permanent")).toBeInTheDocument();
    expect(screen.getByText(/Until /)).toBeInTheDocument();
  });

  it("grants a temporary admin with an expiry through the form", async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    await user.type(await screen.findByPlaceholderText("user@hackathon.com"), "new@test.com");
    await user.click(screen.getByRole("button", { name: "1 day" }));
    await user.click(screen.getByRole("button", { name: /Grant Temporary Admin/i }));

    await waitFor(() => expect(adminApi.grantAdmin).toHaveBeenCalled());
    const [email, expiresAt] = adminApi.grantAdmin.mock.calls[0];
    expect(email).toBe("new@test.com");
    expect(new Date(expiresAt as string).getTime()).toBeGreaterThan(Date.now());
  });

  it("grants a permanent admin after switching to the permanent mode", async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    await user.type(await screen.findByPlaceholderText("user@hackathon.com"), "new@test.com");
    await user.click(screen.getByRole("button", { name: "Permanent admin" }));
    await user.click(screen.getByRole("button", { name: /Grant Permanent Admin/i }));
    await waitFor(() =>
      expect(adminApi.grantAdmin).toHaveBeenCalledWith("new@test.com", undefined)
    );
  });

  it("offers duration presets that fill a future expiry", async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByPlaceholderText("user@hackathon.com");
    await user.click(screen.getByRole("button", { name: "1 week" }));
    const expiryValue = (screen.getByLabelText(/Expires at/i) as HTMLInputElement).value;
    const picked = new Date(expiryValue).getTime();
    expect(picked).toBeGreaterThan(Date.now() + 6 * 24 * 3600_000);
    expect(picked).toBeLessThan(Date.now() + 8 * 24 * 3600_000);
  });

  it("demotes an admin after confirmation but hides Demote for your own account", async () => {
    const user = userEvent.setup();
    render(<AdminPage />);
    await screen.findByText("Farmed Ahmed");

    // Own row: no Demote button (scoped to the permanent-admin row).
    const ownRow = screen.getByText("Farmed Ahmed").closest("tr");
    expect(within(ownRow as HTMLElement).queryByRole("button", { name: /Demote/i })).toBeNull();

    // Another admin: demote with confirm.
    const tempRow = screen.getByText("Temp Helper").closest("tr") as HTMLElement;
    await user.click(within(tempRow).getByRole("button", { name: /Demote/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Demote Admin/i }));

    await waitFor(() => expect(adminApi.demoteAdmin).toHaveBeenCalledWith("admin-2"));
  });
});
