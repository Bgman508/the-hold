'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'pill';
  size?: 'default' | 'small';
  loading?: boolean;
  fullWidth?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'default', 
    loading = false,
    fullWidth = false,
    disabled,
    children,
    ...props 
  }, ref) => {
    // Base styles for all button variants
    const baseStyles = `
      inline-flex items-center justify-center
      font-secondary font-medium
      transition-all duration-normal ease-slow
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-primary
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    `;
    
    // Variant-specific styles
    const variantStyles = {
      primary: `
        bg-accent text-bg-primary
        uppercase tracking-[0.08em]
        hover:bg-accent-hover hover:scale-[1.02]
        active:scale-[0.98]
        shadow-soft hover:shadow-glow
      `,
      secondary: `
        bg-transparent border border-text-muted text-text-tertiary
        hover:border-text-tertiary hover:text-text-secondary
        active:scale-[0.98]
      `,
      ghost: `
        bg-transparent text-text-tertiary
        hover:text-text-secondary hover:bg-bg-tertiary
        active:scale-[0.98]
      `,
      pill: `
        bg-transparent border border-text-muted text-text-tertiary
        rounded-full
        hover:border-text-tertiary hover:text-text-secondary
        active:scale-[0.98]
      `,
    };
    
    // Size-specific styles
    const sizeStyles = {
      default: `
        min-h-[56px] px-8 py-3
        text-body-sm
        rounded-md
      `,
      small: `
        min-h-[40px] px-6 py-2
        text-caption
        rounded-md
      `,
    };
    
    // Pill variant always uses full rounding
    const pillOverride = variant === 'pill' ? 'rounded-full' : '';
    
    // Full width override
    const widthStyles = fullWidth ? 'w-full' : 'min-w-[200px]';

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          pillOverride,
          widthStyles,
          className
        )}
        disabled={disabled || loading}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Entering...</span>
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
