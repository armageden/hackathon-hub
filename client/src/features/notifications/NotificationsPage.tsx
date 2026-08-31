import { useEffect, useState, useCallback } from "react";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "./notifications.api";
import type { Notification } from "./notifications.types";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatDateTime } from "@/lib/formatters";

const TYPE_BG: Record<string, string> = {
  info: "bg-blue-500/10 border-blue-500/20",
  success: "bg-green-500/10 border-green-500/20",
  warning: "bg-yellow-500/10 border-yellow-500/20",
  reminder: "bg-orange-500/10 border-orange-500/20",
  team_request: "bg-purple-500/10 border-purple-500/20",
};

export default function NotificationsPage() {
  const EVENT_ID = useScopedEventId();
  const { loading: roleLoading } = useEventRole(EVENT_ID);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        listNotifications(EVENT_ID, filter === "unread"),
        getUnreadCount(EVENT_ID),
      ]);
      setNotifications(data);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!roleLoading) fetchData();
  }, [roleLoading, fetchData]);

  async function handleMarkAsRead(id: string) {
    try {
      await markAsRead(id, EVENT_ID);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead(EVENT_ID);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNotification(id, EVENT_ID);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.read_at) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 rounded-lg transition-colors border border-gray-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "all" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "unread" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-800 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-800 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`border rounded-xl p-4 transition-colors ${
                  n.read_at
                    ? "bg-gray-900/50 border-gray-800/50"
                    : `${TYPE_BG[n.type] || TYPE_BG.info}`
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read_at && (
                        <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0"></span>
                      )}
                      <h3 className={`text-sm font-medium ${n.read_at ? "text-gray-300" : "text-white"}`}>
                        {n.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{n.message}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.read_at && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1.5 text-gray-400 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
