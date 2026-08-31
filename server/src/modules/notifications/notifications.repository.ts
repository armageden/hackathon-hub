import { pool } from "../../db/pool.js";

export const notificationsRepository = {
  async create(eventId: string, userId: string, title: string, message: string, type: string = "info", link?: string) {
    const result = await pool.query(
      "INSERT INTO notifications (event_id, user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [eventId, userId, title, message, type, link || null]
    );
    return result.rows[0];
  },

  async listByUser(eventId: string, userId: string, unreadOnly: boolean = false) {
    let query = "SELECT * FROM notifications WHERE event_id = $1 AND user_id = $2";
    if (unreadOnly) query += " AND read_at IS NULL";
    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, [eventId, userId]);
    return result.rows;
  },

  async getUnreadCount(eventId: string, userId: string) {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE event_id = $1 AND user_id = $2 AND read_at IS NULL",
      [eventId, userId]
    );
    return result.rows[0].count;
  },

  async markAsRead(notificationId: string, userId: string) {
    const result = await pool.query(
      "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING *",
      [notificationId, userId]
    );
    return result.rows[0] || null;
  },

  async markAllAsRead(eventId: string, userId: string) {
    await pool.query(
      "UPDATE notifications SET read_at = NOW() WHERE event_id = $1 AND user_id = $2 AND read_at IS NULL",
      [eventId, userId]
    );
  },

  async delete(notificationId: string, userId: string) {
    const result = await pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id",
      [notificationId, userId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },
};
