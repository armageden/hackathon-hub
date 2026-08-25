import { useEffect, useState } from "react";
import type { Checkin, CheckinStats } from "./checkin.types";
import {
  listCheckins,
  manualCheckin,
  qrCheckin,
  generateQRToken,
  getCheckinStats,
} from "./checkin.api";
import { listItinerary } from "../itinerary/itinerary.api";
import type { ItineraryItem } from "../itinerary/itinerary.types";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatDateTime } from "@/lib/formatters";

export default function CheckinPage() {
  const EVENT_ID = useScopedEventId();
  const { canManage, canCheckIn, loading: roleLoading } = useEventRole(EVENT_ID);
  const [activeTab, setActiveTab] = useState<"checkins" | "qr">("checkins");

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [manualUserId, setManualUserId] = useState("");
  const [manualItineraryId, setManualItineraryId] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");

  const [qrToken, setQrToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrCheckinError, setQrCheckinError] = useState("");
  const [qrCheckinSuccess, setQrCheckinSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      // Stats are organizer-only server-side; requesting them as another role
      // 403s and would blank the whole page via Promise.all rejection.
      const [checkinData, statsData, itinData] = await Promise.all([
        listCheckins(EVENT_ID),
        canManage ? getCheckinStats(EVENT_ID) : Promise.resolve(null),
        listItinerary(EVENT_ID),
      ]);
      setCheckins(checkinData);
      setStats(statsData);
      setItineraryItems(itinData);
    } catch (err) {
      console.error("Failed to load check-in data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!roleLoading) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, canManage]);

  async function handleManualCheckin(e: React.FormEvent) {
    e.preventDefault();
    setManualError("");
    setManualSuccess("");

    if (!manualUserId.trim()) {
      setManualError("User ID is required.");
      return;
    }

    try {
      await manualCheckin(
        EVENT_ID,
        manualUserId.trim(),
        manualItineraryId || undefined
      );
      setManualSuccess("Check-in successful!");
      setManualUserId("");
      setManualItineraryId("");
      loadData();
    } catch (err) {
      console.error("Manual check-in failed", err);
      setManualError("Check-in failed. Please try again.");
    }
  }

  async function handleGenerateToken() {
    setQrGenerating(true);
    try {
      const result = await generateQRToken(EVENT_ID);
      setGeneratedToken(result.token);
    } catch (err) {
      console.error("Failed to generate QR token", err);
    } finally {
      setQrGenerating(false);
    }
  }

  async function handleQRCheckin(e: React.FormEvent) {
    e.preventDefault();
    setQrCheckinError("");
    setQrCheckinSuccess("");

    if (!qrToken.trim()) {
      setQrCheckinError("Token is required.");
      return;
    }

    try {
      await qrCheckin(EVENT_ID, qrToken.trim());
      setQrCheckinSuccess("QR check-in successful!");
      setQrToken("");
      loadData();
    } catch (err) {
      console.error("QR check-in failed", err);
      setQrCheckinError("Invalid or expired token.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Check-in Management</h1>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mb-8 w-fit">
          <button
            onClick={() => setActiveTab("checkins")}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "checkins"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Check-ins
          </button>
          {canCheckIn && (
            <button
              onClick={() => setActiveTab("qr")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "qr"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              QR Code
            </button>
          )}
        </div>

        {loading || roleLoading ? (
          <div className="text-center text-gray-500 py-12">Loading check-in data...</div>
        ) : activeTab === "checkins" ? (
          <div className="space-y-6">
            {canManage && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-gray-100">{stats.total_checkins}</p>
                  <p className="text-sm text-gray-400 mt-1">Total Check-ins</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-gray-100">{stats.unique_users}</p>
                  <p className="text-sm text-gray-400 mt-1">Unique Users</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{stats.qr_checkins}</p>
                  <p className="text-sm text-gray-400 mt-1">QR Check-ins</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-orange-400">{stats.manual_checkins}</p>
                  <p className="text-sm text-gray-400 mt-1">Manual Check-ins</p>
                </div>
              </div>
            )}

            {canCheckIn && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4">Manual Check-in</h2>

                {manualError && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
                    {manualError}
                  </p>
                )}
                {manualSuccess && (
                  <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">
                    {manualSuccess}
                  </p>
                )}

                <form onSubmit={handleManualCheckin} className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={manualUserId}
                    onChange={(e) => setManualUserId(e.target.value)}
                    placeholder="User ID"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <select
                    value={manualItineraryId}
                    onChange={(e) => setManualItineraryId(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">All sessions</option>
                    {itineraryItems
                      .filter((item) => item.status === "active")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
                  >
                    Check In
                  </button>
                </form>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">
                  {canCheckIn ? "All Check-ins" : "My Check-ins"}
                </h2>
              </div>
              {checkins.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No check-ins yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="text-left px-5 py-3 font-medium">Name</th>
                        <th className="text-left px-5 py-3 font-medium">Email</th>
                        <th className="text-left px-5 py-3 font-medium">Method</th>
                        <th className="text-left px-5 py-3 font-medium">Session</th>
                        <th className="text-left px-5 py-3 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkins.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-5 py-3 text-gray-100">{c.full_name}</td>
                          <td className="px-5 py-3 text-gray-400">{c.email}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                c.method === "qr"
                                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                  : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              }`}
                            >
                              {c.method}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400">
                            {c.session_title || "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {formatDateTime(c.checked_in_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">Generate QR Token</h2>
              <button
                onClick={handleGenerateToken}
                disabled={qrGenerating}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {qrGenerating ? "Generating..." : "Generate Token"}
              </button>
              {generatedToken && (
                <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Generated Token:</p>
                  <code className="block text-sm text-green-400 break-all font-mono">
                    {generatedToken}
                  </code>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">QR Check-in</h2>

              {qrCheckinError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
                  {qrCheckinError}
                </p>
              )}
              {qrCheckinSuccess && (
                <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">
                  {qrCheckinSuccess}
                </p>
              )}

              <form onSubmit={handleQRCheckin} className="flex gap-3">
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="Paste QR token here"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
