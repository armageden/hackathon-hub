import { pool } from "../../db/pool.js";
import { ConflictError } from "../../middleware/error.middleware.js";

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  status: "draft" | "active" | "archived";
  settings: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  my_role?: string;
}

export interface CreateEventInput {
  name: string;
  slug?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
}

export interface UpdateEventInput {
  name?: string;
  slug?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  status?: "draft" | "active" | "archived";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255);
}

export const eventsRepository = {
  async listByUser(userId: string): Promise<Event[]> {
    const result = await pool.query(
      `SELECT e.*, em.role AS my_role
       FROM events e
       JOIN event_members em ON em.event_id = e.id
       WHERE em.user_id = $1 AND em.status = 'active'
       ORDER BY e.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(eventId: string): Promise<Event | null> {
    const result = await pool.query(
      `SELECT id, name, slug, description, starts_at, ends_at, status, settings, created_by, created_at, updated_at
       FROM events
       WHERE id = $1`,
      [eventId]
    );
    return result.rows[0] || null;
  },

  async findBySlug(slug: string): Promise<Event | null> {
    const result = await pool.query(
      `SELECT id, name, slug, description, starts_at, ends_at, status, settings, created_by, created_at, updated_at
       FROM events
       WHERE slug = $1`,
      [slug]
    );
    return result.rows[0] || null;
  },

  async create(data: CreateEventInput, createdBy: string): Promise<Event> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Generate slug if not provided
      const slug = data.slug || slugify(data.name);

      // Check slug uniqueness
      const existing = await client.query(
        "SELECT id FROM events WHERE slug = $1",
        [slug]
      );
      if (existing.rows.length > 0) {
        throw new ConflictError(`Event slug "${slug}" already exists`);
      }

      // Create event
      const eventResult = await client.query(
        `INSERT INTO events (name, slug, description, starts_at, ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.name,
          slug,
          data.description || null,
          data.starts_at || null,
          data.ends_at || null,
          createdBy,
        ]
      );
      const event = eventResult.rows[0];

      // Auto-add creator as organizer
      await client.query(
        `INSERT INTO event_members (event_id, user_id, role)
         VALUES ($1, $2, 'organizer')`,
        [event.id, createdBy]
      );

      await client.query("COMMIT");
      return { ...event, my_role: "organizer" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async update(eventId: string, data: UpdateEventInput): Promise<Event | null> {
    const fields: string[] = [];
    const values: unknown[] = [eventId];
    let paramIndex = 2;

    const allowedFields = ["name", "slug", "description", "starts_at", "ends_at", "status"];
    for (const field of allowedFields) {
      if (data[field as keyof UpdateEventInput] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field as keyof UpdateEventInput]);
        paramIndex++;
      }
    }

    if (fields.length === 0) return this.findById(eventId);

    // Check slug uniqueness if slug is being changed
    if (data.slug) {
      const existing = await pool.query(
        "SELECT id FROM events WHERE slug = $1 AND id != $2",
        [data.slug, eventId]
      );
      if (existing.rows.length > 0) {
        throw new ConflictError(`Event slug "${data.slug}" already exists`);
      }
    }

    fields.push("updated_at = NOW()");

    const result = await pool.query(
      `UPDATE events SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(eventId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM events WHERE id = $1",
      [eventId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  async isMember(eventId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM event_members
       WHERE event_id = $1 AND user_id = $2 AND status = 'active'`,
      [eventId, userId]
    );
    return result.rows.length > 0;
  },

  async getMemberRole(eventId: string, userId: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT role FROM event_members
       WHERE event_id = $1 AND user_id = $2 AND status = 'active'`,
      [eventId, userId]
    );
    return result.rows[0]?.role || null;
  },
};
