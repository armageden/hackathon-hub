'use client';

import { useEvent } from '@/app/providers';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Users, ArrowRight } from 'lucide-react';
import { formatDate, formatDateRange } from '@/lib/formatters';

export default function EventsPage() {
  const { events, loading, setEventId } = useEvent();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-400">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Events</h1>
          <p className="text-gray-400 mt-1">
            Select an event to manage or create a new one
          </p>
        </div>
        <button
          onClick={() => navigate('/events/create')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Event
        </button>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-xl border border-gray-800">
          <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Events Yet</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first hackathon event to get started. You'll be able to manage teams,
            hardware, schedules, and more.
          </p>
          <button
            onClick={() => navigate('/events/create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div
              key={event.id}
              className="bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors overflow-hidden cursor-pointer group"
              onClick={() => {
                setEventId(event.id);
                navigate(`/events/${event.id}/dashboard`);
              }}
            >
              {/* Card Header with Status Badge */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors truncate flex-1">
                    {event.name}
                  </h3>
                  <span className={`ml-2 px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                    event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    event.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {event.status}
                  </span>
                </div>

                {event.description && (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}

                {/* Event Dates */}
                {(event.starts_at || event.ends_at) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {event.starts_at && event.ends_at
                        ? formatDateRange(event.starts_at, event.ends_at)
                        : event.starts_at
                          ? formatDate(event.starts_at)
                          : formatDate(event.ends_at!)}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-400 capitalize">{event.my_role}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <span>Open</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
