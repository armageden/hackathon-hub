import { pool } from "../../db/pool.js";

export const participantsRepository = {
  async findProfileById(profileId: string) {
    const result = await pool.query(
      `SELECT pp.*, u.full_name, u.email,
              COALESCE(
                json_agg(json_build_object('id', t.id, 'name', t.name, 'category', t.category))
                FILTER (WHERE t.id IS NOT NULL), '[]'
              ) AS tech_stack
       FROM participant_profiles pp
       JOIN users u ON u.id = pp.user_id
       LEFT JOIN participant_tech_stack pts ON pts.participant_profile_id = pp.id
       LEFT JOIN tech_stack_tags t ON t.id = pts.tech_stack_tag_id
       WHERE pp.id = $1
       GROUP BY pp.id, u.full_name, u.email`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  async findProfileByEventAndUser(eventId: string, userId: string) {
    const result = await pool.query(
      `SELECT pp.*, u.full_name, u.email,
              COALESCE(
                json_agg(json_build_object('id', t.id, 'name', t.name, 'category', t.category))
                FILTER (WHERE t.id IS NOT NULL), '[]'
              ) AS tech_stack
       FROM participant_profiles pp
       JOIN users u ON u.id = pp.user_id
       LEFT JOIN participant_tech_stack pts ON pts.participant_profile_id = pp.id
       LEFT JOIN tech_stack_tags t ON t.id = pts.tech_stack_tag_id
       WHERE pp.event_id = $1 AND pp.user_id = $2
       GROUP BY pp.id, u.full_name, u.email`,
      [eventId, userId]
    );
    return result.rows[0] || null;
  },

  async listByEvent(eventId: string, lookingForTeam?: boolean) {
    let query = `
      SELECT pp.*, u.email, u.full_name,
             COALESCE(
               json_agg(json_build_object('id', t.id, 'name', t.name, 'category', t.category))
               FILTER (WHERE t.id IS NOT NULL), '[]'
             ) AS tech_stack
      FROM participant_profiles pp
      JOIN users u ON u.id = pp.user_id
      LEFT JOIN participant_tech_stack pts ON pts.participant_profile_id = pp.id
      LEFT JOIN tech_stack_tags t ON t.id = pts.tech_stack_tag_id
      WHERE pp.event_id = $1
    `;
    const params: any[] = [eventId];

    if (lookingForTeam !== undefined) {
      params.push(lookingForTeam);
      query += ` AND pp.looking_for_team = $${params.length}`;
    }

    query += ` GROUP BY pp.id, u.email, u.full_name ORDER BY pp.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  async createProfile(
    eventId: string,
    userId: string,
    bio: string | null,
    experienceLevel: string | null,
    preferredRole: string | null,
    lookingForTeam: boolean,
    techStackSummary: string | null
  ) {
    const result = await pool.query(
      `INSERT INTO participant_profiles (event_id, user_id, bio, experience_level, preferred_role, looking_for_team, tech_stack_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_id, user_id) DO UPDATE SET
         bio = $3, experience_level = $4, preferred_role = $5, looking_for_team = $6, tech_stack_summary = $7, updated_at = NOW()
       RETURNING *`,
      [eventId, userId, bio, experienceLevel, preferredRole, lookingForTeam, techStackSummary]
    );
    return result.rows[0];
  },

  async updateProfile(
    eventId: string,
    userId: string,
    fields: { bio?: string; experience_level?: string; preferred_role?: string; looking_for_team?: boolean; tech_stack_summary?: string }
  ) {
    const setClauses: string[] = [];
    const params: any[] = [eventId, userId];
    let paramIdx = 3;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramIdx}`);
        params.push(value);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) return this.findProfileByEventAndUser(eventId, userId);

    setClauses.push("updated_at = NOW()");

    const result = await pool.query(
      `UPDATE participant_profiles SET ${setClauses.join(", ")}
       WHERE event_id = $1 AND user_id = $2
       RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  async setTechStack(profileId: string, tagIds: string[]) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM participant_tech_stack WHERE participant_profile_id = $1", [profileId]);
      for (const tagId of tagIds) {
        await client.query(
          "INSERT INTO participant_tech_stack (participant_profile_id, tech_stack_tag_id) VALUES ($1, $2)",
          [profileId, tagId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async listTechTags() {
    const result = await pool.query("SELECT id, name, category FROM tech_stack_tags ORDER BY name");
    return result.rows;
  },

  async createTechTag(name: string, category: string | null) {
    const result = await pool.query(
      "INSERT INTO tech_stack_tags (name, category) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET category = $2 RETURNING id, name, category",
      [name, category]
    );
    return result.rows[0];
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
};
