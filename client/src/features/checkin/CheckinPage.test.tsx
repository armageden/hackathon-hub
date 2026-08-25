import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useEventRole = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useEventRole", () => ({ useEventRole }));

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

const checkinApi = vi.hoisted(() => ({
  listCheckins: vi.fn(),
  manualCheckin: vi.fn(),
  qrCheckin: vi.fn(),
  generateQRToken: vi.fn(),
  getCheckinStats: vi.fn(),
}));
vi.mock("./checkin.api", () => checkinApi);

const itineraryApi = vi.hoisted(() => ({
  listItinerary: vi.fn(),
}));
vi.mock("../itinerary/itinerary.api", () => itineraryApi);

import CheckinPage from "./CheckinPage";

const asVolunteer = {
  eventRole: "volunteer",
  loading: false,
  isOrganizer: false,
  isVolunteer: true,
  isParticipant: false,
  isJudge: false,
  canManage: false,
  canCheckIn: true,
};

const asOrganizer = {
  ...asVolunteer,
  eventRole: "organizer",
  isOrganizer: true,
  isVolunteer: false,
  canManage: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  checkinApi.listCheckins.mockResolvedValue([]);
  itineraryApi.listItinerary.mockResolvedValue([]);
  checkinApi.getCheckinStats.mockResolvedValue({
    total_checkins: 0,
    unique_users: 0,
    qr_checkins: 0,
    manual_checkins: 0,
  });
});

describe("CheckinPage role gating", () => {
  it("shows volunteers the check-in tools without fetching organizer-only stats", async () => {
    useEventRole.mockReturnValue(asVolunteer);
    render(<CheckinPage />);

    expect(await screen.findByText("Manual Check-in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "QR Code" })).toBeInTheDocument();
    expect(checkinApi.getCheckinStats).not.toHaveBeenCalled();
    expect(checkinApi.listCheckins).toHaveBeenCalledTimes(1);
  });

  it("still loads stats for organizers", async () => {
    useEventRole.mockReturnValue(asOrganizer);
    render(<CheckinPage />);

    expect(await screen.findByText(/total check-ins/i)).toBeInTheDocument();
    expect(checkinApi.getCheckinStats).toHaveBeenCalledTimes(1);
  });
});
