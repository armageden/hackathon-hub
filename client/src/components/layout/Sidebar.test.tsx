import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const mockUser = {
  id: "u1",
  full_name: "Test User",
  email: "test@example.com",
  global_role: "user" as "admin" | "user",
};

vi.mock("@/app/providers", () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
  useEvent: () => ({
    eventId: "evt-1",
    events: [],
    loading: false,
    setEventId: vi.fn(),
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/features/notifications/notifications.api", () => ({
  getUnreadCount: vi.fn().mockResolvedValue(3),
}));

function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderSidebar(initialPath?: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath ?? "/"]}>
      <Routes>
        <Route path="/events/:eventId/*" element={<><Sidebar /><LocationProbe /></>} />
        <Route path="*" element={<><Sidebar /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Sidebar", () => {
  it("renders the main navigation links", () => {
    renderSidebar("/events/evt-1/dashboard");

    expect(screen.getByRole("link", { name: /hardware/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /notifications/i })).toBeInTheDocument();
  });

  it("shows the unread notifications badge when there are unread notifications", async () => {
    renderSidebar("/events/evt-1/dashboard");

    expect(await screen.findByTestId("unread-badge")).toBeInTheDocument();
  });

  it("does not show the unread badge when there are no unread notifications", async () => {
    const { getUnreadCount } = await import("@/features/notifications/notifications.api");
    (getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    renderSidebar("/events/evt-1/dashboard");

    expect(screen.queryByTestId("unread-badge")).not.toBeInTheDocument();
  });
});