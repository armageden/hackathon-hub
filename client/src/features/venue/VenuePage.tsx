import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Plus, RefreshCw } from "lucide-react";
import { useEventRole } from "@/hooks/useEventRole";
import { ScheduleGrid } from "@/components/venue/ScheduleGrid";
import { VenueMap } from "@/components/venue/VenueMap";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import type {
  VenueLocation,
  VenueAssignment,
  CreateVenueLocationRequest,
  CreateVenueAssignmentRequest,
} from "@/types/api";
import * as venueApi from "./venue.api";
import { listTeams } from "../teams/teams.api";
import { useScopedEventId } from "@/app/providers";

const LOCATION_TYPES = ["room", "booth", "table", "stage", "lab", "desk"] as const;
const ASSIGNABLE_TYPES = ["team", "project", "exhibit"] as const;

type Tab = "schedule" | "map" | "locations";

interface Message {
  type: "success" | "error";
  text: string;
}

function isoToLocalInput(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

interface LocationFormState {
  name: string;
  location_type: (typeof LOCATION_TYPES)[number];
  capacity: string;
  description: string;
}

const emptyLocationForm: LocationFormState = {
  name: "",
  location_type: "table",
  capacity: "",
  description: "",
};

interface AssignmentFormState {
  venue_location_id: string;
  assignable_type: (typeof ASSIGNABLE_TYPES)[number];
  team_id: string;
  starts_at: string;
  ends_at: string;
}

export default function VenuePage() {
  const EVENT_ID = useScopedEventId();
  const { canManage } = useEventRole(EVENT_ID);

  const [tab, setTab] = useState<Tab>("schedule");
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [assignments, setAssignments] = useState<VenueAssignment[]>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<VenueLocation | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormState>(emptyLocationForm);
  const [locationSaving, setLocationSaving] = useState(false);

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<VenueAssignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>({
    venue_location_id: "",
    assignable_type: "team",
    team_id: "",
    starts_at: "",
    ends_at: "",
  });
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [locs, asgs] = await Promise.all([
        venueApi.listLocations(EVENT_ID),
        venueApi.listAssignments(EVENT_ID),
      ]);
      setLocations(locs);
      setAssignments(asgs);
      setMessage(null);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load venue data" });
    } finally {
      setLoading(false);
    }
  }, [EVENT_ID]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!canManage) return;
    listTeams(EVENT_ID)
      .then((res) => setTeams(res.teams))
      .catch(() => setTeams([]));
  }, [canManage]);

  const gridWindow = useMemo(() => {
    const fallbackStart = new Date();
    fallbackStart.setHours(8, 0, 0, 0);
    const fallbackEnd = new Date();
    fallbackEnd.setHours(22, 0, 0, 0);

    const times = assignments
      .flatMap((a) => [a.starts_at, a.ends_at])
      .filter(Boolean)
      .map((t) => new Date(t as string).getTime());
    if (times.length === 0) return { start: fallbackStart, end: fallbackEnd };

    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    const start = new Date(min);
    start.setHours(0, 0, 0, 0);
    const end = new Date(max);
    end.setHours(23, 59, 59, 999);
    // Multi-day spans would make a single grid unreadable; fall back to today.
    if (end.getTime() - start.getTime() > 36 * 3600 * 1000) {
      return { start: fallbackStart, end: fallbackEnd };
    }
    return { start, end };
  }, [assignments]);

  const [mapPositions, setMapPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<VenueLocation | null>(null);
  const [deleteLocationSaving, setDeleteLocationSaving] = useState(false);
  const mapLocations = useMemo(
    () =>
      locations.map((loc, i) => ({
        ...loc,
        position_x: mapPositions[loc.id]?.x ?? loc.position_x ?? 40 + (i % 4) * 240,
        position_y: mapPositions[loc.id]?.y ?? loc.position_y ?? 40 + Math.floor(i / 4) * 180,
        size_width: 180,
        size_height: 120,
      })),
    [locations, mapPositions]
  );
  const [selectedMapLocationId, setSelectedMapLocationId] = useState<string | null>(null);

  const handleDeleteLocation = async () => {
    if (!deleteLocationTarget) return;
    setDeleteLocationSaving(true);
    try {
      await venueApi.deleteLocation(EVENT_ID, deleteLocationTarget.id);
      setDeleteLocationTarget(null);
      setMessage({ type: "success", text: "Location deleted" });
      await loadAll();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete location",
      });
    } finally {
      setDeleteLocationSaving(false);
    }
  };

  const openCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm(emptyLocationForm);
    setLocationDialogOpen(true);
  };

  const openEditLocation = (loc: VenueLocation) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name,
      location_type: loc.location_type,
      capacity: loc.capacity != null ? String(loc.capacity) : "",
      description: loc.description ?? "",
    });
    setLocationDialogOpen(true);
  };

  const saveLocation = async () => {
    setLocationSaving(true);
    try {
      const payload: CreateVenueLocationRequest = {
        name: locationForm.name.trim(),
        location_type: locationForm.location_type,
        ...(locationForm.capacity ? { capacity: Number(locationForm.capacity) } : {}),
        ...(locationForm.description ? { description: locationForm.description } : {}),
      };
      if (editingLocation) {
        await venueApi.updateLocation(EVENT_ID, editingLocation.id, payload);
        setMessage({ type: "success", text: `Location "${payload.name}" updated` });
      } else {
        await venueApi.createLocation(EVENT_ID, payload);
        setMessage({ type: "success", text: `Location "${payload.name}" created` });
      }
      setLocationDialogOpen(false);
      await loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save location" });
    } finally {
      setLocationSaving(false);
    }
  };

  const openCreateAssignment = (locationId?: string, startTime?: Date, endTime?: Date) => {
    setEditingAssignment(null);
    setAssignmentForm({
      venue_location_id: locationId ?? locations[0]?.id ?? "",
      assignable_type: "team",
      team_id: teams[0]?.id ?? "",
      starts_at: startTime ? isoToLocalInput(startTime) : "",
      ends_at: endTime ? isoToLocalInput(endTime) : "",
    });
    setAssignmentDialogOpen(true);
  };

  const openEditAssignment = (assignment: VenueAssignment) => {
    if (!canManage) return;
    setEditingAssignment(assignment);
    setAssignmentForm({
      venue_location_id: assignment.venue_location_id,
      assignable_type: assignment.assignable_type,
      team_id: assignment.team_id ?? "",
      starts_at: isoToLocalInput(assignment.starts_at),
      ends_at: isoToLocalInput(assignment.ends_at),
    });
    setAssignmentDialogOpen(true);
  };

  const saveAssignment = async () => {
    setAssignmentSaving(true);
    try {
      const payload: CreateVenueAssignmentRequest = {
        venue_location_id: assignmentForm.venue_location_id,
        assignable_type: assignmentForm.assignable_type,
        ...(assignmentForm.assignable_type === "team" && assignmentForm.team_id
          ? { team_id: assignmentForm.team_id }
          : {}),
        starts_at: localInputToIso(assignmentForm.starts_at) ?? undefined,
        ends_at: localInputToIso(assignmentForm.ends_at) ?? undefined,
      };
      if (editingAssignment) {
        await venueApi.updateAssignment(EVENT_ID, editingAssignment.id, payload);
        setMessage({ type: "success", text: "Assignment updated" });
      } else {
        await venueApi.createAssignment(EVENT_ID, payload);
        setMessage({ type: "success", text: "Assignment created" });
      }
      setAssignmentDialogOpen(false);
      await loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save assignment" });
    } finally {
      setAssignmentSaving(false);
    }
  };

  const cancelAssignment = async (assignmentId: string) => {
    try {
      await venueApi.cancelAssignment(EVENT_ID, assignmentId);
      setMessage({ type: "success", text: "Assignment cancelled" });
      setAssignmentDialogOpen(false);
      await loadAll();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to cancel assignment" });
    }
  };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "schedule", label: "Schedule" },
    { key: "map", label: "Map" },
    { key: "locations", label: `Locations (${locations.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Venue &amp; Logistics</h1>
          <p className="text-sm text-gray-400 mt-1">
            Assign teams and exhibits to rooms, booths, and tables without double-booking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={loadAll} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Button onClick={openCreateLocation}>
              <Plus className="h-4 w-4 mr-2" /> New Location
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={
            message.type === "error"
              ? "rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
              : "rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-300"
          }
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-white border-b-2 border-indigo-500"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-gray-400">Loading venue...</div>
        </div>
      ) : tab === "schedule" ? (
        locations.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <MapPin className="h-8 w-8 mx-auto mb-3 opacity-50" />
            No locations yet.{canManage ? ' Click "New Location" to add your first room or table.' : ""}
          </div>
        ) : (
          <ScheduleGrid
            locations={locations}
            assignments={assignments.filter((a) => a.status === "active")}
            eventStart={gridWindow.start}
            eventEnd={gridWindow.end}
            onAssignmentClick={openEditAssignment}
            onTimeSlotClick={(locationId, startTime, endTime) => {
              if (canManage) openCreateAssignment(locationId, startTime, endTime);
            }}
          />
        )
      ) : tab === "map" ? (
        locations.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <MapPin className="h-8 w-8 mx-auto mb-3 opacity-50" />
            Nothing to map yet — create locations first.
          </div>
        ) : (
          <>
            <div className="card p-4 overflow-x-auto">
              <VenueMap
                locations={mapLocations}
                assignments={assignments.filter((a) => a.status === "active")}
                selectedLocationId={selectedMapLocationId}
                onLocationClick={(loc) => setSelectedMapLocationId(loc.id)}
                onLocationDragEnd={(locationId, x, y) => {
                  setMapPositions((prev) => ({ ...prev, [locationId]: { x, y } }));
                  // Persist the layout so it survives reloads.
                  venueApi
                    .updateLocation(EVENT_ID, locationId, { position_x: x, position_y: y })
                    .catch(() =>
                      setMessage({ type: "error", text: "Could not save the map layout" })
                    );
                }}
                width={1000}
                height={Math.max(400, Math.ceil(locations.length / 4) * 180 + 80)}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">Drag locations to arrange the layout — positions are saved automatically.</p>
          </>
        )
      ) : (
        <div className="card overflow-hidden">
          {locations.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No locations yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Capacity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Bookings</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {locations.map((loc) => {
                  const count = assignments.filter(
                    (a) => a.venue_location_id === loc.id && a.status === "active"
                  ).length;
                  return (
                    <tr key={loc.id} className="hover:bg-gray-900/50">
                      <td className="px-4 py-3 text-white">{loc.name}</td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{loc.location_type}</td>
                      <td className="px-4 py-3 text-gray-300">{loc.capacity ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{count}</td>
                      {canManage && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditLocation(loc)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => setDeleteLocationTarget(loc)}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Location create/edit dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "New Location"}</DialogTitle>
            <DialogDescription>
              Rooms, booths, tables, stages, labs, and desks can all be booked by assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name</label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder="e.g. Main Hall Table 3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Type</label>
                <select className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  value={locationForm.location_type}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, location_type: e.target.value as LocationFormState["location_type"] })
                  }
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Capacity</label>
                <Input
                  type="number"
                  min={1}
                  value={locationForm.capacity}
                  onChange={(e) => setLocationForm({ ...locationForm, capacity: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <Textarea
                value={locationForm.description}
                onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                placeholder="Optional"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLocationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveLocation} disabled={locationSaving || !locationForm.name.trim()}>
              {locationSaving ? "Saving..." : editingLocation ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment create/edit dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Assignment" : "New Assignment"}</DialogTitle>
            <DialogDescription>
              Overlapping bookings for the same location are rejected automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Location</label>
              <select className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                value={assignmentForm.venue_location_id}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, venue_location_id: e.target.value })
                }
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Assigning</label>
              <select className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                value={assignmentForm.assignable_type}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    assignable_type: e.target.value as AssignmentFormState["assignable_type"],
                  })
                }
              >
                {ASSIGNABLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {assignmentForm.assignable_type === "team" && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">Team</label>
                <select className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  value={assignmentForm.team_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, team_id: e.target.value })}
                >
                  <option value="">Select a team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Starts at</label>
                <Input
                  type="datetime-local"
                  value={assignmentForm.starts_at}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, starts_at: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Ends at</label>
                <Input
                  type="datetime-local"
                  value={assignmentForm.ends_at}
                  onChange={(e) =>
                    setAssignmentForm({ ...assignmentForm, ends_at: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editingAssignment && (
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-300 mr-auto"
                onClick={() => cancelAssignment(editingAssignment.id)}
              >
                Cancel Booking
              </Button>
            )}
            <Button variant="ghost" onClick={() => setAssignmentDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={saveAssignment}
              disabled={assignmentSaving || !assignmentForm.venue_location_id}
            >
              {assignmentSaving ? "Saving..." : editingAssignment ? "Save Changes" : "Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete location confirmation */}
      <Dialog
        open={deleteLocationTarget !== null}
        onOpenChange={(open) => !open && setDeleteLocationTarget(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete “{deleteLocationTarget?.name}”?</DialogTitle>
            <DialogDescription>
              This removes the location and all of its bookings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteLocationTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteLocation} disabled={deleteLocationSaving}>
              {deleteLocationSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
