// Demo mode: when enabled, every API call targets the seeded demo event
// instead of the real one. State lives in localStorage so it survives reloads.
//
// Event selection: EventProvider keeps `currentEventId` in sync with the
// user's chosen event so non-React callers (api modules, useEventRole) can
// resolve the right event without being handed context.

export const REAL_EVENT_ID = "e0000000-0000-0000-0000-000000000001";
export const DEMO_EVENT_ID = "e0000000-0000-0000-0000-000000000002";

const DEMO_MODE_KEY = "demo_mode";

// Module-level mirror of the EventProvider selection. Null until the provider
// mounts; falls back to the demo-mode-derived default before that.
let currentEventId: string | null = null;

export function setCurrentEventId(eventId: string): void {
  currentEventId = eventId;
}

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function getActiveEventId(): string {
  return currentEventId ?? (isDemoMode() ? DEMO_EVENT_ID : REAL_EVENT_ID);
}

export function setDemoMode(on: boolean): void {
  localStorage.setItem(DEMO_MODE_KEY, String(on));
}
