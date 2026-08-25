import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useEventRole = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useEventRole", () => ({ useEventRole }));

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

const projectsApi = vi.hoisted(() => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  submitProject: vi.fn(),
  disqualifyProject: vi.fn(),
}));

vi.mock("./projects.api", () => projectsApi);

import ProjectsPage from "./ProjectsPage";

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

const ownDraft = {
  id: "proj-1",
  event_id: "evt-1",
  team_id: "team-1",
  title: "Robot Arm",
  description: "A robotic arm",
  repo_url: null,
  demo_url: null,
  status: "draft",
  submitted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  team_name: "Bits & Bots",
  is_own: true,
};

const otherSubmitted = {
  ...ownDraft,
  id: "proj-2",
  team_id: "team-2",
  title: "Drone Swarm",
  description: null,
  status: "submitted",
  submitted_at: new Date().toISOString(),
  is_own: false,
};

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventRole.mockReturnValue(asParticipant);
  });

  it("renders the page heading", async () => {
    projectsApi.listProjects.mockResolvedValue([]);
    render(<ProjectsPage />);
    expect(screen.getByRole("heading", { name: /projects/i })).toBeInTheDocument();
    await waitFor(() => expect(projectsApi.listProjects).toHaveBeenCalled());
  });

  it("shows the create form to a participant without a project", async () => {
    projectsApi.listProjects.mockResolvedValue([]);
    render(<ProjectsPage />);
    expect(await screen.findByText(/submit your project/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft/i })).toBeDisabled();
  });

  it("prefills the form and offers Submit Final for an own draft", async () => {
    projectsApi.listProjects.mockResolvedValue([ownDraft]);
    render(<ProjectsPage />);
    expect(await screen.findByDisplayValue("Robot Arm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit final/i })).toBeInTheDocument();
  });

  it("shows a read-only panel once submitted", async () => {
    projectsApi.listProjects.mockResolvedValue([{ ...ownDraft, status: "submitted" }]);
    render(<ProjectsPage />);
    expect(await screen.findByTestId("my-submission")).toBeInTheDocument();
    expect(await screen.findByText(/edits are locked/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit final/i })).not.toBeInTheDocument();
  });

  it("lets an organizer disqualify a submission after confirming", async () => {
    useEventRole.mockReturnValue(asOrganizer);
    projectsApi.listProjects.mockResolvedValue([otherSubmitted]);
    projectsApi.disqualifyProject.mockResolvedValue({});
    render(<ProjectsPage />);
    const button = await screen.findByRole("button", { name: /disqualify/i });
    await userEvent.click(button);
    expect(projectsApi.disqualifyProject).not.toHaveBeenCalled();
    const confirm = await screen.findByRole("button", { name: /^disqualify$/i });
    await userEvent.click(confirm);
    await waitFor(() => expect(projectsApi.disqualifyProject).toHaveBeenCalled());
  });

  it("lets a disqualified team start a new submission", async () => {
    useEventRole.mockReturnValue(asParticipant);
    projectsApi.listProjects.mockResolvedValue([{ ...ownDraft, status: "disqualified" }]);
    render(<ProjectsPage />);
    expect(await screen.findByText(/was disqualified by an organizer/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create draft/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit final/i })).not.toBeInTheDocument();
  });

  it("surfaces an error banner when loading fails", async () => {
    projectsApi.listProjects.mockRejectedValue(new Error("Database unavailable"));
    render(<ProjectsPage />);
    expect(await screen.findByText(/database unavailable/i)).toBeInTheDocument();
  });
});
