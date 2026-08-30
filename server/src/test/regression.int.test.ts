// Integration regression tests for bug-hunt fixes that mock-boundary unit
// tests structurally cannot catch (SQL conflict targets, unique indexes,
// cross-event scoping, atomic claims). Requires a live database with all
// migrations applied — these hit real Postgres via the repository layer.
//
// All fixtures use the `aaaaaaa0` UUID namespace and are removed by cascade
// in afterAll (users → events → everything underneath).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { certificatesRepository } from "../modules/certificates/certificates.repository.js";
import { checkinRepository } from "../modules/checkin/checkin.repository.js";
import { teamsRepository } from "../modules/teams/teams.repository.js";
import { teamsService } from "../modules/teams/teams.service.js";
import { hardwareRepository } from "../modules/hardware/hardware.repository.js";
import { hardwareService } from "../modules/hardware/hardware.service.js";
import { venueService } from "../modules/venue/venue.service.js";
import { judgingRepository } from "../modules/judging/judging.repository.js";
import { judgingService } from "../modules/judging/judging.service.js";
import { adminService } from "../modules/admin/admin.service.js";
import { adminRepository } from "../modules/admin/admin.repository.js";
import { requireGlobalRole } from "../middleware/role.middleware.js";
import { authService } from "../modules/auth/auth.service.js";
import { AuthorizationError } from "../middleware/error.middleware.js";

const EV = "aaaaaaa0-0000-4000-8000-00000000a001";
const EV2 = "aaaaaaa0-0000-4000-8000-00000000a002";
const OWNER = "aaaaaaa0-0000-4000-8000-00000000b001";
const MEMBER = "aaaaaaa0-0000-4000-8000-00000000b002";

let profileId: string;

async function makeTeam(name: string): Promise<string> {
  const r = await pool.query(
    "INSERT INTO teams (event_id, name, max_size, created_by) VALUES ($1, $2, 5, $3) RETURNING id",
    [EV, name, OWNER]
  );
  const teamId = r.rows[0].id;
  // Mirror teamsRepository.create: creator becomes the owner member.
  await pool.query(
    "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'owner')",
    [teamId, OWNER]
  );
  return teamId;
}

beforeAll(async () => {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, full_name) VALUES
       ($1, 'int-owner@test.local', 'x', 'Int Owner'),
       ($2, 'int-member@test.local', 'x', 'Int Member')`,
    [OWNER, MEMBER]
  );
  for (const id of [EV, EV2]) {
    await pool.query("INSERT INTO events (id, name, slug, created_by) VALUES ($1, $2, $3, $4)", [
      id,
      `Integration ${id.slice(-6)}`,
      `int-${id.slice(-6)}`,
      OWNER,
    ]);
  }
  // EV2 membership is intentionally absent: it stands in for an event the
  // actor has no relationship with (cross-event scoping checks).
  await pool.query(
    "INSERT INTO event_members (event_id, user_id, role, status) VALUES ($1, $2, 'organizer', 'active'), ($1, $3, 'participant', 'active')",
    [EV, OWNER, MEMBER]
  );
  const prof = await pool.query(
    "INSERT INTO participant_profiles (event_id, user_id) VALUES ($1, $2) RETURNING id",
    [EV, MEMBER]
  );
  profileId = prof.rows[0].id;
});

afterAll(async () => {
  // Users cascade to events, which cascade to every fixture row.
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
    [OWNER, MEMBER, "aaaaaaa0-0000-4000-8000-00000000b003"],
  ]);
  await pool.end();
});

describe("certificates regression", () => {
  it("issues once and deduplicates a second certificate of the same type (unique index, not 42P10)", async () => {
    const first = await certificatesRepository.createCertification(EV, MEMBER, "attendance");
    expect(first).toBeTruthy();
    expect(first!.status).toBe("eligible");

    const issued = await certificatesRepository.issueCertificate(EV, first!.id);
    expect(issued?.status).toBe("issued");

    // Second issuance for the same type must no-op via the unique index —
    // not crash with "no unique constraint matching ON CONFLICT".
    const second = await certificatesRepository.createCertification(EV, MEMBER, "attendance");
    expect(second).toBeNull();
  });

  it("refuses to revoke another event's certificate (cross-event scoping)", async () => {
    const cert = await certificatesRepository.createCertification(EV, MEMBER, "completion");
    await certificatesRepository.issueCertificate(EV, cert!.id);

    // Wrong eventId must match nothing and leave the certificate untouched…
    const wrongEvent = await certificatesRepository.revokeCertificate(EV2, cert!.id);
    expect(wrongEvent).toBeNull();

    // …while the owning event revokes normally.
    const revoked = await certificatesRepository.revokeCertificate(EV, cert!.id);
    expect(revoked?.status).toBe("revoked");
  });
});

describe("team applications regression", () => {
  it("deduplicates duplicate pending applications instead of erroring (ON CONFLICT target matches real constraint)", async () => {
    const teamId = await makeTeam("Apply Dedup");
    const first = await teamsRepository.createApplication(teamId, profileId, "hi");
    expect(first).toBeTruthy();

    const second = await teamsRepository.createApplication(teamId, profileId, "again");
    expect(second).toBeNull();
  });

  it("approval adds the member exactly once and closes sibling pending applications", async () => {
    const teamA = await makeTeam("Approve A");
    const teamB = await makeTeam("Approve B");
    const appA = await teamsRepository.createApplication(teamA, profileId, null);
    await teamsRepository.createApplication(teamB, profileId, null);

    const approved = await teamsService.reviewApplication(EV, appA!.id, "approved", OWNER);
    expect(approved?.status).toBe("approved");

    const memberRows = await pool.query(
      "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamA, MEMBER]
    );
    expect(memberRows.rowCount).toBe(1);

    // The sibling pending application must have been auto-rejected…
    const siblings = await pool.query(
      "SELECT status FROM team_applications WHERE participant_profile_id = $1 AND team_id = $2",
      [profileId, teamB]
    );
    expect(siblings.rows[0]?.status).toBe("rejected");

    // …and a second review of the same application is rejected outright.
    await expect(
      teamsService.reviewApplication(EV, appA!.id, "approved", OWNER)
    ).rejects.toThrow(/already been reviewed/i);
  });
});

describe("qr check-in regression", () => {
  it("claims a token atomically exactly once", async () => {
    const { token } = await checkinRepository.createQRToken(EV, MEMBER, 5);
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const found = await checkinRepository.findQRToken(EV, hash);
    expect(found).toBeTruthy();

    // Conditional UPDATE … WHERE used_at IS NULL: only the first claim wins.
    expect(await checkinRepository.claimQRToken(found!.id)).toBe(true);
    expect(await checkinRepository.claimQRToken(found!.id)).toBe(false);

    // A used token no longer resolves for redemption.
    expect(await checkinRepository.findQRToken(EV, hash)).toBeNull();
  });
});

describe("hardware inventory regression (feature 1)", () => {
  it("persists a zero quantity and an explicit non-default status on create", async () => {
    // Regression: `quantity_available || 1` coerced 0 → 1, and the INSERT
    // dropped the validated `status` entirely (row always came out 'available').
    const item = await hardwareRepository.create(
      EV,
      { name: "Zero Qty Probe", quantity_available: 0, status: "lost" },
      OWNER
    );
    expect(item.quantity_available).toBe(0);
    expect(item.status).toBe("lost");
  });

  it("persists zero quantities and statuses through bulk create", async () => {
    const created = await hardwareRepository.createMany(
      EV,
      [
        { name: "Bulk Zero", quantity_available: 0, status: "retired" },
        { name: "Bulk Normal" },
      ],
      OWNER
    );
    expect(created).toHaveLength(2);
    expect(created[0].quantity_available).toBe(0);
    expect(created[0].status).toBe("retired");
    expect(created[1].status).toBe("available");
  });

  it("runs the full borrow lifecycle: checkout drains, damaged return files a report", async () => {
    const item = await hardwareRepository.create(
      EV,
      { name: "Lifecycle Probe", quantity_available: 1 },
      OWNER
    );

    // Organizer borrows on behalf of the member participant.
    const checkout = await hardwareService.checkoutItem(
      EV,
      {
        hardware_item_id: item.id,
        borrower_user_id: MEMBER,
        due_at: new Date(Date.now() + 3600_000).toISOString(),
      },
      { id: OWNER, globalRole: "user", eventRole: "organizer" }
    );
    expect(checkout.status).toBe("active");

    let row = await pool.query("SELECT quantity_available, status FROM hardware_items WHERE id = $1", [item.id]);
    expect(Number(row.rows[0].quantity_available)).toBe(0);
    expect(row.rows[0].status).toBe("checked_out");

    // A drained item can no longer be borrowed.
    await expect(
      hardwareService.checkoutItem(
        EV,
        {
          hardware_item_id: item.id,
          borrower_user_id: MEMBER,
          due_at: new Date(Date.now() + 3600_000).toISOString(),
        },
        { id: OWNER, globalRole: "user", eventRole: "organizer" }
      )
    ).rejects.toThrow(/not available|No quantity available/);

    // Participant cannot borrow on behalf of someone else — use a fresh item
    // so the actor-scope check is what fires (the first item is now drained).
    const item2 = await hardwareRepository.create(
      EV,
      { name: "Scope Probe", quantity_available: 1 },
      OWNER
    );
    const otherMember = await pool.query(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, 'int-other@test.local', 'x', 'Int Other') RETURNING id",
      ["aaaaaaa0-0000-4000-8000-00000000b003"]
    );
    await pool.query(
      "INSERT INTO event_members (event_id, user_id, role, status) VALUES ($1, $2, 'participant', 'active')",
      [EV, otherMember.rows[0].id]
    );
    await expect(
      hardwareService.checkoutItem(
        EV,
        {
          hardware_item_id: item2.id,
          borrower_user_id: MEMBER,
          due_at: new Date(Date.now() + 3600_000).toISOString(),
        },
        { id: otherMember.rows[0].id, globalRole: "user", eventRole: "participant" }
      )
    ).rejects.toThrow("for themselves");

    // Damaged return: report + item state in one transaction.
    const { returnRecord } = await hardwareService.returnItem(EV, {
      checkout_id: checkout.id,
      condition: "damaged",
      received_by: OWNER,
      notes: "Cracked casing",
      damage_severity: "major",
    });
    expect(returnRecord.condition).toBe("damaged");

    row = await pool.query("SELECT status, condition FROM hardware_items WHERE id = $1", [item.id]);
    expect(row.rows[0].status).toBe("damaged");
    expect(row.rows[0].condition).toBe("damaged");

    const reports = await pool.query(
      "SELECT severity, description FROM hardware_damage_reports WHERE hardware_item_id = $1",
      [item.id]
    );
    expect(reports.rowCount).toBe(1);
    expect(reports.rows[0].severity).toBe("major");

    const co = await pool.query("SELECT status FROM hardware_checkouts WHERE id = $1", [checkout.id]);
    expect(co.rows[0].status).toBe("returned");

    // Timeline is auditable end-to-end (PRD: hardware history must be auditable).
    const timeline = await hardwareRepository.getItemTimeline(EV, item.id);
    const types = timeline.map((t) => t.type);
    expect(types).toContain("created");
    expect(types).toContain("checked_out");
    expect(types).toContain("returned");
    expect(types).toContain("damaged");
  });
});

describe("venue regression (feature 6)", () => {
  it("no-op updates return the record instead of throwing a 500 SET-clause error", async () => {
    const location = await venueService.createLocation(EV, {
      name: "Noop Table",
      location_type: "table",
      capacity: 2,
    });

    const unchanged = await venueService.updateLocation(EV, location.id, {} as any);
    expect(unchanged.id).toBe(location.id);
    expect(unchanged.name).toBe("Noop Table");

    const assignment = await venueService.createAssignment(
      EV,
      {
        venue_location_id: location.id,
        assignable_type: "team",
        team_id: (await makeTeam("Venue Noop"))!,
        starts_at: new Date("2026-09-05T10:00:00Z"),
        ends_at: new Date("2026-09-05T12:00:00Z"),
      },
      { id: OWNER }
    );
    const unchangedAssignment = await venueService.updateAssignment(EV, assignment.id, {} as any);
    expect(unchangedAssignment.id).toBe(assignment.id);

    // A status-only update still works and lands in the DB.
    const cancelled = await venueService.updateAssignment(EV, assignment.id, { status: "cancelled" });
    expect(cancelled.status).toBe("cancelled");
  });

  it("enforces the no-double-booking exclusion constraint as a backstop", async () => {
    const location = await venueService.createLocation(EV, {
      name: "Backstop Room",
      location_type: "room",
      capacity: 10,
    });
    const teamA = await makeTeam("Backstop A");
    const teamB = await makeTeam("Backstop B");
    const range = {
      starts_at: new Date("2026-09-06T10:00:00Z"),
      ends_at: new Date("2026-09-06T12:00:00Z"),
    };
    await venueService.createAssignment(EV, { venue_location_id: location.id, assignable_type: "team", team_id: teamA!, ...range }, { id: OWNER });
    // Overlap through the service path is rejected by the pre-check…
    await expect(
      venueService.createAssignment(EV, { venue_location_id: location.id, assignable_type: "team", team_id: teamB!, ...range }, { id: OWNER })
    ).rejects.toThrow("already booked");
    // …and a raw INSERT that slips past the app layer hits the GiST constraint (23P01 → 409).
    await expect(
      pool.query(
        "INSERT INTO venue_assignments (event_id, venue_location_id, assignable_type, team_id, starts_at, ends_at, assigned_by) VALUES ($1, $2, 'team', $3, $4, $5, $6)",
        [EV, location.id, teamB, range.starts_at, range.ends_at, OWNER]
      )
    ).rejects.toThrow();
  });
});

describe("judging regression (feature 7)", () => {
  it("lets the organizer edit a judge's score and recomputes the weighted total", async () => {
    const teamId = await makeTeam("Judged Team");
    const project = await pool.query(
      "INSERT INTO project_submissions (event_id, team_id, title, status, submitted_at) VALUES ($1, $2, 'Judge Probe', 'submitted', NOW()) RETURNING id",
      [EV, teamId]
    );
    const projectId = project.rows[0].id;

    const original = await judgingService.score(
      EV,
      projectId,
      { score_innovation: 80, score_technical: 70, score_presentation: 90, score_usefulness: 60 },
      { id: OWNER }
    );
    expect(Number(original.score_total)).toBe(75);

    // Judge re-scoring the same project is still rejected…
    await expect(
      judgingService.score(EV, projectId, { score_innovation: 10, score_technical: 10, score_presentation: 10, score_usefulness: 10 }, { id: OWNER })
    ).rejects.toThrow("already scored");

    // …but the organizer can adjust the score; total recomputed 30/30/20/20.
    const updated = await judgingService.updateScore(
      EV,
      (original as any).id,
      { score_innovation: 100, score_technical: 100, score_presentation: 0, score_usefulness: 0, feedback: "Re-checked" },
      { id: OWNER }
    );
    expect(Number(updated!.score_total)).toBe(60);
    expect(updated!.feedback).toBe("Re-checked");

    // Cross-event scoping: another event cannot touch this score.
    await expect(
      judgingService.updateScore(EV2, (original as any).id, { score_innovation: 1, score_technical: 1, score_presentation: 1, score_usefulness: 1 }, { id: OWNER })
    ).rejects.toThrow("Score not found");
    // …and the owning event's score is unchanged by the rejected attempt.
    const untouched = await judgingRepository.getScoreById(EV, (original as any).id);
    expect(Number(untouched!.score_total)).toBe(60);
  });
});

describe("feature completion regression (judging / venue / hardware)", () => {
  it("lists a project's scores with judge identities (organizer score-edit source)", async () => {
    const teamId = await makeTeam("Score List Team");
    const project = await pool.query(
      "INSERT INTO project_submissions (event_id, team_id, title, status, submitted_at) VALUES ($1, $2, 'Score List Probe', 'submitted', NOW()) RETURNING id",
      [EV, teamId]
    );
    const projectId = project.rows[0].id;
    await judgingService.score(EV, projectId, { score_innovation: 80, score_technical: 70, score_presentation: 90, score_usefulness: 60 }, { id: OWNER });

    const scores = await judgingService.listScores(EV, projectId);
    expect(scores).toHaveLength(1);
    expect(scores[0].judge_name).toBe("Int Owner");
    expect(Number(scores[0].score_total)).toBe(75);

    // A project from another event resolves nothing.
    await expect(judgingService.listScores(EV2, projectId)).rejects.toThrow("Project not found");
  });

  it("persists venue map positions and deletes locations with their bookings", async () => {
    const location = await venueService.createLocation(EV, { name: "Position Table", location_type: "table", capacity: 2 });

    await venueService.updateLocation(EV, location.id, { position_x: 240, position_y: 160 });
    const row = await pool.query("SELECT position_x, position_y FROM venue_locations WHERE id = $1", [location.id]);
    expect(Number(row.rows[0].position_x)).toBe(240);
    expect(Number(row.rows[0].position_y)).toBe(160);

    const teamId = await makeTeam("Position Team");
    const assignment = await venueService.createAssignment(
      EV,
      { venue_location_id: location.id, assignable_type: "team", team_id: teamId },
      { id: OWNER }
    );
    await venueService.deleteLocation(EV, location.id);
    const gone = await pool.query("SELECT id FROM venue_locations WHERE id = $1", [location.id]);
    expect(gone.rowCount).toBe(0);
    const bookingsGone = await pool.query("SELECT id FROM venue_assignments WHERE id = $1", [assignment.id]);
    expect(bookingsGone.rowCount).toBe(0);
  });

  it("records status_change history that appears in the auditable timeline", async () => {
    const item = await hardwareRepository.create(EV, { name: "Audit Probe", quantity_available: 2 }, OWNER);
    await hardwareService.updateItem(EV, item.id, { status: "lost" }, OWNER);

    const timeline = await hardwareRepository.getItemTimeline(EV, item.id);
    const change = timeline.find((t) => t.type === "status_change");
    expect(change).toBeTruthy();
    expect(change!.details).toMatchObject({ from: "available", to: "lost" });
    expect(change!.user_name).toBe("Int Owner");
  });

  it("resolve-and-restore returns a damaged item to service", async () => {
    const item = await hardwareRepository.create(EV, { name: "Restore Probe", quantity_available: 1 }, OWNER);
    const checkout = await hardwareService.checkoutItem(
      EV,
      { hardware_item_id: item.id, borrower_user_id: MEMBER, due_at: new Date(Date.now() + 3600_000).toISOString() },
      { id: OWNER, globalRole: "user", eventRole: "organizer" }
    );
    await hardwareService.returnItem(EV, {
      checkout_id: checkout.id,
      condition: "damaged",
      received_by: OWNER,
      notes: "Snapped in half",
    });
    let row = await pool.query("SELECT status, condition FROM hardware_items WHERE id = $1", [item.id]);
    expect(row.rows[0].status).toBe("damaged");

    const report = await pool.query(
      "SELECT id FROM hardware_damage_reports WHERE hardware_item_id = $1 ORDER BY created_at DESC LIMIT 1",
      [item.id]
    );
    const resolved = await hardwareService.resolveDamageReport(EV, report.rows[0].id, OWNER, true);
    expect(resolved?.status).toBe("resolved");

    row = await pool.query("SELECT status, condition FROM hardware_items WHERE id = $1", [item.id]);
    expect(row.rows[0].status).toBe("available");
    expect(row.rows[0].condition).toBe("good");

    // The restored item can be borrowed again.
    const again = await hardwareService.checkoutItem(
      EV,
      { hardware_item_id: item.id, borrower_user_id: MEMBER, due_at: new Date(Date.now() + 3600_000).toISOString() },
      { id: OWNER, globalRole: "user", eventRole: "organizer" }
    );
    expect(again.status).toBe("active");
  });
});

describe("temporary admin lifecycle (feature: admin can grant temporary admin)", () => {
  async function runGate(userId: string): Promise<{ allowed: boolean; error?: unknown }> {
    const next = vi.fn();
    await requireGlobalRole("admin")(
      { user: { id: userId, email: "x@test", globalRole: "user" } } as never,
      {} as never,
      next
    );
    // The middleware funnels denials through next(err) rather than throwing.
    const err = next.mock.calls[0]?.[0];
    return { allowed: err === undefined, error: err };
  }

  it("grants, enforces, expires, and revokes a temporary admin", async () => {
    // MEMBER starts as a normal user — the gate denies them.
    expect((await runGate(MEMBER)).allowed).toBe(false);

    // Grant a 1-hour temporary admin.
    const granted = await adminService.grantAdmin(
      OWNER,
      "int-member@test.local",
      new Date(Date.now() + 3_600_000).toISOString()
    );
    expect(granted.global_role).toBe("admin");
    expect(granted.admin_expires_at).toBeTruthy();

    // Gate now lets them through…
    expect((await runGate(MEMBER)).allowed).toBe(true);

    // …and /auth/me reports the effective admin role while the window is open.
    const me = await authService.getMe(MEMBER);
    expect(me.global_role).toBe("admin");

    // Backdate the expiry: the gate denies and /auth/me downgrades to 'user'.
    await pool.query("UPDATE users SET admin_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [MEMBER]);
    const denied = await runGate(MEMBER);
    expect(denied.allowed).toBe(false);
    expect((denied.error as AuthorizationError).statusCode).toBe(403);
    expect((await authService.getMe(MEMBER)).global_role).toBe("user");

    // Demote: role and expiry are cleared.
    await adminService.demoteAdmin(OWNER, MEMBER);
    const after = await pool.query("SELECT global_role, admin_expires_at FROM users WHERE id = $1", [MEMBER]);
    expect(after.rows[0].global_role).toBe("user");
    expect(after.rows[0].admin_expires_at).toBeNull();

    // grantAdmin returns rows through adminRepository.listAdmins as well.
    await adminService.grantAdmin(OWNER, "int-member@test.local", new Date(Date.now() + 60_000).toISOString());
    const admins = await adminRepository.listAdmins();
    expect(admins.some((a: { id: string }) => a.id === MEMBER)).toBe(true);
    await adminService.demoteAdmin(OWNER, MEMBER);
  });
});
