import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const useEventRole = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useEventRole", () => ({ useEventRole }));

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

const itineraryApi = vi.hoisted(() => ({
  listItinerary: vi.fn(),
  createItinerary: vi.fn(),
  updateItinerary: vi.fn(),
}));

vi.mock("./itinerary.api", () => itineraryApi);

import ItineraryPage from "./ItineraryPage";

const asParticipant = {
  eventRole: "participant",
  loading: false,
  isOrganizer: false,
  isVolunteer: false,
  isParticipant: true,
  isJudge: false,
  canManage: false,
};

const asOrganizer = {
  ...asParticipant,
  eventRole: "organizer",
  isOrganizer: true,
  isParticipant: false,
  canManage: true,
};

const sampleItem = {
  id: "item-1",
  event_id: "evt-1",
  title: "Opening Ceremony",
  description: "Welcome everyone",
  location: "Main Hall",
  starts_at: "2026-08-24T09:00:00Z",
  ends_at: "2026-08-24T10:00:00Z",
  session_type: "ceremony",
  status: "active",
  created_at: "2026-08-24T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  useEventRole.mockReturnValue(asParticipant);
  itineraryApi.listItinerary.mockResolvedValue([]);
});

describe("ItineraryPage", () => {
  it("renders the page heading", async () => {
    render(<ItineraryPage />);
    expect(screen.getByRole("heading", { name: /schedule/i })).toBeInTheDocument();
    await waitFor(() => expect(itineraryApi.listItinerary).toHaveBeenCalled());
  });

  it("shows empty state when no items exist", async () => {
    render(<ItineraryPage />);
    expect(await screen.findByText(/no sessions scheduled yet/i)).toBeInTheDocument();
  });

  it("renders itinerary items sorted by start time", async () => {
    const lateItem = { ...sampleItem, id: "item-2", title: "Closing", starts_at: "2026-08-24T18:00:00Z", ends_at: "2026-08-24T19:00:00Z" };
    itineraryApi.listItinerary.mockResolvedValue([lateItem, sampleItem]);
    render(<ItineraryPage />);
    const opening = await screen.findByText("Opening Ceremony");
    const closing = screen.getByText("Closing");
    expect(closing).toBeInTheDocument();
    // Opening starts earlier than Closing, so it must appear first in the DOM.
    expect(opening.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows Add Item button for organizers only", () => {
    useEventRole.mockReturnValue(asOrganizer);
    render(<ItineraryPage />);
    expect(screen.getByRole("button", { name: /add session/i })).toBeInTheDocument();
  });

  it("hides Add Item button for participants", () => {
    render(<ItineraryPage />);
    expect(screen.queryByRole("button", { name: /add session/i })).not.toBeInTheDocument();
  });

  it("shows Cancel button on items for organizers", async () => {
    useEventRole.mockReturnValue(asOrganizer);
    itineraryApi.listItinerary.mockResolvedValue([sampleItem]);
    render(<ItineraryPage />);
    expect(await screen.findByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("hides Cancel button on items for participants", async () => {
    itineraryApi.listItinerary.mockResolvedValue([sampleItem]);
    render(<ItineraryPage />);
    expect(await screen.findByText("Opening Ceremony")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });
});
