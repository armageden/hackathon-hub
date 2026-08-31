import { apiRequest } from "../../lib/api";
import { getActiveEventId } from "../../lib/event-id";
import type { Checkin, CheckinStats } from "./checkin.types";

export async function listCheckins(eventId: string = getActiveEventId()): Promise<Checkin[]> {
  const res = await apiRequest<{ checkins: Checkin[] }>(`/events/${eventId}/checkin`);
  return res.checkins;
}

export async function manualCheckin(
  eventId: string = getActiveEventId(),
  userId: string,
  itineraryItemId?: string
): Promise<Checkin> {
  const res = await apiRequest<{ checkin: Checkin }>(`/events/${eventId}/checkin/manual`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, itinerary_item_id: itineraryItemId || null }),
  });
  return res.checkin;
}

export async function qrCheckin(
  eventId: string = getActiveEventId(),
  token: string
): Promise<Checkin> {
  const res = await apiRequest<{ checkin: Checkin }>(`/events/${eventId}/checkin/qr`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return res.checkin;
}

export async function generateQRToken(
  eventId: string = getActiveEventId(),
  userId?: string,
  expiresInMinutes?: number
): Promise<{ token: string }> {
  const res = await apiRequest<{ token: string }>(`/events/${eventId}/checkin/qr/generate`, {
    method: "POST",
    body: JSON.stringify({
      user_id: userId || null,
      expires_in_minutes: expiresInMinutes || 60,
    }),
  });
  return res;
}

export async function getCheckinStats(eventId: string = getActiveEventId()): Promise<CheckinStats> {
  const res = await apiRequest<{ stats: CheckinStats }>(`/events/${eventId}/checkin/stats`);
  return res.stats;
}

export async function bulkCheckin(
  eventId: string = getActiveEventId(),
  userIds: string[],
  itineraryItemId: string
): Promise<{ checked_in: number }> {
  const res = await apiRequest<{ checked_in: number }>(`/events/${eventId}/checkin/bulk`, {
    method: "POST",
    body: JSON.stringify({ user_ids: userIds, itinerary_item_id: itineraryItemId }),
  });
  return res;
}

export async function checkout(
  eventId: string = getActiveEventId(),
  checkinId: string
): Promise<Checkin> {
  const res = await apiRequest<{ checkin: Checkin }>(`/events/${eventId}/checkin/${checkinId}/checkout`, {
    method: "POST",
  });
  return res.checkin;
}

