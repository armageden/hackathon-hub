import { itineraryRepository } from "./itinerary.repository.js";
import { NotFoundError, ValidationError } from "../../middleware/error.middleware.js";

export const itineraryService = {
  async listItems(eventId: string) {
    return itineraryRepository.listByEvent(eventId);
  },

  async getItem(eventId: string, itemId: string) {
    const item = await itineraryRepository.findById(eventId, itemId);
    if (!item) throw new NotFoundError("Itinerary item not found");
    return item;
  },

  async createItem(
    eventId: string,
    data: {
      title: string;
      description?: string;
      location?: string;
      room_area?: string;
      speaker_name?: string;
      materials_url?: string;
      starts_at: string;
      ends_at: string;
      session_type?: string;
    }
  ) {
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError("Title is required");
    }
    if (!data.starts_at) throw new ValidationError("Start time is required");
    if (!data.ends_at) throw new ValidationError("End time is required");

    const startDate = new Date(data.starts_at);
    const endDate = new Date(data.ends_at);
    if (endDate <= startDate) {
      throw new ValidationError("End time must be after start time");
    }

    return itineraryRepository.create(
      eventId,
      data.title.trim(),
      data.description || null,
      data.location || null,
      data.starts_at,
      data.ends_at,
      data.session_type || "general",
      data.room_area || null,
      data.speaker_name || null,
      data.materials_url || null
    );
  },

  async updateItem(
    eventId: string,
    itemId: string,
    data: {
      title?: string;
      description?: string;
      location?: string;
      room_area?: string;
      speaker_name?: string;
      materials_url?: string;
      starts_at?: string;
      ends_at?: string;
      session_type?: string;
      status?: string;
    }
  ) {
    const item = await itineraryRepository.findById(eventId, itemId);
    if (!item) throw new NotFoundError("Itinerary item not found");

    const effectiveStart = data.starts_at ?? item.starts_at;
    const effectiveEnd = data.ends_at ?? item.ends_at;
    if (
      Number.isNaN(new Date(effectiveStart).getTime()) ||
      Number.isNaN(new Date(effectiveEnd).getTime())
    ) {
      throw new ValidationError("Invalid time value");
    }
    if (new Date(effectiveEnd) <= new Date(effectiveStart)) {
      throw new ValidationError("End time must be after start time");
    }

    if (data.status && !["active", "cancelled"].includes(data.status)) {
      throw new ValidationError("Status must be 'active' or 'cancelled'");
    }

    const fields: Record<string, any> = {};
    if (data.title !== undefined) fields.title = data.title.trim();
    if (data.description !== undefined) fields.description = data.description;
    if (data.location !== undefined) fields.location = data.location;
    if (data.room_area !== undefined) fields.room_area = data.room_area;
    if (data.speaker_name !== undefined) fields.speaker_name = data.speaker_name;
    if (data.materials_url !== undefined) fields.materials_url = data.materials_url;
    if (data.starts_at !== undefined) fields.starts_at = data.starts_at;
    if (data.ends_at !== undefined) fields.ends_at = data.ends_at;
    if (data.session_type !== undefined) fields.session_type = data.session_type;
    if (data.status !== undefined) fields.status = data.status;

    return itineraryRepository.update(eventId, itemId, fields);
  },

  async deleteItem(eventId: string, itemId: string) {
    const item = await itineraryRepository.findById(eventId, itemId);
    if (!item) throw new NotFoundError("Itinerary item not found");
    return itineraryRepository.delete(eventId, itemId);
  },
};