import { useEffect, useState, useMemo } from "react";
import type { ItineraryItem } from "./itinerary.types";
import { listItinerary, createItinerary, updateItinerary } from "./itinerary.api";
import { useEventRole } from "../../hooks/useEventRole";
import { useScopedEventId } from "../../app/providers";
import { formatDateTime, formatStatus } from "@/lib/formatters";

const SESSION_TYPE_COLORS: Record<string, string> = {
  ceremony: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  workshop: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  presentation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const SESSION_TYPE_DOTS: Record<string, string> = {
  ceremony: "bg-purple-500",
  workshop: "bg-blue-500",
  presentation: "bg-orange-500",
  general: "bg-gray-500",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/20",
};

function formatDateKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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
  const [roomArea, setRoomArea] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [materialsUrl, setMaterialsUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sessionType, setSessionType] = useState("general");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [editItem, setEditItem] = useState<ItineraryItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    room_area: "",
    speaker_name: "",
    materials_url: "",
    starts_at: "",
    ends_at: "",
    session_type: "general",
  });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.speaker_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || item.session_type === filterType;
      const matchesStatus = filterStatus === "all" || item.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, searchQuery, filterType, filterStatus]);

  const groupedByDay = useMemo(() => {
    const groups: { label: string; dateKey: string; items: ItineraryItem[] }[] = [];
    const map = new Map<string, ItineraryItem[]>();

    for (const item of filteredItems) {
      const d = new Date(item.starts_at);
      const key = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({ label: key, dateKey: key, items: map.get(key)! });
      }
      map.get(key)!.push(item);
    }

    return groups;
  }, [filteredItems]);

  const totalSessions = filteredItems.filter((i) => i.status !== "cancelled").length;
  const totalDays = groupedByDay.length;

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
        room_area: roomArea.trim() || undefined,
        speaker_name: speakerName.trim() || undefined,
        materials_url: materialsUrl.trim() || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        session_type: sessionType,
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setRoomArea("");
      setSpeakerName("");
      setMaterialsUrl("");
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

  function toLocalDatetime(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  function openEditModal(item: ItineraryItem) {
    setEditItem(item);
    setEditForm({
      title: item.title,
      description: item.description || "",
      location: item.location || "",
      room_area: item.room_area || "",
      speaker_name: item.speaker_name || "",
      materials_url: item.materials_url || "",
      starts_at: toLocalDatetime(item.starts_at),
      ends_at: toLocalDatetime(item.ends_at),
      session_type: item.session_type,
    });
    setEditError("");
  }

  function addSessionForDay(dayItems: ItineraryItem[]) {
    const date = new Date(dayItems[0].starts_at);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setStartsAt(`${yyyy}-${mm}-${dd}T09:00`);
    setEndsAt(`${yyyy}-${mm}-${dd}T10:00`);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditError("");

    if (!editForm.title.trim()) {
      setEditError("Title is required.");
      return;
    }
    if (editForm.starts_at && editForm.ends_at && new Date(editForm.ends_at) <= new Date(editForm.starts_at)) {
      setEditError("End time must be after start time.");
      return;
    }

    setSaving(true);
    try {
      await updateItinerary(EVENT_ID, editItem.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        location: editForm.location.trim() || undefined,
        room_area: editForm.room_area.trim() || undefined,
        speaker_name: editForm.speaker_name.trim() || undefined,
        materials_url: editForm.materials_url.trim() || undefined,
        starts_at: new Date(editForm.starts_at).toISOString(),
        ends_at: new Date(editForm.ends_at).toISOString(),
        session_type: editForm.session_type,
      });
      setEditItem(null);
      loadItems();
    } catch (err) {
      console.error("Failed to update item", err);
      setEditError("Failed to update item. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Schedule</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalSessions} session{totalSessions !== 1 ? "s" : ""} across {totalDays} day{totalDays !== 1 ? "s" : ""}
            </p>
          </div>
          {isOrganizer && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {showForm ? "Close Form" : "+ Add Session"}
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && isOrganizer && (
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 space-y-4"
          >
            <h2 className="text-lg font-semibold mb-2">New Session</h2>

            {formError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Session title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Session Type</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="workshop">Workshop</option>
                  <option value="ceremony">Ceremony</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Building / Venue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Room / Area</label>
                <input
                  type="text"
                  value={roomArea}
                  onChange={(e) => setRoomArea(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Room 101 / Hall A"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Speaker / Mentor</label>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Speaker name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Materials / Links</label>
                <input
                  type="url"
                  value={materialsUrl}
                  onChange={(e) => setMaterialsUrl(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Starts At *</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Ends At *</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                Create Session
              </button>
            </div>
          </form>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions, speakers, locations..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="workshop">Workshop</option>
            <option value="ceremony">Ceremony</option>
            <option value="presentation">Presentation</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Schedule */}
        {loading || roleLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-48 mb-4" />
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="h-10 bg-gray-800 rounded w-24 shrink-0" />
                    <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="h-5 bg-gray-800 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center text-gray-500 py-16 bg-gray-900 rounded-xl border border-gray-800">
            {items.length === 0
              ? `No sessions scheduled yet.${isOrganizer ? ' Click "+ Add Session" to create one.' : ""}`
              : "No sessions match your search or filters."}
          </div>
        ) : (
          <div className="space-y-10">
            {groupedByDay.map((day) => (
              <div key={day.dateKey}>
                {/* Day Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-center min-w-[80px]">
                    <div className="text-xs font-medium uppercase tracking-wide opacity-80">
                      {new Date(day.items[0].starts_at).toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="text-2xl font-bold leading-tight">
                      {new Date(day.items[0].starts_at).getDate()}
                    </div>
                    <div className="text-xs opacity-80">
                      {new Date(day.items[0].starts_at).toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-100">{day.label}</h2>
                    <p className="text-xs text-gray-500">
                      {day.items.filter((i) => i.status !== "cancelled").length} session{day.items.filter((i) => i.status !== "cancelled").length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {isOrganizer && (
                    <button
                      onClick={() => addSessionForDay(day.items)}
                      className="shrink-0 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add
                    </button>
                  )}
                  <div className="flex-1 h-px bg-gray-800 ml-2" />
                </div>

                {/* Sessions for this day */}
                <div className="space-y-3 ml-4 pl-6 border-l-2 border-gray-800">
                  {day.items.map((item) => (
                    <div key={item.id} className="relative group">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-gray-950 ${
                        item.status === "cancelled"
                          ? "bg-gray-700"
                          : SESSION_TYPE_DOTS[item.session_type] || SESSION_TYPE_DOTS.general
                      }`} />

                      <div className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                        item.status === "cancelled"
                          ? "border-gray-800/50 opacity-50"
                          : "border-gray-800 hover:border-gray-700"
                      }`}>
                        <div className="flex items-start gap-4">
                          {/* Time Column */}
                          <div className="shrink-0 w-20 text-center">
                            <div className="text-sm font-bold text-gray-200">
                              {formatTime(item.starts_at)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(item.ends_at)}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {formatDuration(item.starts_at, item.ends_at)}
                            </div>
                          </div>

                          {/* Vertical divider */}
                          <div className="w-px bg-gray-800 shrink-0 self-stretch" />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className={`text-base font-semibold ${item.status === "cancelled" ? "text-gray-500 line-through" : "text-gray-100"}`}>
                                {item.title}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  SESSION_TYPE_COLORS[item.session_type] || SESSION_TYPE_COLORS.general
                                }`}
                              >
                                {formatStatus(item.session_type)}
                              </span>
                              {item.status === "cancelled" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
                                  Cancelled
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p className="text-gray-400 text-sm mt-1 line-clamp-2">{item.description}</p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                              {item.location && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                  </svg>
                                  {item.location}
                                </span>
                              )}
                              {item.room_area && (
                                <span className="flex items-center gap-1 text-indigo-400">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                  </svg>
                                  {item.room_area}
                                </span>
                              )}
                              {item.speaker_name && (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                  </svg>
                                  {item.speaker_name}
                                </span>
                              )}
                              {item.materials_url && (
                                <a
                                  href={item.materials_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.914-2.364a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                  </svg>
                                  Materials
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {isOrganizer && item.status !== "cancelled" && (
                            <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(item)}
                                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded-lg text-xs font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleCancel(item.id)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== EDIT MODAL ========== */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditItem(null)}>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit: {editItem.title}</h2>

            {editError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {editError}
              </p>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Session Type</label>
                  <select
                    value={editForm.session_type}
                    onChange={(e) => setEditForm({ ...editForm, session_type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="workshop">Workshop</option>
                    <option value="ceremony">Ceremony</option>
                    <option value="presentation">Presentation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Room / Area</label>
                  <input
                    type="text"
                    value={editForm.room_area}
                    onChange={(e) => setEditForm({ ...editForm, room_area: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Speaker / Mentor</label>
                  <input
                    type="text"
                    value={editForm.speaker_name}
                    onChange={(e) => setEditForm({ ...editForm, speaker_name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Materials / Links</label>
                  <input
                    type="url"
                    value={editForm.materials_url}
                    onChange={(e) => setEditForm({ ...editForm, materials_url: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Starts At *</label>
                  <input
                    type="datetime-local"
                    value={editForm.starts_at}
                    onChange={(e) => setEditForm({ ...editForm, starts_at: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Ends At *</label>
                  <input
                    type="datetime-local"
                    value={editForm.ends_at}
                    onChange={(e) => setEditForm({ ...editForm, ends_at: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
