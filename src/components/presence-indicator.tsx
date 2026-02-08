'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PresenceIndicatorProps {
  count: number;
  pulsing?: boolean;
  className?: string;
  showLabel?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function PresenceIndicator({ 
  count, 
  pulsing = true,
  className,
  showLabel = true,
}: PresenceIndicatorProps) {
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${count} people present`}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        {pulsing && (
          <span 
            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"
            aria-hidden="true"
          />
        )}
        <span 
          className={cn(
            'relative inline-flex rounded-full h-2 w-2 bg-accent',
            pulsing && 'animate-pulse-subtle'
          )}
          aria-hidden="true"
        />
      </span>
      
      {/* Count text */}
      {showLabel && (
        <span className="text-caption text-text-tertiary">
          {count} present
        </span>
      )}
    </motion.div>
  );
}

// ============================================================================
// Compact version for small spaces
// ============================================================================

interface CompactPresenceIndicatorProps {
  count: number;
  className?: string;
}

export function CompactPresenceIndicator({ 
  count, 
  className 
}: CompactPresenceIndicatorProps) {
  return (
    <span 
      className={cn(
        'text-caption text-text-tertiary',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`${count} people present`}
    >
      {count} present
    </span>
  );
}
