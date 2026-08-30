import { useAuth, useEvent } from "../app/providers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { formatDate } from '@/lib/formatters';

// Route segments under /events/:eventId/
const QUICK_ACTIONS = [
  { label: "Events", path: "", description: "Manage events" },
  { label: "Teams", path: "team", description: "Team management" },
  { label: "Hardware", path: "hardware", description: "Inventory & checkouts" },
  { label: "Schedule", path: "venue", description: "Venue & schedule" },
  { label: "Check-in", path: "checkin", description: "Attendee check-in" },
  { label: "Budget", path: "budget", description: "Sponsors & expenses" },
  { label: "Projects", path: "projects", description: "Submissions & judging" },
  { label: "Incidents", path: "incidents", description: "Safety & reports" },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { eventId } = useEvent();
  const navigate = useNavigate();

  const quickActions = QUICK_ACTIONS.map(({ label, path, description }) => ({
    label,
    description,
    // "" maps to the events hub itself
    href: eventId ? `/events/${eventId}${path ? `/${path}` : ""}` : "/events",
  }));

  if (!user) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-400 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-300">{user.full_name}</p>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-400 mb-2">
            Your Role
          </h2>
          <span className="inline-block px-3 py-1 bg-indigo-600 rounded text-sm">
            {user.global_role}
          </span>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-400 mb-2">
            Account Status
          </h2>
          <p className="text-green-400">Active</p>
          <p className="text-gray-500 text-xs mt-1">
            Member since {formatDate(user.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-indigo-400 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto py-3 text-left text-sm transition-colors hover:bg-gray-800"
              onClick={() => navigate(action.href)}
            >
              <span className="font-medium text-white block">{action.label}</span>
              <span className="text-xs text-gray-500">{action.description}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
