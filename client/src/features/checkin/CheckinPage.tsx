import { useEffect, useState } from "react";
import type { Checkin, CheckinStats } from "./checkin.types";
import {
  listCheckins,
  manualCheckin,
  qrCheckin,
  generateQRToken,
  getCheckinStats,
  bulkCheckin,
  checkout,
} from "./checkin.api";
import { listItinerary } from "../itinerary/itinerary.api";
import type { ItineraryItem } from "../itinerary/itinerary.types";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatDateTime } from "@/lib/formatters";

export default function CheckinPage() {
  const EVENT_ID = useScopedEventId();
  const { canManage, canCheckIn, loading: roleLoading } = useEventRole(EVENT_ID);
  const [activeTab, setActiveTab] = useState<"checkins" | "qr" | "analytics">("checkins");

  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [manualUserId, setManualUserId] = useState("");
  const [manualItineraryId, setManualItineraryId] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");

  const [bulkItineraryId, setBulkItineraryId] = useState("");
  const [bulkUserIds, setBulkUserIds] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [qrToken, setQrToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrCheckinError, setQrCheckinError] = useState("");
  const [qrCheckinSuccess, setQrCheckinSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    try {
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
      await manualCheckin(EVENT_ID, manualUserId.trim(), manualItineraryId || undefined);
      setManualSuccess("Check-in successful!");
      setManualUserId("");
      setManualItineraryId("");
      loadData();
    } catch (err) {
      console.error("Manual check-in failed", err);
      setManualError("Check-in failed. Please try again.");
    }
  }

  async function handleBulkCheckin(e: React.FormEvent) {
    e.preventDefault();
    setBulkError("");
    setBulkSuccess("");

    if (!bulkItineraryId) {
      setBulkError("Please select a session.");
      return;
    }

    const userIds = bulkUserIds
      .split("\n")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (userIds.length === 0) {
      setBulkError("Please enter at least one User ID.");
      return;
    }

    setBulkLoading(true);
    try {
      const result = await bulkCheckin(EVENT_ID, userIds, bulkItineraryId);
      setBulkSuccess(`Successfully checked in ${result.checked_in} users.`);
      setBulkUserIds("");
      setBulkItineraryId("");
      loadData();
    } catch (err) {
      console.error("Bulk check-in failed", err);
      setBulkError("Bulk check-in failed. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleCheckout(checkinId: string) {
    try {
      await checkout(EVENT_ID, checkinId);
      loadData();
    } catch (err) {
      console.error("Check-out failed", err);
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
              activeTab === "checkins" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Check-ins
          </button>
          {canCheckIn && (
            <button
              onClick={() => setActiveTab("qr")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "qr" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              QR Code
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "analytics" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Analytics
            </button>
          )}
        </div>

        {loading || roleLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
                  <div className="h-8 bg-gray-800 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
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
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{manualError}</p>
                )}
                {manualSuccess && (
                  <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">{manualSuccess}</p>
                )}
                <form onSubmit={handleManualCheckin} className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={manualUserId}
                    onChange={(e) => setManualUserId(e.target.value)}
                    placeholder="User ID"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={manualItineraryId}
                    onChange={(e) => setManualItineraryId(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All sessions</option>
                    {itineraryItems.filter((item) => item.status === "active").map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
                    Check In
                  </button>
                </form>
              </div>
            )}

            {canManage && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4">Bulk Check-in</h2>
                {bulkError && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{bulkError}</p>
                )}
                {bulkSuccess && (
                  <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">{bulkSuccess}</p>
                )}
                <form onSubmit={handleBulkCheckin} className="space-y-3">
                  <select
                    value={bulkItineraryId}
                    onChange={(e) => setBulkItineraryId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select session</option>
                    {itineraryItems.filter((item) => item.status === "active").map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                  <textarea
                    value={bulkUserIds}
                    onChange={(e) => setBulkUserIds(e.target.value)}
                    rows={4}
                    placeholder="Enter User IDs, one per line"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={bulkLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {bulkLoading ? "Checking in..." : "Bulk Check-in"}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">{canCheckIn ? "All Check-ins" : "My Check-ins"}</h2>
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
                        <th className="text-left px-5 py-3 font-medium">Checked In</th>
                        <th className="text-left px-5 py-3 font-medium">Checked Out</th>
                        {canManage && <th className="text-left px-5 py-3 font-medium">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {checkins.map((c) => (
                        <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-5 py-3 text-gray-100">{c.full_name}</td>
                          <td className="px-5 py-3 text-gray-400">{c.email}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              c.method === "qr" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            }`}>
                              {c.method}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-400">{c.session_title || "—"}</td>
                          <td className="px-5 py-3 text-gray-500">{formatDateTime(c.checked_in_at)}</td>
                          <td className="px-5 py-3 text-gray-500">{c.checked_out_at ? formatDateTime(c.checked_out_at) : "—"}</td>
                          {canManage && (
                            <td className="px-5 py-3">
                              {!c.checked_out_at && (
                                <button
                                  onClick={() => handleCheckout(c.id)}
                                  className="text-xs px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg transition-colors"
                                >
                                  Check Out
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
          </div>
        ) : activeTab === "analytics" && stats ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Check-ins</p>
                    <p className="text-3xl font-bold font-mono tabular-nums text-white">{stats.total_checkins}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-500/10">
                    <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Unique Participants</p>
                    <p className="text-3xl font-bold font-mono tabular-nums text-white">{stats.unique_users}</p>
                    {stats.total_checkins > 0 && (
                      <p className="text-xs text-emerald-400 mt-1">
                        {Math.round((stats.unique_users / stats.total_checkins) * 100)}% of check-ins
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">QR Check-ins</p>
                    <p className="text-3xl font-bold font-mono tabular-nums text-sky-400">{stats.qr_checkins}</p>
                    {stats.total_checkins > 0 && (
                      <p className="text-xs text-sky-400/70 mt-1">
                        {Math.round((stats.qr_checkins / stats.total_checkins) * 100)}% of total
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-sky-500/10">
                    <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Manual Check-ins</p>
                    <p className="text-3xl font-bold font-mono tabular-nums text-amber-400">{stats.manual_checkins}</p>
                    {stats.total_checkins > 0 && (
                      <p className="text-xs text-amber-400/70 mt-1">
                        {Math.round((stats.manual_checkins / stats.total_checkins) * 100)}% of total
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Attendance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4">Per-Session Attendance</h2>
                {stats.session_stats && stats.session_stats.length > 0 ? (
                  <div className="space-y-3">
                    {stats.session_stats.map((s, idx) => {
                      const percentage = stats.unique_users > 0 ? Math.round((s.unique_users / stats.unique_users) * 100) : 0;
                      const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
                      return (
                        <div key={s.session_id} className="bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-100">{s.session_title}</span>
                            <span className="text-xs text-gray-400 font-mono">{s.unique_users} users</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`${colors[idx % colors.length]} h-2 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right">{percentage}%</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 text-sm">No session data available.</div>
                )}
              </div>

              {/* Attendance Rate Summary */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4">Check-in Methods</h2>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-sky-500" />
                        <span className="text-sm font-medium text-gray-200">QR Code</span>
                      </div>
                      <span className="text-sm font-mono text-sky-400">
                        {stats.total_checkins > 0 ? Math.round((stats.qr_checkins / stats.total_checkins) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-sky-500 h-3 rounded-full transition-all"
                        style={{ width: `${stats.total_checkins > 0 ? (stats.qr_checkins / stats.total_checkins) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{stats.qr_checkins} check-ins via QR token scan</p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium text-gray-200">Manual</span>
                      </div>
                      <span className="text-sm font-mono text-amber-400">
                        {stats.total_checkins > 0 ? Math.round((stats.manual_checkins / stats.total_checkins) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-amber-500 h-3 rounded-full transition-all"
                        style={{ width: `${stats.total_checkins > 0 ? (stats.manual_checkins / stats.total_checkins) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{stats.manual_checkins} check-ins via organizer</p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-violet-500" />
                        <span className="text-sm font-medium text-gray-200">Participation Rate</span>
                      </div>
                      <span className="text-sm font-mono text-violet-400">
                        {stats.unique_users > 0 ? `${stats.unique_users} users` : "N/A"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-violet-500 h-3 rounded-full transition-all"
                        style={{ width: `${stats.total_checkins > 0 ? Math.min((stats.unique_users / stats.total_checkins) * 100, 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Unique users vs total check-in actions</p>
                  </div>
                </div>
              </div>
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
                  <code className="block text-sm text-green-400 break-all font-mono">{generatedToken}</code>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">QR Check-in</h2>
              {qrCheckinError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{qrCheckinError}</p>
              )}
              {qrCheckinSuccess && (
                <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">{qrCheckinSuccess}</p>
              )}
              <form onSubmit={handleQRCheckin} className="flex gap-3">
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="Paste QR token here"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
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
