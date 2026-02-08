'use client';

import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PresenceIndicator } from '@/components/presence-indicator';
import { LoadingState } from '@/components/loading-state';
import { ErrorState, ConnectionError } from '@/components/error-state';
import { useAppStore } from '@/lib/store';
import { usePresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';

// ============================================================================
// Animation variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.4,
    },
  },
};

// ============================================================================
// Home Page Component
// ============================================================================

export default function HomePage() {
  const router = useRouter();
  const { 
    currentState, 
    setState, 
    beginSession, 
    error, 
    clearError,
    connectionStatus,
  } = useAppStore();
  
  // Get presence count (only when on landing)
  const { presenceCount, isConnected } = usePresence({ 
    enabled: currentState === 'LANDING' 
  });

  // Handle enter button click
  const handleEnter = useCallback(async () => {
    clearError();
    await beginSession();
    router.push('/moment');
  }, [beginSession, router, clearError]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    clearError();
    window.location.reload();
  }, [clearError]);

  // Show loading state while entering
  if (currentState === 'ENTERING') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Entering the sanctuary..." size="large" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorState
          title="Something went quietly wrong."
          message={error}
          actionLabel="Try Again"
          onRetry={handleRetry}
          onAction={() => {
            clearError();
            setState('LANDING');
          }}
        />
      </div>
    );
  }

  const isConnectionError = connectionStatus === 'error' || connectionStatus === 'disconnected';
  const isEnterDisabled = currentState === 'ENTERING' || isConnectionError;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        className="flex flex-col items-center text-center max-w-2xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo/Mark (optional) */}
        <motion.div
          variants={itemVariants}
          className="mb-12"
          aria-hidden="true"
        >
          <div className="w-12 h-12 rounded-full border border-accent/30 flex items-center justify-center">
            <span className="font-primary text-xl text-accent">H</span>
          </div>
        </motion.div>

        {/* Main title */}
        <motion.h1
          variants={itemVariants}
          className={cn(
            'font-primary font-light text-text-primary',
            'text-display-mobile md:text-display',
            'tracking-tight leading-tight',
            'mb-6'
          )}
        >
          You Are Held
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className={cn(
            'font-secondary text-body-mobile md:text-body',
            'text-text-secondary',
            'max-w-md',
            'mb-16'
          )}
        >
          A quiet space to simply be.
        </motion.p>

        {/* Connection error warning */}
        {isConnectionError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 w-full max-w-sm"
          >
            <ConnectionError onRetry={handleRetry} />
          </motion.div>
        )}

        {/* Enter button */}
        <motion.div variants={buttonVariants}>
          <Button
            onClick={handleEnter}
            disabled={isEnterDisabled}
            loading={currentState === 'ENTERING'}
            variant="primary"
            size="default"
            fullWidth
            className="md:min-w-[240px]"
            aria-label="Enter the sanctuary"
          >
            Enter
          </Button>
        </motion.div>

        {/* Presence count (optional, below fold) */}
        {presenceCount > 0 && isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="mt-16"
          >
            <PresenceIndicator 
              count={presenceCount} 
              pulsing={false}
            />
          </motion.div>
        )}

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className={cn(
            'mt-auto pt-16',
            'font-secondary text-micro',
            'text-text-muted'
          )}
        >
          Press Tab to navigate
        </motion.p>
      </motion.div>
    </div>
  );
}
