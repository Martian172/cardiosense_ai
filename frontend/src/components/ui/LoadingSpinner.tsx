import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-primary/20 border-t-primary animate-spin',
          sizeClasses[size],
        )}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated ECG pulse */}
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-2 border-primary/20 animate-ping absolute" />
          <div className="h-10 w-10 rounded-full border-2 border-primary/40 animate-ping absolute animation-delay-150" />
          <div className="h-6 w-6 rounded-full bg-primary/60 animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-white/5 animate-pulse',
        className,
      )}
    />
  );
}
