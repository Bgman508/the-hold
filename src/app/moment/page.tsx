'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PresenceIndicator } from '@/components/presence-indicator';
import { SanctuaryText } from '@/components/sanctuary-text';
import { LoadingState } from '@/components/loading-state';
import { ErrorState, AudioError, ConnectionError } from '@/components/error-state';
import { AudioEngine } from '@/components/audio-engine';
import { useAppStore } from '@/lib/store';
import { usePresence } from '@/hooks/use-presence';
import { useSession } from '@/hooks/use-session';
import { cn } from '@/lib/utils';

// ============================================================================
// Exit Screen Component
// ============================================================================

interface ExitScreenProps {
  onComplete: () => void;
}

function ExitScreen({ onComplete }: ExitScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-12"
        aria-hidden="true"
      >
        <div className="w-16 h-16 rounded-full border border-accent/30 flex items-center justify-center">
          <span className="font-primary text-2xl text-accent">H</span>
        </div>
      </motion.div>

      {/* Exit message */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'font-primary text-h2-mobile md:text-h2',
          'text-text-primary',
          'mb-6 text-center'
        )}
      >
        You were held.
      </motion.h2>

      {/* Sub-message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className={cn(
          'font-secondary text-body-mobile md:text-body',
          'text-text-secondary',
          'text-center'
        )}
      >
        Return whenever you need.
      </motion.p>

      {/* Auto-return indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-12"
      >
        <div className="w-32 h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent/50"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4, ease: 'linear' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Moment Page Component
// ============================================================================

export default function MomentPage() {
  const router = useRouter();
  const [showExit, setShowExit] = useState(false);
  const [audioError, setAudioError] = useState<Error | null>(null);
  
  const { 
    currentState, 
    setState, 
    endSession, 
    currentMoment,
    error,
    clearError,
    connectionStatus,
  } = useAppStore();
  
  const { isAuthenticated } = useSession();
  const { presenceCount, isConnected } = usePresence({ enabled: true });

  // Fetch current moment on mount
  useEffect(() => {
    const fetchMoment = async () => {
      try {
        const response = await fetch('/api/moment/current');
        if (response.ok) {
          const data = await response.json();
          // Moment data is stored in the global state
        }
      } catch (err) {
        console.warn('Failed to fetch moment:', err);
      }
    };

    fetchMoment();
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleLeave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Redirect to home if not in a valid state
  useEffect(() => {
    if (currentState === 'LANDING' && !isAuthenticated) {
      router.push('/');
    }
  }, [currentState, isAuthenticated, router]);

  // Handle leave action
  const handleLeave = useCallback(async () => {
    await endSession();
    setShowExit(true);
  }, [endSession]);

  // Handle exit complete
  const handleExitComplete = useCallback(() => {
    setState('LANDING');
    router.push('/');
  }, [setState, router]);

  // Handle audio error
  const handleAudioError = useCallback((err: Error) => {
    setAudioError(err);
  }, []);

  // Handle continue without audio
  const handleContinueWithoutAudio = useCallback(() => {
    setAudioError(null);
  }, []);

  // Show loading state
  if (currentState === 'ENTERING') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Entering the moment..." size="large" />
      </div>
    );
  }

  // Show exit screen
  if (currentState === 'EXITED' || showExit) {
    return (
      <AnimatePresence mode="wait">
        <ExitScreen key="exit" onComplete={handleExitComplete} />
      </AnimatePresence>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorState
          title="Something went quietly wrong."
          message={error}
          actionLabel="Return Home"
          onAction={() => {
            clearError();
            setState('LANDING');
            router.push('/');
          }}
        />
      </div>
    );
  }

  const isConnectionError = connectionStatus === 'error';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Audio Engine (invisible) */}
      {currentMoment?.audioUrl && !audioError && (
        <AudioEngine
          audioUrl={currentMoment.audioUrl}
          autoPlay={true}
          onError={handleAudioError}
        />
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Back button */}
          <button
            onClick={handleLeave}
            className={cn(
              'w-10 h-10 rounded-full',
              'flex items-center justify-center',
              'text-text-tertiary hover:text-text-secondary',
              'transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary'
            )}
            aria-label="Return to entrance"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>

          {/* Close button */}
          <button
            onClick={handleLeave}
            className={cn(
              'w-10 h-10 rounded-full',
              'flex items-center justify-center',
              'text-text-tertiary hover:text-text-secondary',
              'transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary'
            )}
            aria-label="Leave this space"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center max-w-2xl mx-auto"
        >
          {/* Moment title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'font-primary font-light text-text-primary',
              'text-display-mobile md:text-display',
              'tracking-tight leading-tight',
              'mb-8'
            )}
          >
            You Are Held
          </motion.h1>

          {/* Presence indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mb-8"
          >
            <PresenceIndicator 
              count={presenceCount} 
              pulsing={true}
            />
          </motion.div>

          {/* Connection error */}
          {isConnectionError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 w-full max-w-sm"
            >
              <ConnectionError />
            </motion.div>
          )}

          {/* Audio error */}
          {audioError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 w-full max-w-sm"
            >
              <AudioError onContinue={handleContinueWithoutAudio} />
            </motion.div>
          )}

          {/* Sanctuary microcopy */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-16 min-h-[4rem] flex items-center"
          >
            <SanctuaryText interval={30000} enabled={true} />
          </motion.div>

          {/* Leave button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <Button
              onClick={handleLeave}
              variant="pill"
              size="small"
              aria-label="Leave this space quietly"
            >
              Leave quietly
            </Button>
          </motion.div>
        </motion.div>
      </main>

      {/* Keyboard hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2"
      >
        <p className="font-secondary text-micro text-text-muted">
          Press Escape to leave
        </p>
      </motion.div>
    </div>
  );
}
