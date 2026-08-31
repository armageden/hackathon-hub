import { apiRequest } from "../../lib/api";
import { getActiveEventId } from "../../lib/event-id";
import type { ItineraryItem } from "./itinerary.types";

export async function listItinerary(eventId: string = getActiveEventId()): Promise<ItineraryItem[]> {
  const res = await apiRequest<{ items: ItineraryItem[] }>(`/events/${eventId}/itinerary`);
  return res.items;
}

export async function createItinerary(
  eventId: string = getActiveEventId(),
  data: { title: string; description?: string; location?: string; starts_at: string; ends_at: string; session_type: string; room_area?: string; speaker_name?: string; materials_url?: string }
): Promise<ItineraryItem> {
  const res = await apiRequest<{ item: ItineraryItem }>(`/events/${eventId}/itinerary`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.item;
}

export async function updateItinerary(
  eventId: string = getActiveEventId(),
  itemId: string,
  data: Partial<Pick<ItineraryItem, "title" | "description" | "location" | "starts_at" | "ends_at" | "session_type" | "status" | "room_area" | "speaker_name" | "materials_url">>
): Promise<ItineraryItem> {
  const res = await apiRequest<{ item: ItineraryItem }>(`/events/${eventId}/itinerary/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.item;
}

export async function deleteItinerary(
  eventId: string = getActiveEventId(),
  itemId: string
): Promise<void> {
  await apiRequest<{ message: string }>(`/events/${eventId}/itinerary/${itemId}`, {
    method: "DELETE",
  });
}
