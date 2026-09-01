'use client';

import { useState } from 'react';
import { useEvent, useAuth, type Event } from '@/app/providers';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Users, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatDateRange, formatStatus } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { updateEvent, deleteEvent } from './events.api';

export default function EventsPage() {
  const { events, loading, setEventId, refetch } = useEvent();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Mirrors the server rule: POST /events requires the global admin role
  // (temporary admins included while their window is open).
  const isAdmin = user?.global_role === 'admin';

  const [renameTarget, setRenameTarget] = useState<Event | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;
    if (!renameName.trim()) {
      setRenameError('Event name is required.');
      return;
    }
    setRenaming(true);
    setRenameError('');
    try {
      await updateEvent(renameTarget.id, { name: renameName.trim() });
      setRenameTarget(null);
      await refetch();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Could not rename the event.');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the event.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

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
        {isAdmin && (
          <button
            onClick={() => navigate('/events/create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Event
          </button>
        )}
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-xl border border-gray-800">
          <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Events Yet</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {isAdmin
              ? "Create your first hackathon event to get started. You'll be able to manage teams, hardware, schedules, and more."
              : "No events yet. A platform admin can create an event and add you as a member."}
          </p>
          {isAdmin && (
            <button
              onClick={() => navigate('/events/create')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First Event
            </button>
          )}
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
                    {formatStatus(event.status)}
                  </span>
                  {isAdmin && (
                    <span className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <button
                        aria-label={`Rename ${event.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(event);
                          setRenameName(event.name);
                          setRenameError('');
                        }}
                        className="p-1.5 rounded-md text-gray-500 hover:text-indigo-400 hover:bg-gray-800 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Delete ${event.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(event);
                        }}
                        className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
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

      {actionError && (
        <p className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
          {actionError}
        </p>
      )}

      {/* Rename dialog */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Rename Event</DialogTitle>
            <DialogDescription>Update the display name of this event.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            {renameError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {renameError}
              </p>
            )}
            <div>
              <label className="block text-sm text-gray-300 mb-1" htmlFor="event-name">Event name</label>
              <Input
                id="event-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Event name"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setRenameTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renaming}>
                {renaming ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete “{deleteTarget?.name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the event and all of its data (members, teams, hardware,
              bookings, projects). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
