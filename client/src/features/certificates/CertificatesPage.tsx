import { useState, useEffect, useCallback } from "react";
import {
  listCertificates,
  checkEligibility,
  issueCertificate,
  revokeCertificate,
  bulkCreateAttendance,
} from "./certificates.api";
import type { Certificate, EligibilityEntry } from "./certificates.types";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatDateTime } from "@/lib/formatters";

type Tab = "certificates" | "eligibility";

// Dark-theme chips matching the itinerary/check-in badge palette
const CERT_TYPE_COLORS: Record<string, string> = {
  attendance: "bg-green-500/20 text-green-400 border border-green-500/30",
  completion: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  volunteer: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  judge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  eligible: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  issued: "bg-green-500/20 text-green-400 border border-green-500/30",
  revoked: "bg-red-500/20 text-red-400 border border-red-500/30",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function CheckIcon() {
  return <span className="text-green-400 text-lg">&#10003;</span>;
}

function XIcon() {
  return <span className="text-red-400 text-lg">&#10007;</span>;
}

export default function CertificatesPage() {
  const EVENT_ID = useScopedEventId();
  const { isOrganizer, loading: roleLoading } = useEventRole(EVENT_ID);
  const [activeTab, setActiveTab] = useState<Tab>("certificates");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueUserId, setIssueUserId] = useState("");
  const [issueType, setIssueType] = useState("attendance");
  const [issueLoading, setIssueLoading] = useState(false);

  const [bulkLoading, setBulkLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCertificates(EVENT_ID);
      setCertificates(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEligibility = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkEligibility(EVENT_ID);
      setEligibility(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load eligibility");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleLoading) return;
    if (activeTab === "certificates") {
      fetchCertificates();
    } else {
      fetchEligibility();
    }
  }, [activeTab, fetchCertificates, fetchEligibility, roleLoading]);

  async function handleIssue() {
    if (!issueUserId.trim()) return;
    setIssueLoading(true);
    try {
      await issueCertificate(issueUserId.trim(), issueType);
      setShowIssueForm(false);
      setIssueUserId("");
      setIssueType("attendance");
      fetchCertificates();
    } catch (err: any) {
      setError(err?.message || "Failed to issue certificate");
    } finally {
      setIssueLoading(false);
    }
  }

  async function handleRevoke(certId: string) {
    setRevokingId(certId);
    try {
      await revokeCertificate(certId);
      fetchCertificates();
    } catch (err: any) {
      setError(err?.message || "Failed to revoke certificate");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleBulkAttendance() {
    setBulkLoading(true);
    try {
      await bulkCreateAttendance(EVENT_ID);
      fetchCertificates();
    } catch (err: any) {
      setError(err?.message || "Failed to bulk issue attendance certificates");
    } finally {
      setBulkLoading(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    return formatDateTime(dateStr);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Certificates</h1>
          <p className="mt-1 text-sm text-gray-400">Manage certificates and check participant eligibility</p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-gray-900 p-1">
          <button
            onClick={() => setActiveTab("certificates")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "certificates"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Certificates
          </button>
          <button
            onClick={() => setActiveTab("eligibility")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "eligibility"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Eligibility
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="rounded-lg bg-gray-900 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">All Certificates</h2>
              {isOrganizer && (
                <div className="flex gap-3">
                  <button
                    onClick={handleBulkAttendance}
                    disabled={bulkLoading}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {bulkLoading ? "Processing..." : "Bulk Issue Attendance"}
                  </button>
                  <button
                    onClick={() => setShowIssueForm(true)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                  >
                    Issue Certificate
                  </button>
                </div>
              )}
            </div>

            {showIssueForm && isOrganizer && (
              <div className="border-b border-gray-800 bg-gray-800/50 px-6 py-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="mb-1 block text-sm font-medium text-gray-400">User ID</label>
                    <input
                      type="text"
                      value={issueUserId}
                      onChange={(e) => setIssueUserId(e.target.value)}
                      placeholder="Enter user ID"
                      className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="min-w-[180px]">
                    <label className="mb-1 block text-sm font-medium text-gray-400">Certificate Type</label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="attendance">Attendance</option>
                      <option value="completion">Completion</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="judge">Judge</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleIssue}
                      disabled={issueLoading || !issueUserId.trim()}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {issueLoading ? "Issuing..." : "Issue"}
                    </button>
                    <button
                      onClick={() => {
                        setShowIssueForm(false);
                        setIssueUserId("");
                        setIssueType("attendance");
                      }}
                      className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-400">Loading certificates...</div>
              </div>
            ) : certificates.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">No certificates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Issued Date</th>
                      <th className="px-6 py-3 font-medium">Verification Code</th>
                      {isOrganizer && <th className="px-6 py-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-3 text-white">{cert.full_name}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-gray-300">{cert.email}</td>
                        <td className="whitespace-nowrap px-6 py-3">
                          <Badge className={CERT_TYPE_COLORS[cert.certificate_type] || "bg-gray-500/20 text-gray-400 border border-gray-500/30"}>
                            {cert.certificate_type}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3">
                          <Badge className={STATUS_COLORS[cert.status] || "bg-gray-500/20 text-gray-400 border border-gray-500/30"}>
                            {cert.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-gray-300">{formatDate(cert.issued_at)}</td>
                        <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-400">
                          {cert.verification_code || "---"}
                        </td>
                        {isOrganizer && (
                          <td className="whitespace-nowrap px-6 py-3">
                            {cert.status === "issued" && (
                              <button
                                onClick={() => handleRevoke(cert.id)}
                                disabled={revokingId === cert.id}
                                className="rounded-md bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/20 disabled:opacity-50"
                              >
                                {revokingId === cert.id ? "Revoking..." : "Revoke"}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "eligibility" && (
          <div className="rounded-lg bg-gray-900 shadow-lg">
            <div className="border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Participant Eligibility</h2>
              <p className="mt-1 text-sm text-gray-400">
                Check which participants are eligible for certificates
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-gray-400">Loading eligibility data...</div>
              </div>
            ) : eligibility.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">No participants found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium text-center">Check-in</th>
                      <th className="px-6 py-3 font-medium text-center">Team</th>
                      <th className="px-6 py-3 font-medium text-center">Project</th>
                      <th className="px-6 py-3 font-medium text-center">Eligible</th>
                      <th className="px-6 py-3 font-medium text-center">Already Certified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {eligibility.map((entry) => (
                      <tr key={entry.user_id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-3 text-white">{entry.full_name}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-gray-300">{entry.email}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-center">
                          {entry.has_checkin ? <CheckIcon /> : <XIcon />}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-center">
                          {entry.has_team ? <CheckIcon /> : <XIcon />}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-center">
                          {entry.has_project ? <CheckIcon /> : <XIcon />}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-center">
                          {entry.eligible ? <CheckIcon /> : <XIcon />}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-center">
                          {entry.already_certified ? <CheckIcon /> : <XIcon />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
