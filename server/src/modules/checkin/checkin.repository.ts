import { pool } from "../../db/pool.js";
import crypto from "crypto";

export const checkinRepository = {
  async listCheckinsByEvent(eventId: string) {
    const result = await pool.query(
      `SELECT ci.*, u.full_name, u.email, ii.title AS session_title
       FROM check_ins ci
       JOIN users u ON u.id = ci.user_id
       LEFT JOIN itinerary_items ii ON ii.id = ci.itinerary_item_id
       WHERE ci.event_id = $1
       ORDER BY ci.checked_in_at DESC`,
      [eventId]
    );
    return result.rows;
  },

  async findCheckin(eventId: string, userId: string, itineraryItemId?: string) {
    let query = "SELECT * FROM check_ins WHERE event_id = $1 AND user_id = $2";
    const params: any[] = [eventId, userId];

    if (itineraryItemId) {
      params.push(itineraryItemId);
      query += " AND itinerary_item_id = $" + params.length;
    }

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  },

  async createCheckin(
    eventId: string,
    userId: string,
    method: string,
    checkedInBy: string | null,
    itineraryItemId?: string
  ) {
    const result = await pool.query(
      "INSERT INTO check_ins (event_id, user_id, itinerary_item_id, method, checked_in_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING *",
      [eventId, userId, itineraryItemId || null, method, checkedInBy]
    );
    return result.rows[0] || null;
  },

  async createQRToken(eventId: string, userId: string, expiresInMinutes: number = 5) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    const result = await pool.query(
      "INSERT INTO qr_tokens (event_id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4) RETURNING id, expires_at",
      [eventId, userId, tokenHash, expiresAt]
    );

    return { token: rawToken, record: result.rows[0] };
  },

  async findQRToken(eventId: string, tokenHash: string) {
    const result = await pool.query(
      `SELECT * FROM qr_tokens
       WHERE event_id = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > NOW()`,
      [eventId, tokenHash]
    );
    return result.rows[0] || null;
  },

  // Atomic single-use claim: returns false when another concurrent scan won.
  async claimQRToken(tokenId: string): Promise<boolean> {
    const result = await pool.query(
      "UPDATE qr_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id",
      [tokenId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  async getCheckinStats(eventId: string) {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_checkins,
         COUNT(DISTINCT user_id)::int AS unique_users,
         COUNT(CASE WHEN method = 'qr' THEN 1 END)::int AS qr_checkins,
         COUNT(CASE WHEN method = 'manual' THEN 1 END)::int AS manual_checkins
       FROM check_ins WHERE event_id = $1`,
      [eventId]
    );

    const sessionResult = await pool.query(
      `SELECT
         ci.itinerary_item_id AS session_id,
         ii.title AS session_title,
         COUNT(*)::int AS checkin_count,
         COUNT(DISTINCT ci.user_id)::int AS unique_users
       FROM check_ins ci
       JOIN itinerary_items ii ON ii.id = ci.itinerary_item_id
       WHERE ci.event_id = $1 AND ci.itinerary_item_id IS NOT NULL
       GROUP BY ci.itinerary_item_id, ii.title
       ORDER BY checkin_count DESC`,
      [eventId]
    );

    return {
      ...result.rows[0],
      session_stats: sessionResult.rows,
    };
  },

  async findCheckinById(eventId: string, checkinId: string) {
    const result = await pool.query(
      "SELECT * FROM check_ins WHERE id = $1 AND event_id = $2",
      [checkinId, eventId]
    );
    return result.rows[0] || null;
  },

  async checkout(checkinId: string) {
    const result = await pool.query(
      "UPDATE check_ins SET checked_out_at = NOW() WHERE id = $1 AND checked_out_at IS NULL RETURNING *",
      [checkinId]
    );
    return result.rows[0] || null;
  },
};