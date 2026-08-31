import { apiRequest } from "../../lib/api";
import { getActiveEventId } from "../../lib/event-id";
import type { Notification } from "./notifications.types";

export async function listNotifications(
  eventId: string = getActiveEventId(),
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const params = unreadOnly ? "?unread=true" : "";
  const res = await apiRequest<{ notifications: Notification[] }>(
    `/events/${eventId}/notifications${params}`
  );
  return res.notifications;
}

export async function getUnreadCount(eventId: string = getActiveEventId()): Promise<number> {
  const res = await apiRequest<{ count: number }>(`/events/${eventId}/notifications/unread-count`);
  return res.count;
}

export async function markAsRead(
  notificationId: string,
  eventId: string = getActiveEventId()
): Promise<void> {
  await apiRequest(`/events/${eventId}/notifications/${notificationId}/read`, {
    method: "POST",
  });
}

export async function markAllAsRead(eventId: string = getActiveEventId()): Promise<void> {
  await apiRequest(`/events/${eventId}/notifications/read-all`, {
    method: "POST",
  });
}

export async function deleteNotification(
  notificationId: string,
  eventId: string = getActiveEventId()
): Promise<void> {
  await apiRequest(`/events/${eventId}/notifications/${notificationId}`, {
    method: "DELETE",
  });
}
