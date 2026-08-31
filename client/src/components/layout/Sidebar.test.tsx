import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DemoModeProvider } from "@/app/demo-mode";
import { enableDemoData, disableDemoData } from "@/lib/demo.api";
import { DEMO_EVENT_ID, REAL_EVENT_ID } from "@/lib/event-id";
import { Sidebar } from "./Sidebar";

const mockUser = {
  id: "u1",
  full_name: "Test User",
  email: "test@example.com",
  global_role: "user" as "admin" | "user",
};

vi.mock("@/app/providers", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
  useEvent: () => ({
    eventId: "evt-1",
    events: [],
    loading: false,
    setEventId: vi.fn(),
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/demo.api", () => ({
  enableDemoData: vi.fn().mockResolvedValue({ enabled: true, counts: {} }),
  disableDemoData: vi.fn().mockResolvedValue({ enabled: false }),
}));

function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderSidebar(initialPath?: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <DemoModeProvider>
        <MemoryRouter initialEntries={[initialPath ?? "/"]}>
          <Routes>
            <Route
              path="/events/:eventId/*"
              element={
                <>
                  <Sidebar />
                  <LocationProbe />
                </>
              }
            />
            <Route
              path="*"
              element={
                <>
                  <Sidebar />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </DemoModeProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Sidebar demo mode toggle", () => {
  it("is off by default", () => {
    renderSidebar();

    expect(screen.getByRole("switch", { name: /demo mode/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("turns on and persists when clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const toggle = screen.getByRole("switch", { name: /demo mode/i });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("demo_mode")).toBe("true");
  });

  it("switches back off on a second click", async () => {
    localStorage.setItem("demo_mode", "true");
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(screen.getByRole("switch", { name: /demo mode/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(localStorage.getItem("demo_mode")).toBe("false");
  });

  it("seeds demo data server-side when an admin turns it on", async () => {
    mockUser.global_role = "admin";
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(enableDemoData).toHaveBeenCalledTimes(1);
    expect(disableDemoData).not.toHaveBeenCalled();
    expect(localStorage.getItem("demo_mode")).toBe("true");
  });

  it("purges demo data server-side when an admin turns it off", async () => {
    mockUser.global_role = "admin";
    localStorage.setItem("demo_mode", "true");
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(disableDemoData).toHaveBeenCalledTimes(1);
    expect(enableDemoData).not.toHaveBeenCalled();
    expect(localStorage.getItem("demo_mode")).toBe("false");
  });

  it("does not call the data endpoints for non-admins (view-only switch)", async () => {
    mockUser.global_role = "user";
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));
    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(enableDemoData).not.toHaveBeenCalled();
    expect(disableDemoData).not.toHaveBeenCalled();
    expect(localStorage.getItem("demo_mode")).toBe("false");
  });

  // Regression: toggling demo mode used to change only the selection while
  // staying on the same URL, so ProtectedRoute snapped the selection back to
  // the URL's event and the toggle silently kept showing real-event data.
  it("navigates to the same page under the demo event when toggled on from a real event page", async () => {
    mockUser.global_role = "user";
    const user = userEvent.setup();
    renderSidebar(`/events/${REAL_EVENT_ID}/hardware`);

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      `/events/${DEMO_EVENT_ID}/hardware`
    );
    expect(localStorage.getItem("demo_mode")).toBe("true");
  });

  it("navigates back to the real event page when toggled off from a demo event page", async () => {
    mockUser.global_role = "user";
    localStorage.setItem("demo_mode", "true");
    const user = userEvent.setup();
    renderSidebar(`/events/${DEMO_EVENT_ID}/judging`);

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(screen.getByTestId("pathname")).toHaveTextContent(
      `/events/${REAL_EVENT_ID}/judging`
    );
    expect(localStorage.getItem("demo_mode")).toBe("false");
  });

  it("does not navigate when toggled outside of an event-scoped page", async () => {
    mockUser.global_role = "user";
    const user = userEvent.setup();
    renderSidebar("/events");

    await user.click(screen.getByRole("switch", { name: /demo mode/i }));

    expect(screen.getByTestId("pathname")).toHaveTextContent("/events");
    expect(localStorage.getItem("demo_mode")).toBe("true");
  });
});
