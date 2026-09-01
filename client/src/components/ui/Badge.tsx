import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  dotColor?: string;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot, dotColor, children, ...props }, ref) => {
    const variantStyles = {
      default: 'badge-neutral',
      success: 'badge-success',
      warning: 'badge-warning',
      danger: 'badge-danger',
      info: 'badge-info',
      primary: 'badge-primary',
      neutral: 'badge-neutral',
    };
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-2.5 py-1 text-xs',
    };

    return (
      <span
        ref={ref}
        className={cn('badge', variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {dot && (
          <span
            className="relative flex h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor || 'currentColor' }}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

// Status badge helper
export function StatusBadge({ status, label: labelOverride }: { status: string; label?: string }) {
  const statusVariants: Record<string, BadgeProps['variant']> = {
    available: 'success',
    checked_out: 'warning',
    damaged: 'danger',
    overdue: 'danger',
    returned: 'neutral',
    pending: 'primary',
    approved: 'success',
    rejected: 'danger',
    active: 'primary',
    cancelled: 'neutral',
    draft: 'neutral',
    submitted: 'primary',
    disqualified: 'danger',
    open: 'warning',
    investigating: 'info',
    resolved: 'success',
    forming: 'primary',
    full: 'success',
    dissolved: 'neutral',
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
    minor: 'info',
    moderate: 'warning',
    major: 'danger',
  };

  const variant = statusVariants[status] || 'neutral';
  const label = labelOverride ?? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return <Badge variant={variant}>{label}</Badge>;
}