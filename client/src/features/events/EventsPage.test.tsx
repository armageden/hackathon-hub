import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EventsPage from "./EventsPage";
import { useAuth, useEvent } from "@/app/providers";

// Client test convention: mock providers wholesale.
vi.mock("@/app/providers", () => ({
  useAuth: vi.fn(),
  useEvent: vi.fn(),
}));

const mockUseEvent = vi.mocked(useEvent);
const mockUseAuth = vi.mocked(useAuth);

// Full AuthContextType so mockReturnValue type-checks without casts.
function mockAuthWith(global_role: "admin" | "user") {
  mockUseAuth.mockReturnValue({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      full_name: global_role === "admin" ? "Admin User" : "Plain User",
      email: `${global_role}@example.com`,
      global_role,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    token: "test-token",
    setAuth: vi.fn(),
    loading: false,
    logout: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>
  );
}

// Regression: event creation is admin-only (server: POST /events now requires
// the global admin role). The UI must not offer create affordances to
// non-admins; temporary admins pass through the same global_role check.
describe("EventsPage create-event gating", () => {
  beforeEach(() => {
    mockUseEvent.mockReturnValue({
      events: [],
      loading: false,
      setEventId: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined),
      eventId: null,
    });
  });

  it("hides create affordances from non-admin users", () => {
    mockAuthWith("user");

    renderPage();

    expect(screen.queryByRole("button", { name: /create event/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/a platform admin can create an event/i)
    ).toBeInTheDocument();
  });

  it("shows create affordances to admins", () => {
    mockAuthWith("admin");

    renderPage();

    expect(screen.getByRole("button", { name: /create event/i })).toBeInTheDocument();
  });
});
