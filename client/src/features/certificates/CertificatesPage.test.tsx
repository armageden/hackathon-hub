import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const useEventRole = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useEventRole", () => ({ useEventRole }));

vi.mock("@/app/providers", () => ({
  useScopedEventId: () => "e0000000-0000-0000-0000-000000000001",
}));

const certificatesApi = vi.hoisted(() => ({
  listCertificates: vi.fn(),
  checkEligibility: vi.fn(),
  issueCertificate: vi.fn(),
  revokeCertificate: vi.fn(),
  bulkCreateAttendance: vi.fn(),
}));

vi.mock("./certificates.api", () => certificatesApi);

// PDFDownloadLink is a web-only API and throws in jsdom; render a plain anchor
// instead so test rows (and the Revoke action) render in the Node test env.
// CertificatePDF also touches Font.register / StyleSheet.create at module load,
// so stub every export the module graph uses.
vi.mock("@react-pdf/renderer", async () => {
  const React = await import("react");
  const stub = () => null;
  return {
    Font: { register: () => {} },
    StyleSheet: { create: (s: unknown) => s },
    Document: stub,
    Page: stub,
    Text: stub,
    View: stub,
    PDFDownloadLink: ({ children }: { children: unknown }) =>
      React.createElement(
        "a",
        { href: "#", "data-testid": "pdf-download-link" },
        typeof children === "function"
          ? (children as (p: { loading: boolean }) => React.ReactNode)({ loading: false })
          : (children as React.ReactNode)
      ),
  };
});

import CertificatesPage from "./CertificatesPage";

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

const sampleCert = {
  id: "cert-1",
  event_id: "evt-1",
  user_id: "user-1",
  full_name: "Alice",
  email: "alice@example.com",
  certificate_type: "attendance",
  status: "issued",
  issued_at: "2026-08-24T12:00:00Z",
  revoked_at: null,
  verification_code: "ABC123",
};

const sampleEligibility = {
  user_id: "user-2",
  full_name: "Bob",
  email: "bob@example.com",
  has_checkin: true,
  has_team: true,
  has_project: false,
  eligible: false,
  already_certified: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useEventRole.mockReturnValue(asParticipant);
  certificatesApi.listCertificates.mockResolvedValue([]);
  certificatesApi.checkEligibility.mockResolvedValue([]);
});

describe("CertificatesPage", () => {
  it("renders the page heading and tabs", async () => {
    render(<CertificatesPage />);
    expect(screen.getByRole("heading", { name: "Certificates", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Certificates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eligibility" })).toBeInTheDocument();
    await waitFor(() => expect(certificatesApi.listCertificates).toHaveBeenCalled());
  });

  it("shows empty state when no certificates exist", async () => {
    render(<CertificatesPage />);
    expect(await screen.findByText(/no certificates found/i)).toBeInTheDocument();
  });

  it("renders certificate rows when data is returned", async () => {
    certificatesApi.listCertificates.mockResolvedValue([sampleCert]);
    render(<CertificatesPage />);
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Issued")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("shows Issue Certificate and Bulk Issue buttons for organizers", async () => {
    useEventRole.mockReturnValue(asOrganizer);
    render(<CertificatesPage />);
    expect(await screen.findByRole("button", { name: /issue certificate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bulk issue attendance/i })).toBeInTheDocument();
  });

  it("hides admin buttons for participants", async () => {
    render(<CertificatesPage />);
    await screen.findByText(/no certificates found/i);
    expect(screen.queryByRole("button", { name: /issue certificate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bulk issue attendance/i })).not.toBeInTheDocument();
  });

  it("shows eligibility data on the Eligibility tab", async () => {
    certificatesApi.checkEligibility.mockResolvedValue([sampleEligibility]);
    render(<CertificatesPage />);
    const eligTab = screen.getByRole("button", { name: "Eligibility" });
    await screen.findByText(/no certificates found/i);
    fireEvent.click(eligTab);
    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(certificatesApi.checkEligibility).toHaveBeenCalled();
  });

  it("shows Revoke button for issued certificates (organizer only)", async () => {
    useEventRole.mockReturnValue(asOrganizer);
    certificatesApi.listCertificates.mockResolvedValue([sampleCert]);
    render(<CertificatesPage />);
    expect(await screen.findByRole("button", { name: /revoke/i })).toBeInTheDocument();
  });
});
