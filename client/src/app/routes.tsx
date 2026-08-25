import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router-dom';
import { ErrorPage } from '../components/ErrorPage';
import { Shell } from '../components/layout/Shell';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import HomePage from '../pages/HomePage';
import EventsPage from '../features/events/EventsPage';
import CreateEventPage from '../features/events/CreateEventPage';
import HardwareDashboardPage from '../features/hardware/pages/HardwareDashboardPage';
import HardwareBrowsePage from '../features/hardware/pages/HardwareBrowsePage';
import TeamsPage from '../features/teams/TeamsPage';
import ItineraryPage from '../features/itinerary/ItineraryPage';
import CheckinPage from '../features/checkin/CheckinPage';
import CertificatesPage from '../features/certificates/CertificatesPage';
import VenuePage from '../features/venue/VenuePage';
import ProjectsPage from '../features/projects/ProjectsPage';
import JudgingPage from '../features/judging/JudgingPage';
import { useAuth, useEvent } from './providers';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { events, loading: eventsLoading, eventId: activeEventId, setEventId } = useEvent();
  const { eventId } = useParams();

  // Keep the provider selection (and the lib/event-id mirror used by
  // default-param API callers) following the validated URL segment.
  useEffect(() => {
    if (
      !loading &&
      !eventsLoading &&
      eventId &&
      eventId !== activeEventId &&
      events.some(e => e.id === eventId)
    ) {
      setEventId(eventId);
    }
  }, [loading, eventsLoading, eventId, activeEventId, events, setEventId]);

  if (loading || eventsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verify user has access to this event
  if (eventId && !events.find(e => e.id === eventId)) {
    return <Navigate to="/events" replace />;
  }

  return <div key={eventId}>{children}</div>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/events" replace />;
  }

  return <>{children}</>;
}

// Public layout (no sidebar)
function PublicLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

// Hardware route - shows different page based on role
function HardwareRoute() {
  const { user } = useAuth();
  const { eventId } = useParams();
  const isOrganizer = user?.global_role === 'admin';

  return isOrganizer
    ? <HardwareDashboardPage eventId={eventId!} />
    : <HardwareBrowsePage eventId={eventId!} />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <ErrorPage notFound /> },
      {
        path: 'login',
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        ),
      },
    ],
  },
  {
    element: <Shell />,
    errorElement: <ErrorPage />,
    children: [
      // Events list (no event ID required)
      {
        path: 'events',
        element: (
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'events/create',
        element: (
          <ProtectedRoute>
            <CreateEventPage />
          </ProtectedRoute>
        ),
      },
      // Event-scoped routes
      {
        path: 'events/:eventId',
        children: [
          {
            path: 'dashboard',
            element: (
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'hardware',
            element: (
              <ProtectedRoute>
                <HardwareRoute />
              </ProtectedRoute>
            ),
          },
          {
            path: 'venue',
            element: (
              <ProtectedRoute>
                <VenuePage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'projects',
            element: (
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'judging',
            element: (
              <ProtectedRoute>
                <JudgingPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'team',
            element: (
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'itinerary',
            element: (
              <ProtectedRoute>
                <ItineraryPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'checkin',
            element: (
              <ProtectedRoute>
                <CheckinPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'certificates',
            element: (
              <ProtectedRoute>
                <CertificatesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'budget',
            element: (
              <ProtectedRoute>
                <div className="p-8 text-center text-gray-400">Budget Dashboard - Coming Soon</div>
              </ProtectedRoute>
            ),
          },
          {
            path: 'incidents',
            element: (
              <ProtectedRoute>
                <div className="p-8 text-center text-gray-400">Incidents Dashboard - Coming Soon</div>
              </ProtectedRoute>
            ),
          },
        ],
      },
      // Redirect old routes to events list
      {
        path: 'dashboard',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'hardware',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'venue',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'projects',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'judging',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'team',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'itinerary',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'checkin',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'certificates',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'budget',
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'incidents',
        element: <Navigate to="/events" replace />,
      },
    ],
  },
]);
