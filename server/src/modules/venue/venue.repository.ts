import { pool } from "../../db/pool.js";
import { ConflictError } from "../../middleware/error.middleware.js";

export interface VenueLocationRecord {
  id: string;
  event_id: string;
  name: string;
  location_type: string;
  capacity: number | null;
  description: string | null;
  created_at: Date;
}

export interface VenueAssignmentFilters {
  location_id?: string;
}

export interface VenueAssignmentRecord {
  id: string;
  event_id: string;
  venue_location_id: string;
  assignable_type: string;
  team_id: string | null;
  project_submission_id: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  assigned_by: string;
  status: string;
  created_at: Date;
  team?: { id: string; name: string };
  project?: { id: string; title: string };
}

function withJoinedEntities(row: any): VenueAssignmentRecord {
  const { team_name, project_title, ...rest } = row;
  return {
    ...rest,
    ...(rest.team_id && team_name ? { team: { id: rest.team_id, name: team_name } } : {}),
    ...(rest.project_submission_id && project_title
      ? { project: { id: rest.project_submission_id, title: project_title } }
      : {}),
  } as VenueAssignmentRecord;
}

export const venueRepository = {
  async listLocationsByEvent(eventId: string) {
    const result = await pool.query(
      `SELECT * FROM venue_locations WHERE event_id = $1 ORDER BY created_at ASC`,
      [eventId]
    );
    return result.rows;
  },

  async findLocationById(eventId: string, locationId: string) {
    const result = await pool.query(
      `SELECT * FROM venue_locations WHERE event_id = $1 AND id = $2`,
      [eventId, locationId]
    );
    return result.rows[0] ?? null;
  },

  async insertLocation(
    eventId: string,
    data: {
      name: string;
      location_type: string;
      capacity: number | null;
      description: string | null;
    }
  ) {
    const result = await pool.query(
      `INSERT INTO venue_locations (event_id, name, location_type, capacity, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [eventId, data.name, data.location_type, data.capacity, data.description]
    );
    return result.rows[0];
  },

  async updateLocation(
    eventId: string,
    locationId: string,
    fields: Record<string, any>
  ) {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 3}`);
    const values = keys.map((k) => fields[k]);
    const result = await pool.query(
      `UPDATE venue_locations SET ${sets.join(", ")}
       WHERE event_id = $1 AND id = $2
       RETURNING *`,
      [eventId, locationId, ...values]
    );
    return result.rows[0] ?? null;
  },

  async deleteLocation(eventId: string, locationId: string) {
    // venue_assignments.venue_location_id is ON DELETE CASCADE, so bookings
    // for this location are removed with it.
    const result = await pool.query(
      `DELETE FROM venue_locations WHERE event_id = $1 AND id = $2`,
      [eventId, locationId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  async listAssignmentsByEvent(eventId: string, filters: VenueAssignmentFilters) {
    const params: any[] = [eventId];
    let where = `WHERE a.event_id = $1`;
    if (filters.location_id) {
      params.push(filters.location_id);
      where += ` AND a.venue_location_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT a.*, t.name AS team_name, p.title AS project_title
       FROM venue_assignments a
       LEFT JOIN teams t ON t.id = a.team_id
       LEFT JOIN project_submissions p ON p.id = a.project_submission_id
       ${where}
       ORDER BY a.starts_at ASC NULLS LAST`,
      params
    );
    return result.rows.map(withJoinedEntities);
  },

  async findAssignmentById(eventId: string, assignmentId: string) {
    const result = await pool.query(
      `SELECT a.*, t.name AS team_name, p.title AS project_title
       FROM venue_assignments a
       LEFT JOIN teams t ON t.id = a.team_id
       LEFT JOIN project_submissions p ON p.id = a.project_submission_id
       WHERE a.event_id = $1 AND a.id = $2`,
      [eventId, assignmentId]
    );
    return result.rows[0] ? withJoinedEntities(result.rows[0]) : null;
  },

  async findConflictingAssignment(params: {
    eventId: string;
    locationId: string;
    startsAt: string | Date | null;
    endsAt: string | Date | null;
    excludeId?: string;
  }) {
    // Null bounds are treated as unbounded (-infinity / infinity), so an
    // open-ended assignment conflicts with anything on the same location.
    const result = await pool.query(
      `SELECT * FROM venue_assignments
       WHERE event_id = $1
         AND venue_location_id = $2
         AND status = 'active'
         AND COALESCE(starts_at, '-infinity') < COALESCE($4::timestamptz, 'infinity')
         AND COALESCE(ends_at, 'infinity') > COALESCE($3::timestamptz, '-infinity')
         AND ($5::uuid IS NULL OR id <> $5::uuid)
       LIMIT 1`,
      [params.eventId, params.locationId, params.startsAt, params.endsAt, params.excludeId ?? null]
    );
    return result.rows[0] ?? null;
  },

  async insertAssignment(
    eventId: string,
    data: {
      venue_location_id: string;
      assignable_type: string;
      team_id: string | null;
      project_submission_id: string | null;
      starts_at: string | Date | null;
      ends_at: string | Date | null;
      assigned_by: string;
    }
  ) {
    // Conflict check and insert share one transaction so two concurrent
    // organizers cannot both pass an outside-of-tx check.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const conflict = await client.query(
        `SELECT id FROM venue_assignments
         WHERE event_id = $1
           AND venue_location_id = $2
           AND status = 'active'
           AND COALESCE(starts_at, '-infinity') < COALESCE($4::timestamptz, 'infinity')
           AND COALESCE(ends_at, 'infinity') > COALESCE($3::timestamptz, '-infinity')
         FOR UPDATE`,
        [eventId, data.venue_location_id, data.starts_at, data.ends_at]
      );
      if (conflict.rows.length > 0) {
        await client.query("ROLLBACK");
        throw new ConflictError("Venue location is already booked for the selected time range");
      }
      const result = await client.query(
        `INSERT INTO venue_assignments
           (event_id, venue_location_id, assignable_type, team_id, project_submission_id, starts_at, ends_at, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          eventId,
          data.venue_location_id,
          data.assignable_type,
          data.team_id,
          data.project_submission_id,
          data.starts_at,
          data.ends_at,
          data.assigned_by,
        ]
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch { /* already rolled back */ }
      throw err;
    } finally {
      client.release();
    }
  },

  async updateAssignment(
    eventId: string,
    assignmentId: string,
    fields: Record<string, any>
  ) {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 3}`);
    const values = keys.map((k) => fields[k]);
    const result = await pool.query(
      `UPDATE venue_assignments SET ${sets.join(", ")}
       WHERE event_id = $1 AND id = $2
       RETURNING *`,
      [eventId, assignmentId, ...values]
    );
    return result.rows[0] ?? null;
  },

  async cancelAssignment(eventId: string, assignmentId: string) {
    const result = await pool.query(
      `UPDATE venue_assignments SET status = 'cancelled'
       WHERE event_id = $1 AND id = $2
       RETURNING *`,
      [eventId, assignmentId]
    );
    return result.rows[0] ?? null;
  },

  async isTeamInEvent(teamId: string, eventId: string) {
    const result = await pool.query(
      `SELECT 1 FROM teams WHERE id = $1 AND event_id = $2`,
      [teamId, eventId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  async isProjectInEvent(projectSubmissionId: string, eventId: string) {
    const result = await pool.query(
      `SELECT 1 FROM project_submissions WHERE id = $1 AND event_id = $2`,
      [projectSubmissionId, eventId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },
};
