'use client';

import { useState } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/Sheet';
import { useAuth, useEvent } from '@/app/providers';
import { useDemoMode } from '@/app/demo-mode';
import { enableDemoData, disableDemoData } from '@/lib/demo.api';
import {
  LayoutDashboard,
  Box,
  MapPin,
  GitBranch,
  Gavel,
  Users,
  CalendarDays,
  UserCheck,
  Award,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FlaskConical,
} from 'lucide-react';

// Route segment under /events/:eventId/
const NAV_ITEMS = [
  { name: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { name: 'Hardware', path: 'hardware', icon: Box },
  { name: 'Venue', path: 'venue', icon: MapPin },
  { name: 'Projects', path: 'projects', icon: GitBranch },
  { name: 'Judging', path: 'judging', icon: Gavel },
  { name: 'Team', path: 'team', icon: Users },
  { name: 'Itinerary', path: 'itinerary', icon: CalendarDays },
  { name: 'Check-in', path: 'checkin', icon: UserCheck },
  { name: 'Certificates', path: 'certificates', icon: Award },
];

// Event-scoped links; without an active event everything points at the hub.
function useNavigation() {
  const { eventId } = useEvent();
  return NAV_ITEMS.map((item) => ({
    ...item,
    href: eventId ? `/events/${eventId}/${item.path}` : '/events',
  }));
}

function DemoModeToggle({ collapsed }: { collapsed?: boolean }) {
  const { demoMode, toggleDemoMode } = useDemoMode();
  const { user } = useAuth();
  const isAdmin = user?.global_role === 'admin';

  // Admins seed/purge the demo event server-side before the view flips, so
  // one click is the whole lifecycle. Other roles just switch which event
  // they are looking at (server rejects their data calls anyway).
  const handleToggle = async () => {
    if (isAdmin) {
      try {
        if (demoMode) await disableDemoData();
        else await enableDemoData();
      } catch (err) {
        console.warn('Demo data sync failed; switching view anyway.', err);
      }
    }
    toggleDemoMode();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={demoMode}
      aria-label="Demo mode"
      onClick={handleToggle}
      title="Switch between the seeded Demo Hackathon and your real event data"
      className={cn(
        'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors w-full',
        demoMode ? 'bg-amber-500/10 text-amber-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
      )}
    >
      <FlaskConical className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Demo Mode</span>
          <span
            className={cn(
              'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors',
              demoMode ? 'bg-amber-500' : 'bg-gray-700'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                demoMode ? 'translate-x-[18px]' : 'translate-x-0.5'
              )}
            />
          </span>
        </>
      )}
    </button>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigation = useNavigation();
  const { eventId } = useEvent();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gray-950 border-r border-gray-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        <Link to={eventId ? `/events/${eventId}/dashboard` : '/events'} className="flex items-center gap-2" aria-label="Hackathon Hub">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Box className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-white">Hackathon Hub</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('text-gray-400 hover:text-white', collapsed && 'rotate-180')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Demo mode switch */}
      <div className={cn('border-t border-gray-800 py-3', collapsed ? 'px-2' : 'px-4')}>
        <DemoModeToggle collapsed={collapsed} />
      </div>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-800">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-full justify-center"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar
                  src={null}
                  fallback={user?.full_name || 'U'}
                  size="sm"
                  className="cursor-pointer"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuLabel className="font-medium">{user?.full_name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar
              src={null}
              fallback={user?.full_name || 'U'}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-gray-400 hover:text-red-400"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

// Mobile sidebar sheet
export function MobileSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigation = useNavigation();
  const { eventId } = useEvent();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <div className="flex items-center justify-between mb-6">
          <Link to={eventId ? `/events/${eventId}/dashboard` : '/events'} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Box className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">Hackathon Hub</span>
          </Link>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        </div>

        <nav className="space-y-1 mb-6" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 pt-4">
          <div className="mb-4">
            <DemoModeToggle />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <Avatar src={null} fallback={user?.full_name || 'U'} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}