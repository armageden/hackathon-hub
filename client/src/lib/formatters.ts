import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear, parseISO } from 'date-fns';

/**
 * Format a number compactly (1.2k, 3.4M, etc.)
 */
export function formatCompact(num: number, decimals = 1): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(decimals).replace(/\.0+$/, '') + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(decimals).replace(/\.0+$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(decimals).replace(/\.0+$/, '') + 'k';
  return num.toString();
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US', options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2, ...options }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Format a date for display (e.g., "Jan 15, 2024")
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy', ({ ...options }) as Parameters<typeof format>[2]);
}

/**
 * Format a date as a short axis/tick label (e.g., "Jan 15")
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format relative time with smart formatting (today, yesterday, this week, etc.)
 */
export function formatSmartDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(d)) {
    return `Today at ${format(d, 'h:mm a')}`;
  }
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }
  if (isThisWeek(d)) {
    return format(d, 'EEEE \'at\' h:mm a');
  }
  if (isThisYear(d)) {
    return format(d, 'MMM d \'at\' h:mm a');
  }
  return format(d, 'MMM d, yyyy \'at\' h:mm a');
}

/**
 * Format date range
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  
  if (format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')) {
    return `${format(s, 'MMM d, yyyy')} · ${format(s, 'h:mm a')} - ${format(e, 'h:mm a')}`;
  }
  
  if (format(s, 'yyyy') === format(e, 'yyyy')) {
    return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`;
  }
  
  return `${format(s, 'MMM d, yyyy')} - ${format(e, 'MMM d, yyyy')}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase or snake_case to Title Case
 */
export function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/\s\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Generate initials from name
 */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Format phone number (US format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format UUID for display (first 8 chars + ...)
 */
export function formatUUID(uuid: string, chars = 8): string {
  if (uuid.length <= chars + 3) return uuid;
  return `${uuid.slice(0, chars)}...${uuid.slice(-3)}`;
}

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(capitalize)
    .join(' ');
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: string): string {
  const statusColors: Record<string, string> = {
    available: 'badge-success',
    checked_out: 'badge-warning',
    damaged: 'badge-danger',
    overdue: 'badge-danger',
    returned: 'badge-neutral',
    pending: 'badge-primary',
    approved: 'badge-success',
    rejected: 'badge-danger',
    active: 'badge-primary',
    cancelled: 'badge-neutral',
    draft: 'badge-neutral',
    submitted: 'badge-primary',
    disqualified: 'badge-danger',
    open: 'badge-warning',
    investigating: 'badge-info',
    resolved: 'badge-success',
    forming: 'badge-primary',
    full: 'badge-success',
    dissolved: 'badge-neutral',
    low: 'badge-info',
    medium: 'badge-warning',
    high: 'badge-danger',
    critical: 'badge-danger',
    minor: 'badge-info',
    moderate: 'badge-warning',
    major: 'badge-danger',
  };
  return statusColors[status] || 'badge-neutral';
}

/**
 * Format a list of items as a human-readable string
 */
export function formatList(items: string[], maxItems = 3): string {
  if (items.length === 0) return 'None';
  if (items.length <= maxItems) return items.join(', ');
  return `${items.slice(0, maxItems).join(', ')} and ${items.length - maxItems} more`;
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
}

/**
 * Format a score (0-100) with color indicator
 */
export function formatScore(score: number | null | undefined): { text: string; color: string } {
  if (score === null || score === undefined) return { text: '—', color: 'text-gray-500' };
  const rounded = Math.round(score);
  if (rounded >= 90) return { text: `${rounded}`, color: 'text-emerald-400' };
  if (rounded >= 70) return { text: `${rounded}`, color: 'text-amber-400' };
  if (rounded >= 50) return { text: `${rounded}`, color: 'text-orange-400' };
  return { text: `${rounded}`, color: 'text-red-400' };
}

/**
 * Format a percentage score
 */
export function formatPercentageScore(score: number | null | undefined): { text: string; color: string } {
  if (score === null || score === undefined) return { text: '—', color: 'text-gray-500' };
  const rounded = Math.round(score);
  if (rounded >= 90) return { text: `${rounded}%`, color: 'text-emerald-400' };
  if (rounded >= 70) return { text: `${rounded}%`, color: 'text-amber-400' };
  if (rounded >= 50) return { text: `${rounded}%`, color: 'text-orange-400' };
  return { text: `${rounded}%`, color: 'text-red-400' };
}
/**
 * Due-date urgency for hardware checkouts: overdue (red), due within
 * DUE_SOON_WINDOW (amber), or normal.
 */
export type DueState = 'none' | 'overdue' | 'due-soon' | 'ok';

const DUE_SOON_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export function getDueState(dueAt: string | null | undefined, status: string): DueState {
  if (!dueAt || (status !== 'active' && status !== 'overdue')) return 'none';
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff <= 0) return 'overdue';
  if (diff <= DUE_SOON_WINDOW_MS) return 'due-soon';
  return 'ok';
}

export const dueStateStyles: Record<DueState, { text: string; icon: string; label?: string }> = {
  none: { text: 'text-gray-500', icon: 'text-gray-500' },
  ok: { text: 'text-white', icon: 'text-gray-500' },
  'due-soon': { text: 'text-amber-400', icon: 'text-amber-400', label: 'DUE SOON' },
  overdue: { text: 'text-red-400', icon: 'text-red-400', label: 'OVERDUE' },
};
