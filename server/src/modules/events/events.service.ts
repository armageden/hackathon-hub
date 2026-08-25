import { eventsRepository, type CreateEventInput, type UpdateEventInput } from "./events.repository.js";
import { ValidationError, NotFoundError, AuthorizationError } from "../../middleware/error.middleware.js";

export const eventsService = {
  async listByUser(userId: string) {
    return eventsRepository.listByUser(userId);
  },

  async getById(eventId: string, userId: string) {
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check membership
    const isMember = await eventsRepository.isMember(eventId, userId);
    if (!isMember) {
      throw new AuthorizationError("You are not a member of this event");
    }

    const role = await eventsRepository.getMemberRole(eventId, userId);
    return { ...event, my_role: role };
  },

  async create(data: CreateEventInput, createdBy: string) {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Event name is required");
    }

    if (data.name.length > 255) {
      throw new ValidationError("Event name must be 255 characters or less");
    }

    // Validate dates if provided — unparseable strings would otherwise hit
    // the DB cast and surface as an unmapped 500.
    for (const value of [data.starts_at, data.ends_at]) {
      if (value && Number.isNaN(new Date(value).getTime())) {
        throw new ValidationError("Invalid date value");
      }
    }

    if (data.starts_at && data.ends_at) {
      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      if (end <= start) {
        throw new ValidationError("End date must be after start date");
      }
    }

    return eventsRepository.create(data, createdBy);
  },

  async update(eventId: string, data: UpdateEventInput, userId: string) {
    // Check event exists
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check user is organizer or admin
    const role = await eventsRepository.getMemberRole(eventId, userId);
    if (role !== "organizer") {
      throw new AuthorizationError("Only organizers can update events");
    }

    // Same rules as create, applied per-field on the partial payload
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationError("Event name is required");
      }
      if (data.name.length > 255) {
        throw new ValidationError("Event name must be 255 characters or less");
      }
    }

    if (data.slug !== undefined && data.slug.length > 255) {
      throw new ValidationError("Slug must be 255 characters or less");
    }

    if (
      data.status !== undefined &&
      !["draft", "active", "archived"].includes(data.status)
    ) {
      throw new ValidationError("Status must be 'draft', 'active', or 'archived'");
    }

    for (const value of [data.starts_at, data.ends_at]) {
      if (value && Number.isNaN(new Date(value).getTime())) {
        throw new ValidationError("Invalid date value");
      }
    }

    // Range check against the EFFECTIVE range — a partial update supplying
    // one bound is validated against the stored counterpart.
    const effectiveStart = data.starts_at ?? event.starts_at;
    const effectiveEnd = data.ends_at ?? event.ends_at;
    if (effectiveStart && effectiveEnd && new Date(effectiveEnd) <= new Date(effectiveStart)) {
      throw new ValidationError("End date must be after start date");
    }

    return eventsRepository.update(eventId, data);
  },

  async delete(eventId: string, userId: string) {
    // Check event exists
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Only creator can delete
    if (event.created_by !== userId) {
      throw new AuthorizationError("Only the event creator can delete it");
    }

    return eventsRepository.delete(eventId);
  },
};
