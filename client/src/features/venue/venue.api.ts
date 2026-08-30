import { apiRequest } from "../../lib/api";
import { getActiveEventId } from "../../lib/event-id";
import type {
  VenueLocation,
  VenueAssignment,
  CreateVenueLocationRequest,
  UpdateVenueLocationRequest,
  CreateVenueAssignmentRequest,
  UpdateVenueAssignmentRequest,
} from "@/types/api";

export async function listLocations(eventId: string = getActiveEventId()): Promise<VenueLocation[]> {
  const res = await apiRequest<{ locations: VenueLocation[] }>(
    `/events/${eventId}/venue/locations`
  );
  return res.locations;
}

export async function createLocation(
  eventId: string = getActiveEventId(),
  data: CreateVenueLocationRequest
): Promise<VenueLocation> {
  const res = await apiRequest<{ location: VenueLocation }>(
    `/events/${eventId}/venue/locations`,
    { method: "POST", body: JSON.stringify(data) }
  );
  return res.location;
}

export async function updateLocation(
  eventId: string = getActiveEventId(),
  locationId: string,
  data: UpdateVenueLocationRequest
): Promise<VenueLocation> {
  const res = await apiRequest<{ location: VenueLocation }>(
    `/events/${eventId}/venue/locations/${locationId}`,
    { method: "PUT", body: JSON.stringify(data) }
  );
  return res.location;
}

export async function deleteLocation(
  eventId: string = getActiveEventId(),
  locationId: string
): Promise<void> {
  await apiRequest(`/events/${eventId}/venue/locations/${locationId}`, { method: "DELETE" });
}

export async function listAssignments(
  eventId: string = getActiveEventId(),
  locationId?: string
): Promise<VenueAssignment[]> {
  const query = locationId ? `?location_id=${encodeURIComponent(locationId)}` : "";
  const res = await apiRequest<{ assignments: VenueAssignment[] }>(
    `/events/${eventId}/venue/assignments${query}`
  );
  return res.assignments;
}

export async function createAssignment(
  eventId: string = getActiveEventId(),
  data: CreateVenueAssignmentRequest
): Promise<VenueAssignment> {
  const res = await apiRequest<{ assignment: VenueAssignment }>(
    `/events/${eventId}/venue/assignments`,
    { method: "POST", body: JSON.stringify(data) }
  );
  return res.assignment;
}

export async function updateAssignment(
  eventId: string = getActiveEventId(),
  assignmentId: string,
  data: UpdateVenueAssignmentRequest
): Promise<VenueAssignment> {
  const res = await apiRequest<{ assignment: VenueAssignment }>(
    `/events/${eventId}/venue/assignments/${assignmentId}`,
    { method: "PUT", body: JSON.stringify(data) }
  );
  return res.assignment;
}

export async function cancelAssignment(
  eventId: string = getActiveEventId(),
  assignmentId: string
): Promise<void> {
  await apiRequest(`/events/${eventId}/venue/assignments/${assignmentId}`, {
    method: "DELETE",
  });
}
