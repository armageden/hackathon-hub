import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import DashboardPage from "./DashboardPage";

// Mock providers wholesale (client test convention) — but give
// useScopedEventId its real behavior (URL param wins) so this test pins down
// exactly the rule that was violated: DashboardPage must follow the URL, not
// the context selection.
vi.mock("@/app/providers", async () => {
  const { useParams } = await import("react-router-dom");
  return {
    useAuth: () => ({
      user: {
        full_name: "Test User",
        email: "test@example.com",
        global_role: "user",
        created_at: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    }),
    useEvent: () => ({
      // Deliberately different from the URL's event id.
      eventId: "context-event-id",
      events: [],
      loading: false,
      setEventId: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined),
    }),
    useScopedEventId: () => {
      const { eventId } = useParams();
      return eventId ?? "context-event-id";
    },
  };
});

function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/events/:eventId/dashboard"
          element={
            <>
              <DashboardPage />
              <LocationProbe />
            </>
          }
        />
        {/* Navigation away (e.g. quick action click) unmounts the dashboard;
            keep the probe mounted so we can observe the resulting URL. */}
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DashboardPage", () => {
  // Regression: the page used to read the event from context, so quick
  // actions could point at a different event than the URL (and the data
  // shown by ProtectedRoute-validated pages) during demo-mode toggles.
  it("builds quick action links from the URL's event, not the context selection", async () => {
    const user = userEvent.setup();
    renderAt("/events/url-event-id/dashboard");

    await user.click(screen.getByRole("button", { name: /teams/i }));

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      "/events/url-event-id/team"
    );
  });
});
