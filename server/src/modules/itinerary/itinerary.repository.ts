import { pool } from "../../db/pool.js";

export const itineraryRepository = {
  async listByEvent(eventId: string) {
    const result = await pool.query(
      "SELECT * FROM itinerary_items WHERE event_id = $1 ORDER BY starts_at ASC",
      [eventId]
    );
    return result.rows;
  },

  async findById(eventId: string, itemId: string) {
    const result = await pool.query(
      "SELECT * FROM itinerary_items WHERE event_id = $1 AND id = $2",
      [eventId, itemId]
    );
    return result.rows[0] || null;
  },

  async create(
    eventId: string,
    title: string,
    description: string | null,
    location: string | null,
    startsAt: string,
    endsAt: string,
    sessionType: string,
    roomArea: string | null = null,
    speakerName: string | null = null,
    materialsUrl: string | null = null
  ) {
    const result = await pool.query(
      "INSERT INTO itinerary_items (event_id, title, description, location, starts_at, ends_at, session_type, room_area, speaker_name, materials_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      [eventId, title, description, location, startsAt, endsAt, sessionType, roomArea, speakerName, materialsUrl]
    );
    return result.rows[0];
  },

  async update(eventId: string, itemId: string, fields: Record<string, any>) {
    const setClauses: string[] = [];
    const params: any[] = [eventId, itemId];
    let paramIdx = 3;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(key + " = $" + paramIdx);
        params.push(value);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) return this.findById(eventId, itemId);

    setClauses.push("updated_at = NOW()");

    const result = await pool.query(
      "UPDATE itinerary_items SET " + setClauses.join(", ") + " WHERE event_id = $1 AND id = $2 RETURNING *",
      params
    );
    return result.rows[0] || null;
  },

  async delete(eventId: string, itemId: string) {
    const result = await pool.query(
      "UPDATE itinerary_items SET status = 'cancelled', updated_at = NOW() WHERE event_id = $1 AND id = $2 RETURNING *",
      [eventId, itemId]
    );
    return result.rows[0] || null;
  },
};