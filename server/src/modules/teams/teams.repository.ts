import { pool } from "../../db/pool.js";
import { ConflictError } from "../../middleware/error.middleware.js";

export const teamsRepository = {
  async listByEvent(eventId: string) {
    const result = await pool.query(
      `SELECT t.*,
              u.full_name AS creator_name,
              COUNT(tm.id) AS member_count,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', tm.id, 'user_id', tm.user_id, 'role', tm.role,
                    'joined_at', tm.joined_at, 'full_name', mu.full_name, 'email', mu.email
                  )
                ) FILTER (WHERE tm.id IS NOT NULL), '[]'
              ) AS members
       FROM teams t
       JOIN users u ON u.id = t.created_by
       LEFT JOIN team_members tm ON tm.team_id = t.id
       LEFT JOIN users mu ON mu.id = tm.user_id
       WHERE t.event_id = $1
       GROUP BY t.id, u.full_name
       ORDER BY t.created_at DESC`,
      [eventId]
    );
    return result.rows;
  },

  async findById(eventId: string, teamId: string) {
    const result = await pool.query(
      `SELECT t.*,
              u.full_name AS creator_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', tm.id, 'user_id', tm.user_id, 'role', tm.role,
                    'joined_at', tm.joined_at, 'full_name', mu.full_name, 'email', mu.email
                  )
                ) FILTER (WHERE tm.id IS NOT NULL), '[]'
              ) AS members
       FROM teams t
       JOIN users u ON u.id = t.created_by
       LEFT JOIN team_members tm ON tm.team_id = t.id
       LEFT JOIN users mu ON mu.id = tm.user_id
       WHERE t.event_id = $1 AND t.id = $2
       GROUP BY t.id, u.full_name`,
      [eventId, teamId]
    );
    return result.rows[0] || null;
  },

  async create(eventId: string, name: string, description: string | null, maxSize: number, createdBy: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teamResult = await client.query(
        `INSERT INTO teams (event_id, name, description, max_size, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [eventId, name, description, maxSize, createdBy]
      );
      const team = teamResult.rows[0];

      await client.query(
        `INSERT INTO team_members (team_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [team.id, createdBy]
      );

      await client.query("COMMIT");
      return team;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async update(eventId: string, teamId: string, fields: { name?: string; description?: string; max_size?: number; status?: string }) {
    const setClauses: string[] = [];
    const params: any[] = [eventId, teamId];
    let paramIdx = 3;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramIdx}`);
        params.push(value);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) return this.findById(eventId, teamId);

    setClauses.push("updated_at = NOW()");

    const result = await pool.query(
      `UPDATE teams SET ${setClauses.join(", ")}
       WHERE event_id = $1 AND id = $2
       RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  async delete(eventId: string, teamId: string) {
    const result = await pool.query(
      "DELETE FROM teams WHERE event_id = $1 AND id = $2 RETURNING id",
      [eventId, teamId]
    );
    return result.rows[0] || null;
  },

  async getMemberCount(teamId: string) {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM team_members WHERE team_id = $1",
      [teamId]
    );
    return result.rows[0].count;
  },

  async addMember(teamId: string, userId: string, assignedBy?: string) {
    const result = await pool.query(
      `INSERT INTO team_members (team_id, user_id, role, assigned_by)
       VALUES ($1, $2, 'member', $3)
       ON CONFLICT (team_id, user_id) DO NOTHING
       RETURNING *`,
      [teamId, userId, assignedBy || null]
    );
    return result.rows[0] || null;
  },

  async removeMember(teamId: string, userId: string) {
    const result = await pool.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING id",
      [teamId, userId]
    );
    return result.rows[0] || null;
  },

  async isMember(teamId: string, userId: string) {
    const result = await pool.query(
      "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId]
    );
    return result.rows.length > 0;
  },

  async isOwner(teamId: string, userId: string) {
    const result = await pool.query(
      "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner'",
      [teamId, userId]
    );
    return result.rows.length > 0;
  },

  async hasTeamInEvent(eventId: string, userId: string) {
    const result = await pool.query(
      `SELECT tm.id FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE t.event_id = $1 AND tm.user_id = $2`,
      [eventId, userId]
    );
    return result.rows.length > 0;
  },

  async getTeamForUser(eventId: string, userId: string) {
    const result = await pool.query(
      `SELECT t.* FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE t.event_id = $1 AND tm.user_id = $2`,
      [eventId, userId]
    );
    return result.rows[0] || null;
  },

  async createApplication(teamId: string, participantProfileId: string, message: string | null) {
    const result = await pool.query(
      `INSERT INTO team_applications (team_id, participant_profile_id, message)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, participant_profile_id, status) DO NOTHING
       RETURNING *`,
      [teamId, participantProfileId, message]
    );
    return result.rows[0] || null;
  },

  async listApplications(teamId: string) {
    const result = await pool.query(
      `SELECT ta.*, pp.user_id, pp.bio, pp.experience_level, pp.tech_stack_summary,
              u.full_name, u.email
       FROM team_applications ta
       JOIN participant_profiles pp ON pp.id = ta.participant_profile_id
       JOIN users u ON u.id = pp.user_id
       WHERE ta.team_id = $1
       ORDER BY ta.created_at DESC`,
      [teamId]
    );
    return result.rows;
  },

  async updateApplication(applicationId: string, status: string, reviewedBy: string) {
    const result = await pool.query(
      `UPDATE team_applications SET status = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [applicationId, status, reviewedBy]
    );
    return result.rows[0] || null;
  },

  async getApplicationById(applicationId: string) {
    const result = await pool.query(
      "SELECT * FROM team_applications WHERE id = $1",
      [applicationId]
    );
    return result.rows[0] || null;
  },

  async autoAssignSoloParticipants(eventId: string, maxSize: number = 5) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize concurrent auto-assign runs per event; otherwise two runs
      // snapshot the same solo list and double-team every participant.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('auto-assign:' || $1))", [eventId]);

      const soloResult = await client.query(
        `SELECT pp.id AS profile_id, pp.user_id
         FROM participant_profiles pp
         WHERE pp.event_id = $1
           AND pp.looking_for_team = true
           AND NOT EXISTS (
             SELECT 1 FROM team_members tm
             JOIN teams t ON t.id = tm.team_id
             WHERE t.event_id = $1 AND tm.user_id = pp.user_id
           )
         ORDER BY pp.created_at ASC`,
        [eventId]
      );
      const soloParticipants = soloResult.rows;

      if (soloParticipants.length === 0) {
        await client.query("ROLLBACK");
        return { teams_created: 0, participants_assigned: 0 };
      }

      let teamsCreated = 0;
      let participantsAssigned = 0;
      let currentTeamId: string | null = null;
      let currentTeamSize = 0;

      for (const participant of soloParticipants) {
        if (!currentTeamId || currentTeamSize >= maxSize) {
          const teamResult = await client.query(
            `INSERT INTO teams (event_id, name, description, max_size, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              eventId,
              `Team ${teamsCreated + 1}`,
              "Auto-assigned team",
              maxSize,
              participant.user_id,
            ]
          );
          currentTeamId = teamResult.rows[0].id;
          currentTeamSize = 0;
          teamsCreated++;

          await client.query(
            `INSERT INTO team_members (team_id, user_id, role)
             VALUES ($1, $2, 'owner')`,
            [currentTeamId, participant.user_id]
          );
        } else {
          await client.query(
            `INSERT INTO team_members (team_id, user_id, role, assigned_by)
             VALUES ($1, $2, 'member', $2)
             ON CONFLICT (team_id, user_id) DO NOTHING`,
            [currentTeamId, participant.user_id]
          );
        }

        currentTeamSize++;
        participantsAssigned++;
      }

      await client.query("COMMIT");
      return { teams_created: teamsCreated, participants_assigned: participantsAssigned };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Single serialized path for every way a user becomes a team member.
  // Row-locks the team so count-then-insert races can't overfill capacity,
  // and optionally enforces one-team-per-event under the same lock.
  async addMemberAtomically(
    eventId: string,
    teamId: string,
    userId: string,
    opts?: { requireTeamless?: boolean; assignedBy?: string }
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teamResult = await client.query(
        "SELECT * FROM teams WHERE id = $1 AND event_id = $2 FOR UPDATE",
        [teamId, eventId]
      );
      const team = teamResult.rows[0];
      if (!team) {
        await client.query("ROLLBACK");
        throw new ConflictError("Team not found");
      }
      if (team.status === "dissolved") {
        await client.query("ROLLBACK");
        throw new ConflictError("Cannot join a dissolved team");
      }

      if (opts?.requireTeamless) {
        const otherTeam = await client.query(
          `SELECT tm.id FROM team_members tm
           JOIN teams t ON t.id = tm.team_id
           WHERE t.event_id = $1 AND tm.user_id = $2`,
          [eventId, userId]
        );
        if (otherTeam.rows.length > 0) {
          await client.query("ROLLBACK");
          throw new ConflictError("User is already in a team for this event");
        }
      }

      const countResult = await client.query(
        "SELECT COUNT(*)::int AS count FROM team_members WHERE team_id = $1",
        [teamId]
      );
      const memberCount = countResult.rows[0].count;
      if (memberCount >= team.max_size) {
        await client.query("ROLLBACK");
        throw new ConflictError("Team is full");
      }

      const inserted = await client.query(
        `INSERT INTO team_members (team_id, user_id, role, assigned_by)
         VALUES ($1, $2, 'member', $3)
         ON CONFLICT (team_id, user_id) DO NOTHING
         RETURNING *`,
        [teamId, userId, opts?.assignedBy || null]
      );
      if (inserted.rows.length === 0) {
        await client.query("ROLLBACK");
        throw new ConflictError("User is already a member of this team");
      }

      if (memberCount + 1 >= team.max_size) {
        await client.query(
          "UPDATE teams SET status = 'full', updated_at = NOW() WHERE id = $1",
          [teamId]
        );
      }

      await client.query("COMMIT");
      return inserted.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // On approval, an applicant's remaining pending applications elsewhere are
  // stale — reject them so another owner can't pull the same user in later.
  async closeOtherPendingApplications(
    participantProfileId: string,
    keepTeamId: string,
    reviewedBy: string
  ): Promise<number> {
    const result = await pool.query(
      `UPDATE team_applications
       SET status = 'rejected', reviewed_by = $3, reviewed_at = NOW()
       WHERE participant_profile_id = $1 AND status = 'pending' AND team_id <> $2`,
      [participantProfileId, keepTeamId, reviewedBy]
    );
    return result.rowCount ?? 0;
  },
};
