import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-base-50 hover:bg-primary-600 shadow-glow-primary hover:shadow-glow-primary font-semibold',
  secondary:
    'bg-secondary text-white hover:bg-secondary-600 shadow-glow-secondary font-semibold',
  danger:
    'bg-danger text-white hover:bg-danger-600 shadow-glow-danger font-semibold',
  ghost:
    'bg-transparent text-slate-300 hover:bg-white/10 hover:text-white',
  outline:
    'border border-white/20 bg-transparent text-slate-300 hover:bg-white/10 hover:border-white/40 hover:text-white',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, className, disabled, ...props },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...(props as React.ComponentPropsWithRef<typeof motion.button>)}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
