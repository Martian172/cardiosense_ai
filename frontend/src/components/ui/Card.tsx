import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'primary' | 'danger' | 'secondary' | 'none';
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const glowClasses = {
  primary: 'hover:shadow-[0_0_20px_rgba(0,212,170,0.25)] hover:border-primary/30',
  danger: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:border-danger/30',
  secondary: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:border-secondary/30',
  none: '',
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  none: '',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glow = 'none', hoverable = false, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl',
          'transition-all duration-300',
          hoverable && 'cursor-pointer hover:-translate-y-0.5',
          glow !== 'none' && glowClasses[glow],
          paddingClasses[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-100', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}
