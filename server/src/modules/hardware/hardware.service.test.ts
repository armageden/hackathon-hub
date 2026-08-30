import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./hardware.repository.js", () => ({
  hardwareRepository: {
    getById: vi.fn(),
    listByEvent: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listCheckouts: vi.fn(),
    getCheckoutById: vi.fn(),
    getActiveCheckoutForItem: vi.fn(),
    getUserActiveCheckouts: vi.fn(),
    checkout: vi.fn(),
    returnHardware: vi.fn(),
    listDamageReports: vi.fn(),
    createDamageReport: vi.fn(),
    resolveDamageReport: vi.fn(),
    getAnalytics: vi.fn(),
    getOverdueCheckouts: vi.fn(),
    markOverdue: vi.fn(),
    getItemTimeline: vi.fn(),
    isEventMember: vi.fn(),
    writeStatusChangeAudit: vi.fn(),
  },
}));

vi.mock("../auth/auth.repository.js", () => ({
  authRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
  },
}));

import { hardwareService } from "./hardware.service.js";
import { hardwareRepository } from "./hardware.repository.js";
import { authRepository } from "../auth/auth.repository.js";

const repo = hardwareRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const authRepo = authRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

const EVENT_ID = "evt-1";
const ITEM_ID = "item-1";

const baseItem = {
  id: ITEM_ID,
  event_id: EVENT_ID,
  name: "Laptop",
  category: "electronics",
  model: null,
  serial_number: null,
  quantity_available: 1,
  condition: "good",
  status: "available",
  location: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const activeCheckout = {
  id: "co-1",
  event_id: EVENT_ID,
  hardware_item_id: ITEM_ID,
  borrower_user_id: "user-1",
  checked_out_by: "admin-1",
  checked_out_at: new Date(),
  due_at: null,
  status: "active",
  notes: null,
};

describe("hardwareService.checkoutItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.isEventMember.mockResolvedValue(true);
  });

  it("rejects checkout when item is unavailable", async () => {
    repo.getById.mockResolvedValue({ ...baseItem, status: "checked_out" });
    await expect(
      hardwareService.checkoutItem(EVENT_ID, { hardware_item_id: ITEM_ID, borrower_user_id: "user-1" }, { id: "admin-1", globalRole: "admin" })
    ).rejects.toThrow("not available");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("rejects checkout when quantity is zero", async () => {
    repo.getById.mockResolvedValue({ ...baseItem, quantity_available: 0 });
    await expect(
      hardwareService.checkoutItem(EVENT_ID, { hardware_item_id: ITEM_ID, borrower_user_id: "user-1" }, { id: "admin-1", globalRole: "admin" })
    ).rejects.toThrow("No quantity available");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("rejects checkout when borrower does not exist", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue(null);
    await expect(
      hardwareService.checkoutItem(EVENT_ID, { hardware_item_id: ITEM_ID, borrower_user_id: "ghost" }, { id: "admin-1", globalRole: "admin" })
    ).rejects.toThrow("Borrower not found");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("rejects checkout when borrower is not an event member", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    repo.isEventMember.mockResolvedValue(false);
    await expect(
      hardwareService.checkoutItem(EVENT_ID, { hardware_item_id: ITEM_ID, borrower_user_id: "user-1" }, { id: "admin-1", globalRole: "admin" })
    ).rejects.toThrow("Borrower is not an active member");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("rejects non-admin actor who is not an event member", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    repo.isEventMember.mockImplementation(async (_eventId: string, userId: string) => userId !== "outsider-1");
    await expect(
      hardwareService.checkoutItem(EVENT_ID, { hardware_item_id: ITEM_ID, borrower_user_id: "user-1" }, { id: "outsider-1", globalRole: "user" })
    ).rejects.toThrow("You are not an active member");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("allows admin actor who is not an event member", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    repo.isEventMember.mockImplementation(async (_eventId: string, userId: string) => userId !== "admin-9");
    repo.checkout.mockResolvedValue(activeCheckout);
    await hardwareService.checkoutItem(
      EVENT_ID,
      { hardware_item_id: ITEM_ID, borrower_user_id: "user-1", due_at: new Date(Date.now() + 86400000).toISOString() },
      { id: "admin-9", globalRole: "admin" }
    );
    expect(repo.checkout).toHaveBeenCalledOnce();
  });

  it("rejects checkout with due date in the past", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    await expect(
      hardwareService.checkoutItem(
        EVENT_ID,
        { hardware_item_id: ITEM_ID, borrower_user_id: "user-1", due_at: new Date(Date.now() - 60000).toISOString() },
        { id: "admin-1", globalRole: "admin" }
      )
    ).rejects.toThrow("Due date must be in the future");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("rejects checkout without a due time", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    await expect(
      hardwareService.checkoutItem(
        EVENT_ID,
        { hardware_item_id: ITEM_ID, borrower_user_id: "user-1" },
        { id: "admin-1", globalRole: "admin" }
      )
    ).rejects.toThrow("Due time is required");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("creates checkout when item is available and borrower exists", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    repo.checkout.mockResolvedValue(activeCheckout);
    const result = await hardwareService.checkoutItem(
      EVENT_ID,
      { hardware_item_id: ITEM_ID, borrower_user_id: "user-1", due_at: new Date(Date.now() + 86400000).toISOString() },
      { id: "admin-1", globalRole: "admin" }
    );
    expect(result).toEqual(activeCheckout);
    expect(repo.checkout).toHaveBeenCalledOnce();
  });
});

describe("hardwareService.returnItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.isEventMember.mockResolvedValue(true);
  });

  it("rejects return with invalid condition", async () => {
    repo.getCheckoutById.mockResolvedValue(activeCheckout);
    await expect(
      hardwareService.returnItem(EVENT_ID, { checkout_id: "co-1", condition: "exploded", received_by: "admin-1" })
    ).rejects.toThrow("Invalid condition");
    expect(repo.returnHardware).not.toHaveBeenCalled();
  });

  it("rejects return for unknown checkout", async () => {
    repo.getCheckoutById.mockResolvedValue(null);
    await expect(
      hardwareService.returnItem(EVENT_ID, { checkout_id: "nope", condition: "good", received_by: "admin-1" })
    ).rejects.toThrow("Checkout not found");
  });

  it("completes a normal return without a damage payload", async () => {
    repo.getCheckoutById.mockResolvedValue(activeCheckout);
    repo.returnHardware.mockResolvedValue({ checkout: activeCheckout, returnRecord: { id: "ret-1" } });
    await hardwareService.returnItem(EVENT_ID, { checkout_id: "co-1", condition: "good", received_by: "admin-1" });
    expect(repo.returnHardware).toHaveBeenCalledWith(
      EVENT_ID,
      { checkout_id: "co-1", condition: "good", received_by: "admin-1" },
      undefined
    );
    expect(repo.createDamageReport).not.toHaveBeenCalled();
  });

  it("passes damage details into the return transaction when condition is damaged", async () => {
    repo.getCheckoutById.mockResolvedValue(activeCheckout);
    repo.returnHardware.mockResolvedValue({ checkout: activeCheckout, returnRecord: { id: "ret-1" } });

    await hardwareService.returnItem(EVENT_ID, {
      checkout_id: "co-1",
      condition: "damaged",
      received_by: "admin-1",
      notes: "Cracked screen",
    });

    expect(repo.returnHardware).toHaveBeenCalledWith(
      EVENT_ID,
      expect.objectContaining({ checkout_id: "co-1", condition: "damaged" }),
      { description: "Cracked screen", severity: "moderate" }
    );
    // report is written inside the same transaction now, not via this method
    expect(repo.createDamageReport).not.toHaveBeenCalled();
  });

  it("uses provided damage severity for damaged returns", async () => {
    repo.getCheckoutById.mockResolvedValue(activeCheckout);
    repo.returnHardware.mockResolvedValue({ checkout: activeCheckout, returnRecord: { id: "ret-1" } });

    await hardwareService.returnItem(EVENT_ID, {
      checkout_id: "co-1",
      condition: "damaged",
      received_by: "admin-1",
      damage_severity: "critical",
    });

    expect(repo.returnHardware).toHaveBeenCalledWith(
      EVENT_ID,
      expect.anything(),
      expect.objectContaining({ severity: "critical" })
    );
  });
});

describe("hardwareService.updateItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects marking a checked-out item as available", async () => {
    repo.getById.mockResolvedValue({ ...baseItem, status: "checked_out" });
    repo.getActiveCheckoutForItem.mockResolvedValue(activeCheckout);
    await expect(
      hardwareService.updateItem(EVENT_ID, ITEM_ID, { status: "available" })
    ).rejects.toThrow("Cannot mark as available while checked out");
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("hardwareService.deleteItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks deletion when item has an active checkout", async () => {
    repo.getById.mockResolvedValue(baseItem);
    repo.getActiveCheckoutForItem.mockResolvedValue(activeCheckout);
    await expect(hardwareService.deleteItem(EVENT_ID, ITEM_ID)).rejects.toThrow(
      "Cannot delete item with active checkout"
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe("hardwareService.createDamageReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a damage report whose checkout belongs to a different item", async () => {
    repo.getById.mockResolvedValue(baseItem);
    repo.getCheckoutById.mockResolvedValue({ ...activeCheckout, hardware_item_id: "other-item" });
    await expect(
      hardwareService.createDamageReport(
        EVENT_ID,
        { hardware_item_id: ITEM_ID, checkout_id: "co-1", description: "Broken", severity: "major" },
        "admin-1"
      )
    ).rejects.toThrow("Checkout does not match hardware item");
    expect(repo.createDamageReport).not.toHaveBeenCalled();
  });
});

describe("hardwareService.checkoutItem actor scope (PRD: participants borrow for themselves)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.isEventMember.mockResolvedValue(true);
  });
  const due = () => new Date(Date.now() + 86400000).toISOString();

  it("rejects a participant borrowing on behalf of another member", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-2" });
    await expect(
      hardwareService.checkoutItem(
        EVENT_ID,
        { hardware_item_id: ITEM_ID, borrower_user_id: "user-2", due_at: due() },
        { id: "user-1", globalRole: "user", eventRole: "participant" }
      )
    ).rejects.toThrow("for themselves");
    expect(repo.checkout).not.toHaveBeenCalled();
  });

  it("lets a participant borrow for themselves", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-1" });
    repo.checkout.mockResolvedValue(activeCheckout);
    await hardwareService.checkoutItem(
      EVENT_ID,
      { hardware_item_id: ITEM_ID, borrower_user_id: "user-1", due_at: due() },
      { id: "user-1", globalRole: "user", eventRole: "participant" }
    );
    expect(repo.checkout).toHaveBeenCalledOnce();
  });

  it("allows an organizer to borrow on behalf of a participant", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-2" });
    repo.checkout.mockResolvedValue(activeCheckout);
    await hardwareService.checkoutItem(
      EVENT_ID,
      { hardware_item_id: ITEM_ID, borrower_user_id: "user-2", due_at: due() },
      { id: "org-1", globalRole: "user", eventRole: "organizer" }
    );
    expect(repo.checkout).toHaveBeenCalledOnce();
  });

  it("allows a volunteer to borrow on behalf of a participant", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-2" });
    repo.checkout.mockResolvedValue(activeCheckout);
    await hardwareService.checkoutItem(
      EVENT_ID,
      { hardware_item_id: ITEM_ID, borrower_user_id: "user-2", due_at: due() },
      { id: "vol-1", globalRole: "user", eventRole: "volunteer" }
    );
    expect(repo.checkout).toHaveBeenCalledOnce();
  });

  it("rejects a judge borrowing on behalf of another member", async () => {
    repo.getById.mockResolvedValue(baseItem);
    authRepo.findById.mockResolvedValue({ id: "user-2" });
    await expect(
      hardwareService.checkoutItem(
        EVENT_ID,
        { hardware_item_id: ITEM_ID, borrower_user_id: "user-2", due_at: due() },
        { id: "judge-1", globalRole: "user", eventRole: "judge" }
      )
    ).rejects.toThrow("for themselves");
    expect(repo.checkout).not.toHaveBeenCalled();
  });
});

describe("hardwareService.returnItem received_by scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a return received by someone who is not an event member", async () => {
    repo.getCheckoutById.mockResolvedValue(activeCheckout);
    repo.isEventMember.mockResolvedValue(false);
    await expect(
      hardwareService.returnItem(EVENT_ID, { checkout_id: "co-1", condition: "good", received_by: "outsider-1" })
    ).rejects.toThrow("not an active member of this event");
    expect(repo.returnHardware).not.toHaveBeenCalled();
  });
});

describe("hardwareService.updateItem status transitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects retiring a checked-out item", async () => {
    repo.getById.mockResolvedValue({ ...baseItem, status: "checked_out" });
    repo.getActiveCheckoutForItem.mockResolvedValue(activeCheckout);
    await expect(
      hardwareService.updateItem(EVENT_ID, ITEM_ID, { status: "retired" })
    ).rejects.toThrow("Cannot change status while item is checked out");
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows marking a checked-out item lost", async () => {
    repo.getById.mockResolvedValue({ ...baseItem, status: "checked_out" });
    repo.getActiveCheckoutForItem.mockResolvedValue(activeCheckout);
    repo.update.mockResolvedValue({ ...baseItem, status: "lost" });
    const result = await hardwareService.updateItem(EVENT_ID, ITEM_ID, { status: "lost" });
    expect(result.status).toBe("lost");
  });

  it("allows marking a checked-out item damaged", async () => {
    repo.getById.mockResolvedValue({ ...baseItem, status: "checked_out" });
    repo.getActiveCheckoutForItem.mockResolvedValue(activeCheckout);
    repo.update.mockResolvedValue({ ...baseItem, status: "damaged" });
    const result = await hardwareService.updateItem(EVENT_ID, ITEM_ID, { status: "damaged" });
    expect(result.status).toBe("damaged");
  });
});

describe("hardwareService.updateItem audit trail (status_change timeline)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records a status_change audit entry when the status changes", async () => {
    repo.getById.mockResolvedValue(baseItem);
    repo.update.mockResolvedValue({ ...baseItem, status: "lost" });
    await hardwareService.updateItem(EVENT_ID, ITEM_ID, { status: "lost" }, "admin-1");
    expect(repo.writeStatusChangeAudit).toHaveBeenCalledWith(
      EVENT_ID,
      ITEM_ID,
      "admin-1",
      expect.objectContaining({ status: "available" }),
      expect.objectContaining({ status: "lost" })
    );
  });

  it("does not record an audit entry when status is unchanged", async () => {
    repo.getById.mockResolvedValue(baseItem);
    repo.update.mockResolvedValue(baseItem);
    await hardwareService.updateItem(EVENT_ID, ITEM_ID, { name: "Renamed" });
    expect(repo.writeStatusChangeAudit).not.toHaveBeenCalled();
  });
});

describe("hardwareService.resolveDamageReport restore option", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the restore flag through to the repository", async () => {
    repo.resolveDamageReport.mockResolvedValue({ id: "dr-1", status: "resolved" });
    await hardwareService.resolveDamageReport(EVENT_ID, "dr-1", "admin-1", true);
    expect(repo.resolveDamageReport).toHaveBeenCalledWith(EVENT_ID, "dr-1", "admin-1", true);
  });

  it("defaults to no restore", async () => {
    repo.resolveDamageReport.mockResolvedValue({ id: "dr-1", status: "resolved" });
    await hardwareService.resolveDamageReport(EVENT_ID, "dr-1", "admin-1");
    expect(repo.resolveDamageReport).toHaveBeenCalledWith(EVENT_ID, "dr-1", "admin-1", false);
  });
});
