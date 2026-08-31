import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

vi.mock("@/hooks/useEventRole", () => ({
  useEventRole: () => ({
    eventRole: "organizer",
    loading: false,
    isOrganizer: true,
    isVolunteer: false,
    isParticipant: false,
    isJudge: false,
    canManage: true,
  }),
}));

vi.mock("@/components/venue/ScheduleGrid", () => ({
  ScheduleGrid: ({
    onTimeSlotClick,
  }: {
    onTimeSlotClick?: (locationId: string, startTime: Date, endTime: Date) => void;
  }) => (
    <div data-testid="schedule-grid-stub">
      <button
        type="button"
        onClick={() => onTimeSlotClick?.("loc-2", new Date(2026, 7, 24, 1, 0), new Date(2026, 7, 24, 1, 30))}
      >
        slot-loc-2
      </button>
    </div>
  ),
}));

vi.mock("@/components/venue/VenueMap", () => ({
  VenueMap: () => <div data-testid="venue-map-stub" />,
}));

const venueApi = vi.hoisted(() => ({
  listLocations: vi.fn(),
  listAssignments: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  cancelAssignment: vi.fn(),
  deleteLocation: vi.fn(),
}));

vi.mock("./venue.api", () => ({ ...venueApi, default: venueApi }));

vi.mock("../teams/teams.api", () => ({
  listTeams: vi.fn().mockResolvedValue({ teams: [] }),
}));

import VenuePage from "./VenuePage";

const location = {
  id: "loc-1",
  event_id: "evt-1",
  name: "Main Hall Table 1",
  location_type: "table",
  capacity: 4,
  description: null,
  created_at: new Date().toISOString(),
};

const location2 = {
  id: "loc-2",
  event_id: "evt-1",
  name: "Bravo Booth",
  location_type: "booth",
  capacity: 6,
  description: null,
  created_at: new Date().toISOString(),
};

describe("VenuePage", () => {
  it("renders the heading and tabs", async () => {
    venueApi.listLocations.mockResolvedValue([]);
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    expect(screen.getByRole("heading", { name: /venue & logistics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeInTheDocument();
    await waitFor(() => expect(venueApi.listLocations).toHaveBeenCalled());
  });

  it("shows an empty state when no locations exist", async () => {
    venueApi.listLocations.mockResolvedValue([]);
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    expect(await screen.findByText(/no locations yet/i)).toBeInTheDocument();
  });

  it("lists created locations in the Locations tab", async () => {
    venueApi.listLocations.mockResolvedValue([location]);
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    await userEvent.click(await screen.findByRole("button", { name: /locations \(1\)/i }));
    expect(await screen.findByText("Main Hall Table 1")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows organizer controls for managers", async () => {
    venueApi.listLocations.mockResolvedValue([]);
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    expect(await screen.findByRole("button", { name: /new location/i })).toBeInTheDocument();
  });

  it("preselects the clicked slot's location in the New Assignment dialog", async () => {
    venueApi.listLocations.mockResolvedValue([location, location2]);
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    await userEvent.click(await screen.findByRole("button", { name: "slot-loc-2" }));
    expect(screen.getByRole("heading", { name: /new assignment/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bravo Booth (booth)")).toBeInTheDocument();
  });

  it("surfaces an error banner when loading fails", async () => {
    venueApi.listLocations.mockRejectedValue(new Error("Database unavailable"));
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    expect(await screen.findByText(/database unavailable/i)).toBeInTheDocument();
  });
});

describe("VenuePage organizer location management", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers Delete for each location and removes it after confirmation", async () => {
    venueApi.listLocations.mockResolvedValue([
      {
        id: "loc-1",
        event_id: "evt-1",
        name: "Table 1",
        location_type: "table",
        capacity: 4,
        description: null,
        created_at: new Date().toISOString(),
      },
    ]);
    venueApi.listAssignments.mockResolvedValue([]);
    venueApi.deleteLocation.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<VenuePage />);
    await user.click(await screen.findByRole("button", { name: /Locations \(/i }));
    expect(await screen.findByText("Table 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/This removes the location and all of its bookings/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(venueApi.deleteLocation).toHaveBeenCalledWith(
      "e0000000-0000-0000-0000-000000000001",
      "loc-1"
    ));
  });

  it("renders the map with server-saved positions", async () => {
    venueApi.listLocations.mockResolvedValue([
      {
        id: "loc-9",
        event_id: "evt-1",
        name: "Stage Right",
        location_type: "stage",
        capacity: 50,
        description: null,
        position_x: 321,
        position_y: 123,
        created_at: new Date().toISOString(),
      },
    ]);
    venueApi.listAssignments.mockResolvedValue([]);
    render(<VenuePage />);
    const user2 = userEvent.setup();
    await user2.click(await screen.findByRole("button", { name: "Map" }));
    expect(await screen.findByTestId("venue-map-stub")).toBeInTheDocument();
    // Saved positions flow from the API records into the map (no auto-layout fallback needed).
    expect(venueApi.updateLocation).not.toHaveBeenCalled();
  });
});
