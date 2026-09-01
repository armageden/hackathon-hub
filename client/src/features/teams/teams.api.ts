import { apiRequest } from "../../lib/api";
import { getActiveEventId } from "../../lib/event-id";
import type { Team, TeamApplication, ParticipantProfile, TechTag } from "./teams.types";

export async function listTeams(eventId: string): Promise<{ teams: Team[] }> {
  return apiRequest("/events/" + eventId + "/teams");
}

export async function getTeam(eventId: string, teamId: string): Promise<{ team: Team }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId);
}

export async function createTeam(
  eventId: string,
  name: string,
  description?: string,
  maxSize?: number
): Promise<{ team: Team }> {
  return apiRequest("/events/" + eventId + "/teams", {
    method: "POST",
    body: JSON.stringify({ name, description, max_size: maxSize }),
  });
}

export async function joinTeam(eventId: string, teamId: string): Promise<{ member: any }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId + "/join", {
    method: "POST",
  });
}

export async function leaveTeam(eventId: string, teamId: string): Promise<{ message: string }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId + "/leave", {
    method: "POST",
  });
}

export async function applyToTeam(
  eventId: string,
  teamId: string,
  message?: string
): Promise<{ application: TeamApplication }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId + "/applications", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function listApplications(
  eventId: string,
  teamId: string
): Promise<{ applications: TeamApplication[] }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId + "/applications");
}

export async function reviewApplication(
  eventId: string,
  applicationId: string,
  status: string
): Promise<{ application: TeamApplication }> {
  return apiRequest("/events/" + eventId + "/teams/" + applicationId + "/review", {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function listParticipants(
  eventId: string,
  lookingForTeam?: boolean
): Promise<{ participants: ParticipantProfile[] }> {
  const params = lookingForTeam !== undefined ? "?looking_for_team=" + lookingForTeam : "";
  return apiRequest("/events/" + eventId + "/participants" + params);
}

export async function getMyProfile(
  eventId: string
): Promise<{ profile: ParticipantProfile | null }> {
  return apiRequest("/events/" + eventId + "/participants/me");
}

export async function createOrUpdateProfile(
  eventId: string,
  data: {
    bio?: string;
    experience_level?: string;
    preferred_role?: string;
    looking_for_team?: boolean;
    tech_stack_summary?: string;
    tech_stack_tag_ids?: string[];
  }
): Promise<{ profile: ParticipantProfile }> {
  return apiRequest("/events/" + eventId + "/participants/me", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTechTags(): Promise<{ tags: TechTag[] }> {
  return apiRequest(`/events/${getActiveEventId()}/participants/tech-tags`);
}

export async function deleteTeamByAdmin(eventId: string, teamId: string): Promise<void> {
  await apiRequest("/events/" + eventId + "/teams/" + teamId + "/admin", {
    method: "DELETE",
  });
}

export async function forceJoinTeam(eventId: string, teamId: string, userId: string): Promise<{ member: any }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId + "/admin/join", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeMember(eventId: string, teamId: string, userId: string): Promise<{ message: string }> {
  return apiRequest("/events/" + eventId + "/teams/" + teamId + "/members/" + userId, {
    method: "DELETE",
  });
}

export interface AutoAssignResult {
  teams_created: number;
  participants_assigned: number;
}

export async function autoAssignTeams(eventId: string, maxSize: number = 5): Promise<AutoAssignResult> {
  return apiRequest("/events/" + eventId + "/teams/auto-assign", {
    method: "POST",
    body: JSON.stringify({ max_size: maxSize }),
  });
}

