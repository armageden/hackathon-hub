import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const useEventRole = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useEventRole", () => ({ useEventRole }));

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

const teamsApi = vi.hoisted(() => ({
  listTeams: vi.fn(),
  createTeam: vi.fn(),
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
  listParticipants: vi.fn(),
  getMyProfile: vi.fn(),
  createOrUpdateProfile: vi.fn(),
  applyToTeam: vi.fn(),
  getTechTags: vi.fn(),
  deleteTeamByAdmin: vi.fn(),
  forceJoinTeam: vi.fn(),
}));

vi.mock("./teams.api", () => teamsApi);

import TeamsPage from "./TeamsPage";

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

const sampleTeam = {
  id: "team-1",
  event_id: "evt-1",
  name: "Bits & Bots",
  description: "We like bits",
  max_size: 4,
  member_count: 1,
  status: "open",
  creator_name: "Alice",
  creator_id: "user-1",
  members: [
    { id: "tm-1", user_id: "user-1", full_name: "Alice", joined_at: new Date().toISOString() },
  ],
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  useEventRole.mockReturnValue(asParticipant);
  teamsApi.listTeams.mockResolvedValue({ teams: [] });
  teamsApi.getMyProfile.mockResolvedValue({ profile: null });
  teamsApi.getTechTags.mockResolvedValue({ tags: [] });
  teamsApi.listParticipants.mockResolvedValue({ participants: [] });
});

describe("TeamsPage", () => {
  it("renders the page heading and Teams tab", async () => {
    render(<TeamsPage />);
    expect(screen.getByRole("heading", { name: /teams/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teams" })).toBeInTheDocument();
    await waitFor(() => expect(teamsApi.listTeams).toHaveBeenCalled());
  });

  it("shows the create-team form on the Teams tab", async () => {
    render(<TeamsPage />);
    expect(await screen.findByText("Create a Team")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  it("shows empty state when no teams exist", async () => {
    render(<TeamsPage />);
    expect(await screen.findByText(/no teams yet/i)).toBeInTheDocument();
  });

  it("renders team cards when teams are returned", async () => {
    teamsApi.listTeams.mockResolvedValue({ teams: [sampleTeam] });
    render(<TeamsPage />);
    expect(await screen.findByText("Bits & Bots")).toBeInTheDocument();
    expect(screen.getByText("1/4 members")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows My Profile tab for participants", () => {
    render(<TeamsPage />);
    expect(screen.getByRole("button", { name: "My Profile" })).toBeInTheDocument();
  });

  it("hides My Profile tab for organizers", () => {
    useEventRole.mockReturnValue(asOrganizer);
    render(<TeamsPage />);
    expect(screen.queryByRole("button", { name: "My Profile" })).not.toBeInTheDocument();
  });

  it("shows Delete and Assign buttons for organizers", async () => {
    useEventRole.mockReturnValue(asOrganizer);
    teamsApi.listTeams.mockResolvedValue({ teams: [sampleTeam] });
    render(<TeamsPage />);
    expect(await screen.findByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ assign/i })).toBeInTheDocument();
  });
});
