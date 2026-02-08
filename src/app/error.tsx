'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service (if available)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center max-w-md"
        role="alert"
        aria-live="assertive"
      >
        {/* Error icon */}
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

        {/* Title */}
        <h1 className={cn(
          'font-primary text-h2-mobile md:text-h2',
          'text-text-primary',
          'mb-4'
        )}>
          Something went quietly wrong.
        </h1>

        {/* Message */}
        <p className={cn(
          'font-secondary text-body-mobile md:text-body',
          'text-text-secondary',
          'mb-8'
        )}>
          We&apos;re experiencing some quiet technical difficulties. 
          Please try again, or return to the sanctuary.
        </p>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 p-4 bg-bg-secondary rounded-lg text-left overflow-auto max-w-full">
            <p className="text-caption text-text-tertiary mb-2">Error details:</p>
            <pre className="text-micro text-error font-mono whitespace-pre-wrap">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={reset} variant="primary">
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'} 
            variant="secondary"
          >
            Return Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
