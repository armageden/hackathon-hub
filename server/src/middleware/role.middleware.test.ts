import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/pool.js", () => ({
  pool: { query: vi.fn() },
}));

import { requireGlobalRole } from "./role.middleware.js";
import { pool } from "../db/pool.js";

const query = pool.query as unknown as ReturnType<typeof vi.fn>;

function makeReq(globalRole?: string) {
  return { user: globalRole ? { id: "u1", email: "u@test", globalRole } : undefined } as never;
}

async function call(mw: ReturnType<typeof requireGlobalRole>, req: never) {
  const next = vi.fn();
  await mw(req, {} as never, next);
  return next;
}

describe("requireGlobalRole — temporary admin expiry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a permanent admin", async () => {
    query.mockResolvedValue({ rows: [{ global_role: "admin", admin_expires_at: null }] });
    const next = await call(requireGlobalRole("admin"), makeReq("admin"));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("accepts a temporary admin whose window is still open", async () => {
    query.mockResolvedValue({
      rows: [{ global_role: "admin", admin_expires_at: new Date(Date.now() + 3_600_000) }],
    });
    const next = await call(requireGlobalRole("admin"), makeReq("admin"));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("denies a temporary admin whose window has lapsed", async () => {
    query.mockResolvedValue({
      rows: [{ global_role: "admin", admin_expires_at: new Date(Date.now() - 1000) }],
    });
    const next = await call(requireGlobalRole("admin"), makeReq("admin"));
    // Express error funnel: next(err) with a 403 AuthorizationError.
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403 });
  });

  it("denies a normal user asking for admin", async () => {
    query.mockResolvedValue({ rows: [{ global_role: "user", admin_expires_at: null }] });
    const next = await call(requireGlobalRole("admin"), makeReq("user"));
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403 });
  });
});
