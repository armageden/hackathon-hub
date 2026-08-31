'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toast';
import { setCurrentEventId } from '@/lib/event-id';
import { api } from '@/lib/api';
import type { User } from '@/types/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

interface AuthContextType {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): 'light' | 'dark' | 'system' {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  }
  return 'system';
}

function getResolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => getInitialTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getResolvedTheme(theme));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (stored) {
      setTheme(stored);
      setResolvedTheme(getResolvedTheme(stored));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme, mounted]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setThemeValue = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setResolvedTheme(getResolvedTheme(newTheme));
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeValue, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Combined providers
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProviderInner>
          <EventProvider>
            {children}
            <Toaster position="top-right" richColors />
          </EventProvider>
        </AuthProviderInner>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Auth Provider (unchanged)
const AuthProviderInner = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  const setAuth = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Dynamic import to avoid circular dependency
    import('@/features/auth/auth.api').then(({ getMe }) => {
      getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    });
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProviderInner as AuthProvider };
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Event Context
export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'draft' | 'active' | 'archived';
  my_role: string;
  created_at: string;
}

interface EventContextType {
  eventId: string | null;
  setEventId: (id: string) => void;
  events: Event[];
  loading: boolean;
  refetch: () => Promise<Event[]>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [eventId, setEventIdState] = useState<string | null>(() =>
    localStorage.getItem('activeEventId')
 );
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (): Promise<Event[]> => {
    if (!token) {
      setEvents([]);
      setLoading(false);
      return [];
    }

    try {
      const res = await api.get<{ events: Event[] }>('/events');
      const list = res.data?.events || [];
      setEvents(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setEventId = useCallback((id: string) => {
    setEventIdState(id);
    localStorage.setItem('activeEventId', id);
  }, []);

  // Synchronous derivation: stale/missing stored ID falls back to the first
  // event in the same render where ProtectedRoute validates access.
  const effectiveEventId =
    eventId && events.some(e => e.id === eventId)
      ? eventId
      : events[0]?.id ?? null;

  // Mirror selection into lib/event-id so plain functions (api modules,
  // useEventRole defaults) resolve the currently selected event.
  useEffect(() => {
    if (effectiveEventId) setCurrentEventId(effectiveEventId);
  }, [effectiveEventId]);

  return (
    <EventContext.Provider value={{ eventId: effectiveEventId, setEventId, events, loading, refetch: fetchEvents }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent(): EventContextType {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}

// For pages mounted under /events/:eventId/*. The URL param wins: it's what
// ProtectedRoute validated and what the user sees in the address bar, so data,
// role checks, and URL can never disagree. Context only backs non-URL callers.
export function useScopedEventId(): string {
  const { eventId: urlEventId } = useParams();
  const { eventId: contextEventId } = useEvent();
  const id = urlEventId ?? contextEventId;
  if (!id) {
    throw new Error('useScopedEventId requires an active event');
  }
  return id;
}