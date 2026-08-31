import { venueRepository, type VenueAssignmentFilters } from "./venue.repository.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../middleware/error.middleware.js";

const LOCATION_TYPES = ["room", "booth", "table", "stage", "lab", "desk"];
const ASSIGNABLE_TYPES = ["team", "project", "exhibit"];

interface LocationPayload {
  name?: string;
  location_type?: string;
  capacity?: number | null;
  description?: string | null;
  position_x?: number | null;
  position_y?: number | null;
}

interface AssignmentPayload {
  venue_location_id: string;
  assignable_type: string;
  team_id?: string;
  project_submission_id?: string;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
}

interface AssignmentInsert {
  venue_location_id: string;
  assignable_type: string;
  team_id: string | null;
  project_submission_id: string | null;
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  assigned_by: string;
}

function validateLocationData(data: LocationPayload, partial: boolean) {
  if (!partial || data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Name is required");
    }
  }
  if (!partial || data.location_type !== undefined) {
    if (!data.location_type || !LOCATION_TYPES.includes(data.location_type)) {
      throw new ValidationError("Invalid location type");
    }
  }
  if (data.capacity !== undefined && data.capacity !== null) {
    if (!Number.isInteger(data.capacity) || data.capacity <= 0) {
      throw new ValidationError("Capacity must be a positive integer");
    }
  }
  for (const axis of ["position_x", "position_y"] as const) {
    const value = data[axis];
    if (value !== undefined && value !== null && typeof value !== "number") {
      throw new ValidationError("Position must be a number");
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new ValidationError("Position must be a number");
    }
  }
}

function validateRange(startsAt: any, endsAt: any) {
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new ValidationError("End time must be after start time");
  }
}

function validateAssignmentEntities(data: AssignmentPayload) {
  if (!ASSIGNABLE_TYPES.includes(data.assignable_type)) {
    throw new ValidationError("Invalid assignable type");
  }
  if (data.assignable_type === "team") {
    if (!data.team_id) {
      throw new ValidationError("team_id is required for team assignments");
    }
    return;
  }
  if (data.assignable_type === "project" && !data.project_submission_id) {
    throw new ValidationError("project_submission_id is required for project assignments");
  }
}

async function validateEntityInEvent(data: AssignmentPayload, eventId: string) {
  if (data.assignable_type === "team" && data.team_id) {
    if (!(await venueRepository.isTeamInEvent(data.team_id, eventId))) {
      throw new ValidationError("Team not found in this event");
    }
  }
  if (
    data.assignable_type === "project" &&
    data.project_submission_id &&
    !(await venueRepository.isProjectInEvent(data.project_submission_id, eventId))
  ) {
    throw new ValidationError("Project not found in this event");
  }
}

export const venueService = {
  async listLocations(eventId: string) {
    return venueRepository.listLocationsByEvent(eventId);
  },

  async getLocation(eventId: string, locationId: string) {
    const location = await venueRepository.findLocationById(eventId, locationId);
    if (!location) throw new NotFoundError("Venue location not found");
    return location;
  },

  async createLocation(eventId: string, data: LocationPayload) {
    validateLocationData(data, false);
    return venueRepository.insertLocation(eventId, {
      name: data.name!.trim(),
      location_type: data.location_type!,
      capacity: data.capacity ?? null,
      description: data.description ?? null,
    });
  },

  async updateLocation(eventId: string, locationId: string, data: LocationPayload) {
    const existing = await venueRepository.findLocationById(eventId, locationId);
    if (!existing) throw new NotFoundError("Venue location not found");

    validateLocationData(data, true);

    const fields: Record<string, any> = {};
    if (data.name !== undefined) fields.name = data.name.trim();
    if (data.location_type !== undefined) fields.location_type = data.location_type;
    if (data.capacity !== undefined) fields.capacity = data.capacity;
    if (data.description !== undefined) fields.description = data.description;
    if (data.position_x !== undefined) fields.position_x = data.position_x;
    if (data.position_y !== undefined) fields.position_y = data.position_y;

    // An empty patch must not reach SQL — it would build an invalid `SET` clause.
    if (Object.keys(fields).length === 0) return existing;

    return venueRepository.updateLocation(eventId, locationId, fields);
  },

  async deleteLocation(eventId: string, locationId: string) {
    const existing = await venueRepository.findLocationById(eventId, locationId);
    if (!existing) throw new NotFoundError("Venue location not found");
    await venueRepository.deleteLocation(eventId, locationId);
    return true;
  },

  async listAssignments(eventId: string, filters: VenueAssignmentFilters = {}) {
    return venueRepository.listAssignmentsByEvent(eventId, filters);
  },

  async createAssignment(
    eventId: string,
    data: AssignmentPayload,
    actor: { id: string }
  ) {
    const location = await venueRepository.findLocationById(eventId, data.venue_location_id);
    if (!location) throw new NotFoundError("Venue location not found");

    validateAssignmentEntities(data);
    validateRange(data.starts_at, data.ends_at);
    await validateEntityInEvent(data, eventId);

    const conflict = await venueRepository.findConflictingAssignment({
      eventId,
      locationId: data.venue_location_id,
      startsAt: data.starts_at ?? null,
      endsAt: data.ends_at ?? null,
    });
    if (conflict) {
      throw new ConflictError("Venue location is already booked for the selected time range");
    }

    return venueRepository.insertAssignment(eventId, {
      venue_location_id: data.venue_location_id,
      assignable_type: data.assignable_type,
      team_id: data.team_id ?? null,
      project_submission_id: data.project_submission_id ?? null,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      assigned_by: actor.id,
    });
  },

  async updateAssignment(
    eventId: string,
    assignmentId: string,
    data: Partial<AssignmentPayload> & { status?: string }
  ) {
    const existing = await venueRepository.findAssignmentById(eventId, assignmentId);
    if (!existing) throw new NotFoundError("Venue assignment not found");

    if (data.status !== undefined && !["active", "cancelled"].includes(data.status)) {
      throw new ValidationError("Status must be 'active' or 'cancelled'");
    }

    const effectiveStart = data.starts_at ?? existing.starts_at;
    const effectiveEnd = data.ends_at ?? existing.ends_at;
    validateRange(effectiveStart, effectiveEnd);

    // A repointed location must belong to this event — the create path checks
    // ownership, the update path must too, or cross-event bookings slip past
    // both events' overlap checks.
    if (data.venue_location_id !== undefined && data.venue_location_id !== existing.venue_location_id) {
      const location = await venueRepository.findLocationById(eventId, data.venue_location_id);
      if (!location) throw new NotFoundError("Venue location not found in this event");
    }
    const targetLocationId = data.venue_location_id ?? existing.venue_location_id;

    if (data.assignable_type !== undefined || data.team_id !== undefined || data.project_submission_id !== undefined) {
      validateAssignmentEntities({
        venue_location_id: targetLocationId,
        assignable_type: data.assignable_type ?? existing.assignable_type,
        team_id: data.team_id ?? undefined,
        project_submission_id: data.project_submission_id ?? undefined,
      });
      await validateEntityInEvent(
        {
          venue_location_id: targetLocationId,
          assignable_type: data.assignable_type ?? existing.assignable_type,
          team_id: data.team_id,
          project_submission_id: data.project_submission_id,
          starts_at: effectiveStart,
          ends_at: effectiveEnd,
        },
        eventId
      );
    }

    const conflict = await venueRepository.findConflictingAssignment({
      eventId,
      locationId: targetLocationId,
      startsAt: effectiveStart,
      endsAt: effectiveEnd,
      excludeId: assignmentId,
    });
    if (conflict) {
      throw new ConflictError("Venue location is already booked for the selected time range");
    }

    const fields: Record<string, any> = {};
    if (data.venue_location_id !== undefined) fields.venue_location_id = data.venue_location_id;
    if (data.assignable_type !== undefined) fields.assignable_type = data.assignable_type;
    if (data.team_id !== undefined) fields.team_id = data.team_id;
    if (data.project_submission_id !== undefined)
      fields.project_submission_id = data.project_submission_id;
    if (data.starts_at !== undefined) fields.starts_at = data.starts_at;
    if (data.ends_at !== undefined) fields.ends_at = data.ends_at;
    if (data.status !== undefined) fields.status = data.status;

    // An empty patch must not reach SQL — it would build an invalid `SET` clause.
    if (Object.keys(fields).length === 0) return existing;

    return venueRepository.updateAssignment(eventId, assignmentId, fields);
  },

  async cancelAssignment(eventId: string, assignmentId: string) {
    const existing = await venueRepository.findAssignmentById(eventId, assignmentId);
    if (!existing) throw new NotFoundError("Venue assignment not found");
    return venueRepository.cancelAssignment(eventId, assignmentId);
  },
};
