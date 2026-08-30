import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./venue.repository.js", () => ({
  venueRepository: {
    listLocationsByEvent: vi.fn(),
    findLocationById: vi.fn(),
    insertLocation: vi.fn(),
    updateLocation: vi.fn(),
    listAssignmentsByEvent: vi.fn(),
    findAssignmentById: vi.fn(),
    insertAssignment: vi.fn(),
    updateAssignment: vi.fn(),
    cancelAssignment: vi.fn(),
    deleteLocation: vi.fn(),
    findConflictingAssignment: vi.fn(),
    isTeamInEvent: vi.fn(),
    isProjectInEvent: vi.fn(),
  },
}));

import { venueService } from "./venue.service.js";
import { venueRepository } from "./venue.repository.js";

const repo = venueRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

const EVENT_ID = "evt-1";
const LOCATION_ID = "loc-1";
const ASSIGNMENT_ID = "asg-1";
const ACTOR = { id: "organizer-1" };

const baseLocation = {
  id: LOCATION_ID,
  event_id: EVENT_ID,
  name: "Table 1",
  location_type: "table",
  capacity: 4,
  description: null,
  created_at: new Date(),
};

const baseAssignment = {
  id: ASSIGNMENT_ID,
  event_id: EVENT_ID,
  venue_location_id: LOCATION_ID,
  assignable_type: "team",
  team_id: "team-1",
  project_submission_id: null,
  starts_at: new Date("2026-09-01T10:00:00Z"),
  ends_at: new Date("2026-09-01T12:00:00Z"),
  assigned_by: "organizer-1",
  status: "active",
  created_at: new Date(),
};

const locData = {
  name: "Main Stage",
  location_type: "stage" as const,
  capacity: 100,
  description: "Keynote stage",
};

describe("venueService.createLocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a blank name", async () => {
    await expect(
      venueService.createLocation(EVENT_ID, { ...locData, name: "   " })
    ).rejects.toThrow("Name is required");
    expect(repo.insertLocation).not.toHaveBeenCalled();
  });

  it("rejects an invalid location_type", async () => {
    await expect(
      venueService.createLocation(EVENT_ID, { ...locData, location_type: "palace" as any })
    ).rejects.toThrow("Invalid location type");
    expect(repo.insertLocation).not.toHaveBeenCalled();
  });

  it("rejects a non-positive capacity", async () => {
    await expect(
      venueService.createLocation(EVENT_ID, { ...locData, capacity: 0 })
    ).rejects.toThrow("Capacity must be");
    await expect(
      venueService.createLocation(EVENT_ID, { ...locData, capacity: -3 })
    ).rejects.toThrow("Capacity must be");
    expect(repo.insertLocation).not.toHaveBeenCalled();
  });

  it("creates a location with valid data", async () => {
    repo.insertLocation.mockResolvedValue(baseLocation);
    const result = await venueService.createLocation(EVENT_ID, locData);
    expect(repo.insertLocation).toHaveBeenCalledWith(EVENT_ID, locData);
    expect(result).toEqual(baseLocation);
  });
});

describe("venueService.updateLocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFound when location does not exist", async () => {
    repo.findLocationById.mockResolvedValue(null);
    await expect(
      venueService.updateLocation(EVENT_ID, "ghost", { name: "X" })
    ).rejects.toThrow("Venue location not found");
    expect(repo.updateLocation).not.toHaveBeenCalled();
  });

  it("rejects invalid location_type on update", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    await expect(
      venueService.updateLocation(EVENT_ID, LOCATION_ID, { location_type: "boat" as any })
    ).rejects.toThrow("Invalid location type");
    expect(repo.updateLocation).not.toHaveBeenCalled();
  });

  it("updates with valid partial data", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.updateLocation.mockResolvedValue({ ...baseLocation, name: "Renamed" });
    const result = await venueService.updateLocation(EVENT_ID, LOCATION_ID, { name: "Renamed" });
    expect(result.name).toBe("Renamed");
  });
});

describe("venueService.listAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes location filter through", async () => {
    repo.listAssignmentsByEvent.mockResolvedValue([baseAssignment]);
    const result = await venueService.listAssignments(EVENT_ID, { location_id: LOCATION_ID });
    expect(repo.listAssignmentsByEvent).toHaveBeenCalledWith(EVENT_ID, { location_id: LOCATION_ID });
    expect(result).toEqual([baseAssignment]);
  });
});

describe("venueService.createAssignment", () => {
  beforeEach(() => vi.clearAllMocks());
  const okRange = {
    venue_location_id: LOCATION_ID,
    assignable_type: "team" as const,
    team_id: "team-2",
    starts_at: "2026-09-01T14:00:00Z",
    ends_at: "2026-09-01T16:00:00Z",
  };

  it("throws NotFound when location does not exist", async () => {
    repo.findLocationById.mockResolvedValue(null);
    await expect(venueService.createAssignment(EVENT_ID, okRange, ACTOR)).rejects.toThrow(
      "Venue location not found"
    );
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("rejects ends_at before starts_at", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    await expect(
      venueService.createAssignment(EVENT_ID, { ...okRange, ends_at: "2026-09-01T13:00:00Z" }, ACTOR)
    ).rejects.toThrow("End time must be after start time");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("rejects a double-booking on the same location with overlap", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.isTeamInEvent.mockResolvedValue(true);
    repo.findConflictingAssignment.mockResolvedValue(baseAssignment);
    // overlaps baseAssignment 10:00-12:00
    await expect(
      venueService.createAssignment(
        EVENT_ID,
        {
          ...okRange,
          starts_at: "2026-09-01T11:00:00Z",
          ends_at: "2026-09-01T13:00:00Z",
        },
        ACTOR
      )
    ).rejects.toThrow("already booked");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("allows adjacent bookings (end == next start)", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.isTeamInEvent.mockResolvedValue(true);
    repo.findConflictingAssignment.mockResolvedValue(null);
    repo.insertAssignment.mockResolvedValue(baseAssignment);
    await venueService.createAssignment(
      EVENT_ID,
      {
        ...okRange,
        starts_at: "2026-09-01T12:00:00Z", // exactly when base ends
        ends_at: "2026-09-01T14:00:00Z",
      },
      ACTOR
    );
    expect(repo.insertAssignment).toHaveBeenCalled();
  });

  it("ignores cancelled assignments during conflict check", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.isTeamInEvent.mockResolvedValue(true);
    repo.findConflictingAssignment.mockResolvedValue(null); // repo filters status=active
    repo.insertAssignment.mockResolvedValue(baseAssignment);
    await venueService.createAssignment(
      EVENT_ID,
      {
        ...okRange,
        starts_at: "2026-09-01T11:00:00Z",
        ends_at: "2026-09-01T13:00:00Z",
      },
      ACTOR
    );
    expect(repo.insertAssignment).toHaveBeenCalled();
  });

  it("allows the same time range on a different location", async () => {
    repo.findLocationById.mockResolvedValue({ ...baseLocation, id: "loc-2" });
    repo.isTeamInEvent.mockResolvedValue(true);
    repo.findConflictingAssignment.mockResolvedValue(null);
    repo.insertAssignment.mockResolvedValue(baseAssignment);
    await venueService.createAssignment(EVENT_ID, { ...okRange, venue_location_id: "loc-2" }, ACTOR);
    expect(repo.findConflictingAssignment).toHaveBeenCalled();
    expect(repo.insertAssignment).toHaveBeenCalled();
  });

  it("requires team_id when assignable_type is team", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    await expect(
      venueService.createAssignment(EVENT_ID, { ...okRange, team_id: undefined }, ACTOR)
    ).rejects.toThrow("team_id is required");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("rejects a team that is not in the event", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.isTeamInEvent.mockResolvedValue(false);
    await expect(venueService.createAssignment(EVENT_ID, okRange, ACTOR)).rejects.toThrow(
      "Team not found in this event"
    );
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("requires project_submission_id when assignable_type is project", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    await expect(
      venueService.createAssignment(
        EVENT_ID,
        { ...okRange, assignable_type: "project", team_id: undefined },
        ACTOR
      )
    ).rejects.toThrow("project_submission_id is required");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("rejects a project that is not in the event", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.isProjectInEvent.mockResolvedValue(false);
    await expect(
      venueService.createAssignment(
        EVENT_ID,
        {
          ...okRange,
          assignable_type: "project",
          team_id: undefined,
          project_submission_id: "proj-x",
        },
        ACTOR
      )
    ).rejects.toThrow("Project not found in this event");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("creates an exhibit assignment without entity ids", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.findConflictingAssignment.mockResolvedValue(null);
    repo.insertAssignment.mockResolvedValue(baseAssignment);
    await venueService.createAssignment(
      EVENT_ID,
      {
        ...okRange,
        assignable_type: "exhibit",
        team_id: undefined,
      },
      ACTOR
    );
    expect(repo.insertAssignment).toHaveBeenCalled();
  });
});

describe("venueService.updateAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFound when assignment does not exist", async () => {
    repo.findAssignmentById.mockResolvedValue(null);
    await expect(
      venueService.updateAssignment(EVENT_ID, "ghost", { starts_at: "2026-09-02T10:00:00Z" })
    ).rejects.toThrow("Venue assignment not found");
    expect(repo.updateAssignment).not.toHaveBeenCalled();
  });

  it("does not conflict with itself when times are unchanged in range", async () => {
    repo.findAssignmentById.mockResolvedValue(baseAssignment);
    repo.findConflictingAssignment.mockResolvedValue(null);
    repo.updateAssignment.mockResolvedValue(baseAssignment);
    await venueService.updateAssignment(EVENT_ID, ASSIGNMENT_ID, {
      starts_at: "2026-09-01T10:30:00Z",
      ends_at: "2026-09-01T11:30:00Z",
    });
    expect(repo.findConflictingAssignment).toHaveBeenCalledWith(
      expect.objectContaining({ excludeId: ASSIGNMENT_ID })
    );
    expect(repo.updateAssignment).toHaveBeenCalled();
  });

  it("rejects moving into another assignment's slot", async () => {
    repo.findAssignmentById.mockResolvedValue(baseAssignment);
    repo.findConflictingAssignment.mockResolvedValue({
      ...baseAssignment,
      id: "asg-other",
    });
    await expect(
      venueService.updateAssignment(EVENT_ID, ASSIGNMENT_ID, {
        starts_at: "2026-09-03T10:00:00Z",
        ends_at: "2026-09-03T12:00:00Z",
      })
    ).rejects.toThrow("already booked");
    expect(repo.updateAssignment).not.toHaveBeenCalled();
  });

  it("validates new range ordering", async () => {
    repo.findAssignmentById.mockResolvedValue(baseAssignment);
    await expect(
      venueService.updateAssignment(EVENT_ID, ASSIGNMENT_ID, {
        starts_at: "2026-09-01T15:00:00Z",
        ends_at: "2026-09-01T14:00:00Z",
      })
    ).rejects.toThrow("End time must be after start time");
    expect(repo.updateAssignment).not.toHaveBeenCalled();
  });
});

describe("venueService.cancelAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFound when assignment does not exist", async () => {
    repo.findAssignmentById.mockResolvedValue(null);
    await expect(venueService.cancelAssignment(EVENT_ID, "ghost")).rejects.toThrow(
      "Venue assignment not found"
    );
    expect(repo.cancelAssignment).not.toHaveBeenCalled();
  });

  it("cancels an existing assignment", async () => {
    repo.findAssignmentById.mockResolvedValue(baseAssignment);
    repo.cancelAssignment.mockResolvedValue({ ...baseAssignment, status: "cancelled" });
    const result = await venueService.cancelAssignment(EVENT_ID, ASSIGNMENT_ID);
    expect(result.status).toBe("cancelled");
  });
});

describe("no-op updates (regression: empty SET clause caused a 500)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateLocation with no recognized fields returns the existing record untouched", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.updateLocation.mockImplementation(async () => {
      throw new Error("UPDATE venue_locations SET  WHERE — SQL syntax error");
    });
    const result = await venueService.updateLocation(EVENT_ID, LOCATION_ID, {} as any);
    expect(result).toEqual(baseLocation);
    expect(repo.updateLocation).not.toHaveBeenCalled();
  });

  it("updateAssignment with no recognized fields returns the existing record untouched", async () => {
    repo.findAssignmentById.mockResolvedValue(baseAssignment);
    repo.findConflictingAssignment.mockResolvedValue(null);
    repo.updateAssignment.mockImplementation(async () => {
      throw new Error("UPDATE venue_assignments SET  WHERE — SQL syntax error");
    });
    const result = await venueService.updateAssignment(EVENT_ID, ASSIGNMENT_ID, {} as any);
    expect(result).toEqual(baseAssignment);
    expect(repo.updateAssignment).not.toHaveBeenCalled();
  });

  it("updateAssignment with only a status still persists the change", async () => {
    repo.findAssignmentById.mockResolvedValue(baseAssignment);
    repo.findConflictingAssignment.mockResolvedValue(null);
    repo.updateAssignment.mockResolvedValue({ ...baseAssignment, status: "cancelled" });
    const result = await venueService.updateAssignment(EVENT_ID, ASSIGNMENT_ID, { status: "cancelled" });
    expect(result.status).toBe("cancelled");
    expect(repo.updateAssignment).toHaveBeenCalledWith(EVENT_ID, ASSIGNMENT_ID, { status: "cancelled" });
  });
});

describe("venueService location positions (map persistence)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts numeric positions on update", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.updateLocation.mockResolvedValue({ ...baseLocation, position_x: 120, position_y: 80 });
    const result = await venueService.updateLocation(EVENT_ID, LOCATION_ID, { position_x: 120, position_y: 80 });
    expect(repo.updateLocation).toHaveBeenCalledWith(EVENT_ID, LOCATION_ID, { position_x: 120, position_y: 80 });
    expect(result.position_x).toBe(120);
  });

  it("rejects non-numeric positions", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    await expect(
      venueService.updateLocation(EVENT_ID, LOCATION_ID, { position_x: "left" as any })
    ).rejects.toThrow("Position must be a number");
    expect(repo.updateLocation).not.toHaveBeenCalled();
  });

  it("accepts null to clear a saved position", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.updateLocation.mockResolvedValue(baseLocation);
    await venueService.updateLocation(EVENT_ID, LOCATION_ID, { position_x: null, position_y: null });
    expect(repo.updateLocation).toHaveBeenCalledWith(EVENT_ID, LOCATION_ID, { position_x: null, position_y: null });
  });
});

describe("venueService.deleteLocation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFound for a missing location", async () => {
    repo.findLocationById.mockResolvedValue(null);
    await expect(venueService.deleteLocation(EVENT_ID, "ghost")).rejects.toThrow("Venue location not found");
    expect(repo.deleteLocation).not.toHaveBeenCalled();
  });

  it("deletes an existing location (assignments cascade)", async () => {
    repo.findLocationById.mockResolvedValue(baseLocation);
    repo.deleteLocation.mockResolvedValue(true);
    await venueService.deleteLocation(EVENT_ID, LOCATION_ID);
    expect(repo.deleteLocation).toHaveBeenCalledWith(EVENT_ID, LOCATION_ID);
  });
});
