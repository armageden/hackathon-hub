import { apiRequest } from "../../lib/api";

export interface UpdateEventPatch {
  name?: string;
  slug?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  status?: string;
}

// The caller refetches the event list after a successful mutation, so the
// response payloads don't need to be surfaced.
export async function updateEvent(eventId: string, patch: UpdateEventPatch): Promise<void> {
  await apiRequest(`/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await apiRequest(`/events/${eventId}`, { method: "DELETE" });
}
