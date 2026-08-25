'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu';
import { CommandPalette, CommandGroupWrapper, CommandItemComp, CommandSeparatorComp } from '@/components/ui/CommandPalette';
import { useAuth, useEvent } from '@/app/providers';
import { EventSelector } from './EventSelector';
import { Search, Bell, Settings, LogOut, HelpCircle, Keyboard } from 'lucide-react';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const { eventId } = useEvent();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Handle ⌘K / Ctrl+K globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event-scoped navigation targets; fall back to the events hub
  const base = eventId ? `/events/${eventId}` : '/events';

  const commandItems = [
    {
      group: 'Navigation',
      items: [
        { label: 'Dashboard', shortcut: '⌘1', href: `${base}/dashboard` },
        { label: 'Hardware', shortcut: '⌘2', href: `${base}/hardware` },
        { label: 'Venue', shortcut: '⌘3', href: `${base}/venue` },
        { label: 'Projects', shortcut: '⌘4', href: `${base}/projects` },
        { label: 'Judging', shortcut: '⌘5', href: `${base}/judging` },
        { label: 'Team', shortcut: '⌘6', href: `${base}/team` },
      ],
    },
    {
      group: 'Actions',
      items: [
        { label: 'New Hardware Item', shortcut: '⌘N', action: 'new-hardware' },
        { label: 'New Venue Location', shortcut: '⇧⌘V', action: 'new-venue' },
        { label: 'Create Project', shortcut: '⇧⌘P', action: 'new-project' },
      ],
    },
    {
      group: 'Settings',
      items: [
        { label: 'Settings', shortcut: '⌘,', action: 'settings' },
        { label: 'Keyboard Shortcuts', shortcut: '⌘/', action: 'shortcuts' },
        { label: 'Help & Docs', shortcut: '⌘?', action: 'help' },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile menu + Search/Command */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Command Palette Trigger */}
          <Button
            variant="ghost"
            onClick={() => setCommandOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            aria-label="Open command palette (⌘K)"
          >
            <Search className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-400">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono text-gray-500 bg-gray-700 rounded">
              <span className="text-gray-400">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Center: Event Selector */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <EventSelector />
        </div>

        {/* Right: Notifications + User Menu */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-5 w-5 text-gray-400 hover:text-white" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-gray-400">No new notifications</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded-lg">
                <Avatar
                  src={null}
                  fallback={user?.full_name || 'U'}
                  size="sm"
                />
                <span className="hidden sm:block text-sm font-medium text-white truncate max-w-[120px]">
                  {user?.full_name}
                </span>
                <span className="hidden sm:block px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">
                  {user?.global_role}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel className="font-medium">{user?.full_name}</DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs text-gray-400">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="h-4 w-4 mr-2" />
                Help & Documentation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Keyboard className="h-4 w-4 mr-2" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Command Palette */}
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
        >
          {commandItems.map(({ group, items }) => (
            <CommandGroupWrapper key={group} heading={group}>
              {items.map((item) => (
                <CommandItemComp
                  key={item.label}
                  onSelect={() => {
                    if ('href' in item) {
                      window.location.href = item.href;
                    }
                    setCommandOpen(false);
                  }}
                  shortcut={item.shortcut}
                >
                  {item.label}
                </CommandItemComp>
              ))}
            </CommandGroupWrapper>
          ))}
          <CommandSeparatorComp />
          <CommandItemComp
            onSelect={logout}
            shortcut="⇧⌘Q"
          >
            Logout
          </CommandItemComp>
        </CommandPalette>
      </div>
    </header>
  );
}