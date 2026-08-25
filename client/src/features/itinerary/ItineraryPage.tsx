import { useEffect, useState } from "react";
import type { ItineraryItem } from "./itinerary.types";
import { listItinerary, createItinerary, updateItinerary } from "./itinerary.api";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatDateTime } from "@/lib/formatters";

const SESSION_TYPE_COLORS: Record<string, string> = {
  ceremony: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  workshop: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  presentation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ItineraryPage() {
  const EVENT_ID = useScopedEventId();
  const { isOrganizer, loading: roleLoading } = useEventRole(EVENT_ID);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sessionType, setSessionType] = useState("general");

  async function loadItems() {
    setLoading(true);
    try {
      const data = await listItinerary(EVENT_ID);
      setItems(
        [...data].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        )
      );
    } catch (err) {
      console.error("Failed to load itinerary", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!roleLoading) loadItems();
  }, [roleLoading]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setFormError("End time must be after start time.");
      return;
    }

    try {
      await createItinerary(EVENT_ID, {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        session_type: sessionType,
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      setEndsAt("");
      setSessionType("general");
      setShowForm(false);
      loadItems();
    } catch (err) {
      console.error("Failed to create itinerary item", err);
      setFormError("Failed to create item. Please try again.");
    }
  }

  async function handleCancel(id: string) {
    try {
      await updateItinerary(EVENT_ID, id, { status: "cancelled" });
      loadItems();
    } catch (err) {
      console.error("Failed to cancel item", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Itinerary</h1>
          {isOrganizer && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {showForm ? "Close Form" : "Add Item"}
            </button>
          )}
        </div>

        {showForm && isOrganizer && (
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 space-y-4"
          >
            <h2 className="text-lg font-semibold mb-2">New Itinerary Item</h2>

            {formError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Session title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Session Type
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="workshop">Workshop</option>
                  <option value="ceremony">Ceremony</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Optional location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Starts At *
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Ends At *
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Item
              </button>
            </div>
          </form>
        )}

        {loading || roleLoading ? (
          <div className="text-center text-gray-500 py-12">Loading itinerary...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-gray-900 rounded-xl border border-gray-800">
            No itinerary items yet.{isOrganizer ? ' Click "Add Item" to create one.' : ""}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-800" />
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="relative pl-14">
                  <div className="absolute left-4 top-6 w-5 h-5 rounded-full border-2 border-indigo-500 bg-gray-950 z-10" />
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-semibold text-gray-100">
                            {item.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              SESSION_TYPE_COLORS[item.session_type] ||
                              SESSION_TYPE_COLORS.general
                            }`}
                          >
                            {item.session_type}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              STATUS_COLORS[item.status] || STATUS_COLORS.active
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-gray-400 text-sm mt-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>
                            {formatDateTime(item.starts_at)} &mdash;{" "}
                            {formatDateTime(item.ends_at)}
                          </span>
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                />
                              </svg>
                              {item.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOrganizer && item.status !== "cancelled" && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="shrink-0 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
