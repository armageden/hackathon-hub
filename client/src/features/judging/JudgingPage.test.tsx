import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useEventRole = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useEventRole", () => ({ useEventRole }));

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

const judgingApi = vi.hoisted(() => ({
  listScorableProjects: vi.fn(),
  submitScore: vi.fn(),
  getLeaderboard: vi.fn(),
}));

vi.mock("./judging.api", () => judgingApi);

import JudgingPage from "./JudgingPage";

const asJudge = {
  eventRole: "judge",
  loading: false,
  isOrganizer: false,
  isVolunteer: false,
  isParticipant: false,
  isJudge: true,
  canManage: false,
};

const asParticipant = {
  eventRole: "participant",
  loading: false,
  isOrganizer: false,
  isVolunteer: false,
  isParticipant: true,
  isJudge: false,
  canManage: false,
};

const scorable = {
  id: "proj-1",
  event_id: "evt-1",
  team_id: "team-1",
  title: "Robot Arm",
  description: null,
  repo_url: null,
  demo_url: null,
  status: "submitted",
  submitted_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  team_name: "Bits & Bots",
};

const boardEntry = {
  project_submission_id: "proj-1",
  project_title: "Robot Arm",
  team_name: "Bits & Bots",
  team_id: "team-1",
  scores: {
    innovation: 80,
    technical: 70,
    presentation: 90,
    usefulness: 60,
    total: 75,
  },
  judge_count: 2,
  rank: 1,
};

describe("JudgingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    judgingApi.getLeaderboard.mockResolvedValue([]);
    judgingApi.listScorableProjects.mockResolvedValue([]);
    useEventRole.mockReturnValue(asJudge);
  });

  it("renders the heading and tabs", async () => {
    render(<JudgingPage />);
    expect(screen.getByRole("heading", { name: /judging/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leaderboard/i })).toBeInTheDocument();
    await waitFor(() => expect(judgingApi.getLeaderboard).toHaveBeenCalled());
  });

  it("defaults judges to the score queue with scorable projects", async () => {
    judgingApi.listScorableProjects.mockResolvedValue([scorable]);
    render(<JudgingPage />);
    expect(
      await screen.findByRole("button", { name: /score queue \(1\)/i })
    ).toBeInTheDocument();
    expect(await screen.findByText("Robot Arm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^score$/i })).toBeInTheDocument();
  });

  it("shows the ranked leaderboard for participants", async () => {
    useEventRole.mockReturnValue(asParticipant);
    judgingApi.getLeaderboard.mockResolvedValue([boardEntry]);
    render(<JudgingPage />);
    expect(await screen.findByText("Bits & Bots")).toBeInTheDocument();
    expect(await screen.findByText("75")).toBeInTheDocument();
    expect(judgingApi.listScorableProjects).not.toHaveBeenCalled();
  });

  it("shows an empty-state message before any scores exist", async () => {
    useEventRole.mockReturnValue(asParticipant);
    render(<JudgingPage />);
    expect(
      await screen.findByText(/leaderboard appears once judges start scoring/i)
    ).toBeInTheDocument();
  });

  it("opens the score dialog with four dimension inputs", async () => {
    judgingApi.listScorableProjects.mockResolvedValue([scorable]);
    render(<JudgingPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^score$/i }));
    expect(
      await screen.findByRole("heading", { name: /score .robot arm./i })
    ).toBeInTheDocument();
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(4);
  });
});
