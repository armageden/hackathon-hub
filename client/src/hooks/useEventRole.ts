import { useState, useEffect } from "react";
import { useAuth } from "../app/providers";
import { apiRequest } from "../lib/api";

type EventRole = "organizer" | "participant" | "volunteer" | "judge" | null;

// eventId is required so a page can never accidentally resolve its role
// against a different event than the one it renders data for.
export function useEventRole(eventId: string) {
  const { user } = useAuth();
  const [eventRole, setEventRole] = useState<EventRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !eventId) {
      setEventRole(null);
      setLoading(false);
      return;
    }

    // Ignore responses that resolve after eventId/user changed — prevents a
    // slow stale fetch from overwriting a newer event's role.
    let cancelled = false;

    apiRequest<{ membership: { role: string; status: string } | null }>(
      `/events/${eventId}/members/me`
    )
      .then((res) => {
        if (cancelled) return;
        // 'approved' counts here just as it does in requireEventRole
        if (res.membership && ["active", "approved"].includes(res.membership.status)) {
          setEventRole(res.membership.role as EventRole);
        } else {
          setEventRole(null);
        }
      })
      .catch(() => {
        if (!cancelled) setEventRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, eventId]);

  const isOrganizer = eventRole === "organizer";
  const isVolunteer = eventRole === "volunteer";
  const isParticipant = eventRole === "participant";
  const isJudge = eventRole === "judge";
  const canManage = isOrganizer;
  const canCheckIn = isOrganizer || isVolunteer;

  return {
    eventRole,
    loading,
    isOrganizer,
    isVolunteer,
    isParticipant,
    isJudge,
    canManage,
    canCheckIn,
  };
}
