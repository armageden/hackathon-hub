// Event selection: EventProvider keeps `currentEventId` in sync with the
// user's chosen event so non-React callers (api modules, useEventRole) can
// resolve the right event without being handed context.

export const REAL_EVENT_ID = "e0000000-0000-0000-0000-000000000001";

// Module-level mirror of the EventProvider selection. Null until the provider
// mounts; falls back to the real event id before that.
let currentEventId: string | null = null;

export function setCurrentEventId(eventId: string): void {
  currentEventId = eventId;
}

export function getActiveEventId(): string {
  return currentEventId ?? REAL_EVENT_ID;
}
