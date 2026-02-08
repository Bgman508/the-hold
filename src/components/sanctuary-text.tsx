'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMicrocopy } from '@/hooks/use-audio';

// ============================================================================
// Types
// ============================================================================

interface SanctuaryTextProps {
  interval?: number;
  enabled?: boolean;
  className?: string;
}

interface StaticSanctuaryTextProps {
  phrase?: string;
  className?: string;
}

// ============================================================================
// Component - Rotating Microcopy
// ============================================================================

export function SanctuaryText({ 
  interval = 30000, 
  enabled = true,
  className 
}: SanctuaryTextProps) {
  const { currentPhrase, currentIndex } = useMicrocopy({ interval, enabled });

  return (
    <div 
      className={cn(
        'relative min-h-[2rem] flex items-center justify-center',
        className
      )}
      role="region"
      aria-label="Sanctuary message"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ 
            duration: 0.5, 
            ease: [0.22, 1, 0.36, 1] 
          }}
          className="font-primary text-body text-text-secondary italic text-center"
        >
          &ldquo;{currentPhrase}&rdquo;
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Component - Static Microcopy (for exit screen, etc.)
// ============================================================================

export function StaticSanctuaryText({ 
  phrase,
  className 
}: StaticSanctuaryTextProps) {
  if (!phrase) return null;

  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'font-primary text-body text-text-secondary italic text-center',
        className
      )}
    >
      &ldquo;{phrase}&rdquo;
    </motion.p>
  );
}

// ============================================================================
// Component - Microcopy List (for reference/debugging)
// ============================================================================

import { SANCTUARY_PHRASES } from '@/lib/store';

interface MicrocopyListProps {
  className?: string;
}

export function MicrocopyList({ className }: MicrocopyListProps) {
  return (
    <ul className={cn('space-y-2', className)}>
      {SANCTUARY_PHRASES.map((phrase, index) => (
        <li 
          key={index}
          className="font-primary text-body-sm text-text-tertiary italic"
        >
          {index + 1}. &ldquo;{phrase}&rdquo;
        </li>
      ))}
    </ul>
  );
}
