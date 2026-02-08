'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'small' | 'default' | 'large';
}

interface PageLoadingProps {
  className?: string;
}

// ============================================================================
// Component - Elegant Loading Spinner
// ============================================================================

export function LoadingState({ 
  message = 'Loading...',
  className,
  size = 'default'
}: LoadingStateProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const strokeWidth = {
    small: 2,
    default: 2,
    large: 3,
  };

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Elegant spinner with accent color */}
      <motion.div
        className={cn('relative', sizeClasses[size])}
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: 'linear' 
        }}
      >
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            strokeLinecap="round"
            className="text-text-muted"
            opacity="0.2"
          />
          <motion.path
            d="M12 2C6.477 2 2 6.477 2 12"
            stroke="currentColor"
            strokeWidth={strokeWidth[size]}
            strokeLinecap="round"
            className="text-accent"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
        </svg>
      </motion.div>
      
      {/* Loading message */}
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-caption text-text-tertiary font-secondary"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

// ============================================================================
// Component - Full Page Loading
// ============================================================================

export function PageLoading({ className }: PageLoadingProps) {
  return (
    <div 
      className={cn(
        'min-h-screen flex flex-col items-center justify-center',
        'bg-bg-primary',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-8"
      >
        {/* Logo/Brand mark */}
        <motion.div
          className="w-16 h-16 rounded-full border-2 border-accent/30 flex items-center justify-center"
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(196, 167, 125, 0.1)',
              '0 0 40px rgba(196, 167, 125, 0.2)',
              '0 0 20px rgba(196, 167, 125, 0.1)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-primary text-2xl text-accent">H</span>
        </motion.div>
        
        {/* Loading spinner */}
        <LoadingState message="Entering the sanctuary..." size="default" />
      </motion.div>
    </div>
  );
}

// ============================================================================
// Component - Skeleton Loading (for content placeholders)
// ============================================================================

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-bg-tertiary rounded-md',
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Component - Text Skeleton
// ============================================================================

interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="1rem"
        />
      ))}
    </div>
  );
}
