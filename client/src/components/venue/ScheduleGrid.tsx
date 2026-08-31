'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import type { VenueLocation, VenueAssignment } from '@/types/api';
import { addMinutes, startOfDay } from 'date-fns';
import { formatTime } from '@/lib/formatters';

interface ScheduleGridProps {
  locations: VenueLocation[];
  assignments: VenueAssignment[];
  eventStart: Date;
  eventEnd: Date;
  selectedAssignmentId?: string | null;
  onAssignmentClick: (assignment: VenueAssignment) => void;
  onTimeSlotClick: (locationId: string, startTime: Date, endTime: Date) => void;
  slotDuration?: number; // minutes
  height?: number;
}

const DEFAULT_SLOT_DURATION = 30;

export function ScheduleGrid({
  locations,
  assignments,
  eventStart,
  eventEnd,
  selectedAssignmentId,
  onAssignmentClick,
  onTimeSlotClick,
  slotDuration = DEFAULT_SLOT_DURATION,
  height = 600,
}: ScheduleGridProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ locationId: string; time: Date } | null>(null);

  const timeSlots = useMemo(() => {
    const slots: Date[] = [];
    let current = startOfDay(eventStart);
    const end = new Date(eventEnd);
    while (current < end) {
      slots.push(new Date(current));
      current = addMinutes(current, slotDuration);
    }
    return slots;
  }, [eventStart, eventEnd, slotDuration]);

  const locationAssignments = useMemo(() => {
    const map = new Map<string, VenueAssignment[]>();
    assignments.forEach(a => {
      if (!map.has(a.venue_location_id)) map.set(a.venue_location_id, []);
      map.get(a.venue_location_id)!.push(a);
    });
    return map;
  }, [assignments]);

  const getAssignmentAt = (locationId: string, time: Date) => {
    const locAssignments = locationAssignments.get(locationId) || [];
    return locAssignments.find(a => {
      if (!a.starts_at || !a.ends_at) return false;
      const start = new Date(a.starts_at);
      const end = new Date(a.ends_at);
      return time >= start && time < end;
    });
  };

  const getAssignmentSpan = (locationId: string, time: Date) => {
    const assignment = getAssignmentAt(locationId, time);
    if (!assignment || !assignment.starts_at) return 1;
    const start = new Date(assignment.starts_at);
    const end = assignment.ends_at ? new Date(assignment.ends_at) : addMinutes(start, slotDuration);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.max(1, Math.round(duration / slotDuration));
  };

  const teamColors = [
    'var(--color-team-1)',
    'var(--color-team-2)',
    'var(--color-team-3)',
    'var(--color-team-4)',
    'var(--color-team-5)',
    'var(--color-team-6)',
    'var(--color-team-7)',
    'var(--color-team-8)',
  ];

  return (
    <div className="card overflow-hidden" style={{ height }}>
      <div className="overflow-x-auto overflow-y-auto" style={{ height: '100%' }}>
        <table className="table" style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="sticky top-0 z-10 bg-gray-900">
            <tr>
              <th className="w-32 p-3 text-left font-semibold text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800 sticky left-0 z-20 bg-gray-900">
                Time
              </th>
              {locations.map(location => (
                <th
                  key={location.id}
                  className="w-48 min-w-48 p-3 text-left font-semibold text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800 border-l border-gray-800 bg-gray-900"
                  style={{ background: `linear-gradient(90deg, ${LOCATION_TYPE_COLORS[location.location_type] || 'transparent'} 0%, transparent 100%)` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded"
                      style={{ backgroundColor: LOCATION_TYPE_COLORS[location.location_type] || 'var(--color-chart-1)' }}
                    />
                    <span className="font-medium text-white truncate">{location.name}</span>
                    <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded bg-gray-800">
                      {location.capacity || '—'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, slotIndex) => (
              <tr key={slot.toISOString()}>
                <td className="w-32 p-2 text-right font-mono text-xs text-gray-500 border-b border-gray-800 sticky left-0 z-10 bg-gray-950">
                  {formatTime(slot)}
                </td>
                {locations.map(location => {
                  const assignment = getAssignmentAt(location.id, slot);
                  const span = getAssignmentSpan(location.id, slot);
                  const isFirstSlot = slotIndex === 0 || !getAssignmentAt(location.id, timeSlots[slotIndex - 1]) ||
                    getAssignmentAt(location.id, timeSlots[slotIndex - 1])?.id !== assignment?.id;

                  if (assignment && isFirstSlot) {
                    const teamColorIndex = assignments.findIndex(a => a.id === assignment.id) % teamColors.length;
                    const teamColor = teamColors[teamColorIndex];

                    return (
                      <td
                        key={`${location.id}-${slot.toISOString()}`}
                        rowSpan={span}
                        className="relative p-2 border-b border-gray-800 border-l border-gray-800 align-top"
                        style={{ minHeight: `${slotDuration * span}px` }}
                        onClick={() => onAssignmentClick(assignment)}
                      >
                        <Tooltip content={assignment.team?.name || assignment.project?.title || 'Assignment'}>
                          <div
                            className="h-full rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg"
                            style={{
                              backgroundColor: teamColor,
                              opacity: selectedAssignmentId === assignment.id ? 1 : 0.8,
                              border: selectedAssignmentId === assignment.id ? '2px solid white' : 'none',
                            }}
                            onMouseEnter={() => setHoveredSlot({ locationId: location.id, time: slot })}
                            onMouseLeave={() => setHoveredSlot(null)}
                          >
                            <div className="font-medium text-white text-xs truncate">
                              {assignment.team?.name || assignment.project?.title || 'Assignment'}
                            </div>
                            <div className="text-[10px] text-white/70 mt-1">
                              {formatTime(assignment.starts_at!)} - {formatTime(assignment.ends_at!)}
                            </div>
                          </div>
                        </Tooltip>
                      </td>
                    );
                  }

                  if (assignment && !isFirstSlot) {
                    // This slot is covered by rowSpan, don't render
                    return null;
                  }

                  // Empty slot - clickable for new assignment
                  return (
                    <td
                      key={`${location.id}-${slot.toISOString()}`}
                      className={cn(
                        'p-2 border-b border-gray-800 border-l border-gray-800 align-top',
                        'min-h-[40px] transition-colors',
                        hoveredSlot?.locationId === location.id && hoveredSlot?.time.getTime() === slot.getTime()
                          ? 'bg-gray-800/50'
                          : 'hover:bg-gray-800/30'
                      )}
                      onClick={() => onTimeSlotClick(location.id, slot, addMinutes(slot, slotDuration))}
                    >
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">+</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Location type colors (duplicate here to avoid circular import)
const LOCATION_TYPE_COLORS: Record<string, string> = {
  room: 'var(--color-venue-room)',
  booth: 'var(--color-venue-booth)',
  table: 'var(--color-venue-table)',
  stage: 'var(--color-venue-stage)',
  lab: 'var(--color-venue-lab)',
  desk: 'var(--color-venue-desk)',
};