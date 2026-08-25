// Integration regression tests for bug-hunt fixes that mock-boundary unit
// tests structurally cannot catch (SQL conflict targets, unique indexes,
// cross-event scoping, atomic claims). Requires a live database with all
// migrations applied — these hit real Postgres via the repository layer.
//
// All fixtures use the `aaaaaaa0` UUID namespace and are removed by cascade
// in afterAll (users → events → everything underneath).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { certificatesRepository } from "../modules/certificates/certificates.repository.js";
import { checkinRepository } from "../modules/checkin/checkin.repository.js";
import { teamsRepository } from "../modules/teams/teams.repository.js";
import { teamsService } from "../modules/teams/teams.service.js";

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
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [[OWNER, MEMBER]]);
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
