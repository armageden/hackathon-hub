'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvent, type Event } from '@/app/providers';
import { api } from '@/lib/api';
import { Calendar, ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { refetch } = useEvent();

  const [form, setForm] = useState({
    name: '',
    description: '',
    starts_at: '',
    ends_at: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError('Event name is required');
      return;
    }

    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      // api.post surfaces server error messages as thrown Errors
      const res = await api.post<{ event: Event }>('/events', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        // datetime-local is timezone-naive; normalize to UTC ISO like the
        // itinerary/venue forms do, or the server session TZ decides the instant.
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      });

      const created = res.data?.event;
      if (!created) {
        throw new Error('Unexpected server response while creating the event');
      }

      await refetch();
      navigate(`/events/${created.id}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="h-7 w-7 text-indigo-400" />
          Create New Event
        </h1>
        <p className="text-gray-400 mt-2">
          Set up a new hackathon event. You'll be added as an organizer automatically.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Event Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Event Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Hackathon 2026"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={255}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your hackathon event..."
            rows={4}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="starts_at" className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              id="starts_at"
              type="datetime-local"
              value={form.starts_at}
              onChange={e => setForm(prev => ({ ...prev, starts_at: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="ends_at" className="block text-sm font-medium text-gray-300 mb-2">
              End Date
            </label>
            <input
              id="ends_at"
              type="datetime-local"
              value={form.ends_at}
              onChange={e => setForm(prev => ({ ...prev, ends_at: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
