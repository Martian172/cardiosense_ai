import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'danger' | 'warning' | 'secondary' | 'success' | 'muted';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary/20 text-primary border-primary/30',
  danger: 'bg-danger/20 text-danger border-danger/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  secondary: 'bg-secondary/20 text-secondary-300 border-secondary/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  muted: 'bg-white/5 text-slate-400 border-white/10',
};

const dotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary',
  danger: 'bg-danger',
  warning: 'bg-warning',
  secondary: 'bg-secondary',
  success: 'bg-emerald-400',
  muted: 'bg-slate-400',
};

export function Badge({ variant = 'muted', size = 'md', dot, pulse, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant], pulse && 'animate-pulse')} />
      )}
      {children}
    </span>
  );
}
