import { apiRequest } from "../../lib/api";

export type EventRole = "organizer" | "participant" | "volunteer" | "judge";

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: EventRole;
  status: string;
  joined_at: string;
}

export async function listMembers(eventId: string): Promise<EventMember[]> {
  const res = await apiRequest<{ members: EventMember[] }>(`/events/${eventId}/members`);
  return res.members;
}

export async function addMember(eventId: string, userId: string, role: EventRole): Promise<EventMember> {
  const res = await apiRequest<{ member: EventMember }>(`/events/${eventId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
  return res.member;
}

export async function updateMemberRole(eventId: string, userId: string, role: EventRole): Promise<EventMember> {
  const res = await apiRequest<{ member: EventMember }>(`/events/${eventId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
  return res.member;
}

export async function removeMember(eventId: string, userId: string): Promise<void> {
  await apiRequest(`/events/${eventId}/members/${userId}`, { method: "DELETE" });
}
