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
  listProjectScores: vi.fn(),
  updateScore: vi.fn(),
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

describe("JudgingPage organizer score management", () => {
  const asOrganizer = {
    eventRole: "organizer",
    loading: false,
    isOrganizer: true,
    isVolunteer: false,
    isParticipant: false,
    isJudge: false,
    canManage: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    judgingApi.getLeaderboard.mockResolvedValue([]);
    judgingApi.listScorableProjects.mockResolvedValue([scorable]);
    judgingApi.listProjectScores.mockResolvedValue([]);
    judgingApi.updateScore.mockResolvedValue({});
    useEventRole.mockReturnValue(asOrganizer);
  });

  it("shows the Scores action for organizers in the score queue", async () => {
    render(<JudgingPage />);
    expect(await screen.findByRole("button", { name: /scores/i })).toBeInTheDocument();
  });

  it("lists a project's judge scores with judge names and an Edit action", async () => {
    judgingApi.listProjectScores.mockResolvedValue([
      {
        id: "score-1",
        project_submission_id: "proj-1",
        judge_user_id: "j1",
        judge_name: "Judge One",
        score_total: "75.00",
        score_innovation: 80,
        score_technical: 70,
        score_presentation: 90,
        score_usefulness: 60,
        feedback: "Solid build",
      },
    ]);
    const user = userEvent.setup();
    render(<JudgingPage />);
    await user.click(await screen.findByRole("button", { name: /scores/i }));
    expect(await screen.findByText("Judge One")).toBeInTheDocument();
    expect(screen.getByText("Solid build")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("saves an organizer edit through updateScore with the score id", async () => {
    judgingApi.listProjectScores.mockResolvedValue([
      {
        id: "score-1",
        project_submission_id: "proj-1",
        judge_user_id: "j1",
        judge_name: "Judge One",
        score_total: "75.00",
        score_innovation: 80,
        score_technical: 70,
        score_presentation: 90,
        score_usefulness: 60,
      },
    ]);
    const user = userEvent.setup();
    render(<JudgingPage />);
    await user.click(await screen.findByRole("button", { name: /scores/i }));
    await user.click(await screen.findByRole("button", { name: "Edit" }));

    // The score dialog opens pre-filled in edit mode; Innovation is the first input.
    const innovation = screen.getAllByPlaceholderText("0–100")[0];
    await user.clear(innovation);
    await user.type(innovation, "100");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(judgingApi.updateScore).toHaveBeenCalled());
    expect(judgingApi.updateScore).toHaveBeenCalledWith(
      "e0000000-0000-0000-0000-000000000001",
      "score-1",
      expect.objectContaining({ score_innovation: 100, score_technical: 70 })
    );
    expect(judgingApi.submitScore).not.toHaveBeenCalled();
  });
});
