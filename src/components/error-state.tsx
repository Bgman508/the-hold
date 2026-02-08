'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

// ============================================================================
// Types
// ============================================================================

interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

interface ConnectionErrorProps {
  onRetry?: () => void;
  className?: string;
}

interface AudioErrorProps {
  onContinue?: () => void;
  className?: string;
}

// ============================================================================
// Component - Generic Error State
// ============================================================================

export function ErrorState({
  title = 'Something went quietly wrong.',
  message,
  actionLabel = 'Try Again',
  onAction,
  className,
  showRetry = true,
  onRetry,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'p-8 max-w-md mx-auto',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Error icon - calm, not alarming */}
      <div 
        className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-6"
        aria-hidden="true"
      >
        <svg
          className="w-8 h-8 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      
      {/* Error title */}
      <h2 className="font-primary text-h3 text-text-primary mb-3">
        {title}
      </h2>
      
      {/* Error message */}
      <p className="font-secondary text-body-sm text-text-secondary mb-8">
        {message}
      </p>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="primary">
            {actionLabel}
          </Button>
        )}
        
        {onAction && (
          <Button onClick={onAction} variant="secondary">
            Return Home
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Component - Connection Error (WebSocket disconnected)
// ============================================================================

export function ConnectionError({ onRetry, className }: ConnectionErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'p-6 rounded-lg bg-bg-secondary/50 border border-text-muted/30',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Connection status indicator */}
      <div className="flex items-center gap-3 mb-4">
        <span 
          className="w-2 h-2 rounded-full bg-error animate-pulse"
          aria-hidden="true"
        />
        <span className="text-caption text-text-tertiary uppercase tracking-wider">
          Connection lost
        </span>
      </div>
      
      {/* Message */}
      <p className="font-primary text-body text-text-secondary mb-4">
        The space will return.
      </p>
      
      <p className="font-secondary text-caption text-text-tertiary mb-6">
        We&apos;re trying to reconnect you...
      </p>
      
      {/* Retry button */}
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="small">
          Reconnect Now
        </Button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Component - Audio Error
// ============================================================================

export function AudioError({ onContinue, className }: AudioErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'p-6 rounded-lg bg-bg-secondary/50 border border-text-muted/30',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Audio icon */}
      <div 
        className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <svg
          className="w-6 h-6 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      </div>
      
      {/* Message */}
      <p className="font-primary text-body text-text-secondary mb-2">
        The moment isn&apos;t loading.
      </p>
      
      <p className="font-secondary text-caption text-text-tertiary mb-6">
        You can still enter in silence.
      </p>
      
      {/* Continue button */}
      {onContinue && (
        <Button onClick={onContinue} variant="secondary" size="small">
          Enter Quietly
        </Button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Component - Server Error
// ============================================================================

interface ServerErrorProps {
  onRefresh?: () => void;
  className?: string;
}

export function ServerError({ onRefresh, className }: ServerErrorProps) {
  return (
    <ErrorState
      title="The sanctuary is resting."
      message="We're experiencing some quiet technical difficulties. Please try again in a moment."
      actionLabel="Refresh Page"
      onAction={onRefresh || (() => window.location.reload())}
      className={className}
    />
  );
}

// ============================================================================
// Component - Inline Error (for forms, etc.)
// ============================================================================

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'inline-flex items-center gap-2',
        'text-caption text-error',
        className
      )}
      role="alert"
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {message}
    </motion.span>
  );
}
