import { pool } from "../../db/pool.js";
import crypto from "crypto";

export const certificatesRepository = {
  async listByEvent(eventId: string) {
    const result = await pool.query(
      `SELECT c.*, u.full_name, u.email
       FROM certificates c
       JOIN users u ON u.id = c.user_id
       WHERE c.event_id = $1
       ORDER BY c.issued_at DESC NULLS LAST`,
      [eventId]
    );
    return result.rows;
  },

  async findByUser(eventId: string, userId: string) {
    const result = await pool.query(
      "SELECT * FROM certificates WHERE event_id = $1 AND user_id = $2",
      [eventId, userId]
    );
    return result.rows;
  },

  async findByVerificationCode(code: string) {
    const result = await pool.query(
      `SELECT c.*, u.full_name, u.email, e.name AS event_name
       FROM certificates c
       JOIN users u ON u.id = c.user_id
       JOIN events e ON e.id = c.event_id
       WHERE c.verification_code = $1 AND c.status = 'issued'`,
      [code]
    );
    return result.rows[0] || null;
  },

  async checkEligibility(eventId: string) {
    const result = await pool.query(
      `SELECT
         em.user_id,
         u.full_name,
         u.email,
         CASE WHEN ci.id IS NOT NULL THEN true ELSE false END AS has_checkin,
         CASE WHEN t.id IS NOT NULL THEN true ELSE false END AS has_team,
         CASE WHEN ps.id IS NOT NULL THEN true ELSE false END AS has_project,
         CASE WHEN cert.id IS NOT NULL THEN true ELSE false END AS already_certified
       FROM event_members em
       JOIN users u ON u.id = em.user_id
       LEFT JOIN check_ins ci ON ci.event_id = em.event_id AND ci.user_id = em.user_id
       LEFT JOIN team_members tm ON tm.user_id = em.user_id
       LEFT JOIN teams t ON t.id = tm.team_id AND t.event_id = em.event_id
       LEFT JOIN project_submissions ps ON ps.event_id = em.event_id
         AND EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = ps.team_id AND tm2.user_id = em.user_id)
       LEFT JOIN certificates cert ON cert.event_id = em.event_id AND cert.user_id = em.user_id AND cert.certificate_type = 'completion'
       WHERE em.event_id = $1 AND em.role = 'participant'`,
      [eventId]
    );
    return result.rows;
  },

  async createCertification(
    eventId: string,
    userId: string,
    certificateType: string,
    metadata: Record<string, any> = {}
  ) {
    const verificationCode = crypto.randomBytes(16).toString("hex");
    // ON CONFLICT must name the unique index from migration 016
    // idx_certificates_event_user_type on (event_id, user_id, certificate_type).
    const result = await pool.query(
      `INSERT INTO certificates (event_id, user_id, certificate_type, status, verification_code, metadata)
       VALUES ($1, $2, $3, 'eligible', $4, $5)
       ON CONFLICT (event_id, user_id, certificate_type)
       DO NOTHING
       RETURNING *`,
      [eventId, userId, certificateType, verificationCode, JSON.stringify(metadata)]
    );
    return result.rows[0] || null;
  },

  async issueCertificate(eventId: string, certificateId: string) {
    const result = await pool.query(
      `UPDATE certificates SET status = 'issued', issued_at = NOW()
       WHERE id = $1 AND event_id = $2 AND status = 'eligible'
       RETURNING *`,
      [certificateId, eventId]
    );
    return result.rows[0] || null;
  },

  async revokeCertificate(eventId: string, certificateId: string) {
    const result = await pool.query(
      `UPDATE certificates SET status = 'revoked', revoked_at = NOW()
       WHERE id = $1 AND event_id = $2 AND status = 'issued'
       RETURNING *`,
      [certificateId, eventId]
    );
    return result.rows[0] || null;
  },

  async bulkCreateEligible(eventId: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const eligibleResult = await client.query(
        `SELECT em.user_id
         FROM event_members em
         WHERE em.event_id = $1 AND em.role = 'participant'
           AND EXISTS (SELECT 1 FROM check_ins ci WHERE ci.event_id = $1 AND ci.user_id = em.user_id)
           AND NOT EXISTS (
             SELECT 1 FROM certificates c
             WHERE c.event_id = $1 AND c.user_id = em.user_id AND c.certificate_type = 'attendance'
           )`,
        [eventId]
      );

      let created = 0;
      for (const row of eligibleResult.rows) {
        const code = crypto.randomBytes(16).toString("hex");
        await client.query(
          `INSERT INTO certificates (event_id, user_id, certificate_type, status, verification_code)
           VALUES ($1, $2, 'attendance', 'eligible', $3)
           ON CONFLICT (event_id, user_id, certificate_type) DO NOTHING`,
          [eventId, row.user_id, code]
        );
        created++;
      }

      await client.query("COMMIT");
      return { created };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};