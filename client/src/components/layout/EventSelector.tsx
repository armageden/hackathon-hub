'use client';

import { useEvent } from '@/app/providers';
import { ChevronDown, Calendar, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function EventSelector() {
  const { eventId, setEventId, events, loading } = useEvent();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const activeEvent = events.find(e => e.id === eventId);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-9 w-48 bg-gray-800 rounded-lg animate-pulse" />
    );
  }

  if (events.length === 0) {
    return (
      <button
        onClick={() => navigate('/events/create')}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create Event
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors min-w-[200px]"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-white truncate flex-1 text-left">
          {activeEvent?.name || 'Select Event'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
          <div className="px-3 py-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
            Your Events
          </div>
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => {
                setEventId(event.id);
                setOpen(false);
                navigate(`/events/${event.id}/dashboard`);
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 hover:bg-gray-800 transition-colors ${
                event.id === eventId ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{event.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    event.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {event.status}
                  </span>
                  <span className="capitalize">{event.my_role}</span>
                </div>
              </div>
              {event.id === eventId && (
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
              )}
            </button>
          ))}
          <div className="border-t border-gray-700 mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/events');
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              View All Events
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/events/create');
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
