'use client';

import * as React from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useAudio } from '@/hooks/use-audio';
import { AudioState } from '@/lib/audio/types';

// ============================================================================
// Types
// ============================================================================

interface AudioEngineProps {
  /** Auto-play when entering moment */
  autoPlay?: boolean;
  /** Called when audio engine is ready */
  onLoad?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Use procedural synthesis (true) or HTML5 audio (false) */
  useProcedural?: boolean;
  /** Audio URL for HTML5 audio fallback */
  audioUrl?: string;
}

// ============================================================================
// Component - AudioEngine (Procedural Web Audio Controller)
// ============================================================================

/**
 * AudioEngine - Procedural ambient audio controller
 * 
 * Uses Web Audio API for continuous, evolving ambient sound.
 * No external audio files required - all sound is synthesized.
 * 
 * Features:
 * - Continuous adaptive audio (no track boundaries)
 * - State machine: entry → settle → hold → soften → exit
 * - Breath-paced rhythm
 * - Silence as an element
 * - Never clips (gain staging + limiter)
 * 
 * Usage:
 * ```tsx
 * <AudioEngine autoPlay />
 * ```
 */
export function AudioEngine({ 
  autoPlay = false,
  onLoad,
  onError,
  useProcedural = true,
  audioUrl,
}: AudioEngineProps) {
  // Procedural audio hook
  const audio = useAudio({
    onStateChange: (from, to, sessionData) => {
      console.log(`[AudioEngine] State: ${from} -> ${to}`, sessionData);
    },
    onAdaptation: (level, sessionData) => {
      console.log(`[AudioEngine] Adaptation: ${(level * 100).toFixed(1)}%`);
    },
    onError: (error) => {
      console.error('[AudioEngine] Error:', error);
      onError?.(error);
    },
  });
  
  // App store integration
  const { 
    audioState: storeAudioState, 
    setAudioState: setStoreAudioState,
    audioVolume,
    currentState,
  } = useAppStore();

  // HTML5 audio fallback refs
  const html5AudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Procedural Audio Functions
  // ============================================================================

  const initializeAndStart = useCallback(async () => {
    try {
      await audio.initialize();
      audio.start();
      setStoreAudioState('playing');
      onLoad?.();
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize:', error);
      setStoreAudioState('error');
      onError?.(error as Error);
    }
  }, [audio, onLoad, onError, setStoreAudioState]);

  const stopAudio = useCallback(() => {
    audio.stop();
    setStoreAudioState('idle');
  }, [audio, setStoreAudioState]);

  // ============================================================================
  // HTML5 Audio Fallback Functions
  // ============================================================================

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const fadeInHTML5 = useCallback(async (duration: number = 2000) => {
    if (!html5AudioRef.current) return;
    
    clearFadeInterval();
    
    const audioEl = html5AudioRef.current;
    const targetVolume = audioVolume;
    const steps = 30;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    
    audioEl.volume = 0;
    
    try {
      await audioEl.play();
    } catch (err) {
      console.warn('[AudioEngine] Failed to play HTML5 audio:', err);
      setStoreAudioState('error');
      return;
    }
    
    let currentStep = 0;
    
    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVolume = Math.min(targetVolume, volumeStep * currentStep);
      audioEl.volume = newVolume;
      
      if (currentStep >= steps) {
        clearFadeInterval();
      }
    }, stepDuration);
  }, [audioVolume, clearFadeInterval, setStoreAudioState]);

  const fadeOutHTML5 = useCallback(async (duration: number = 3000) => {
    if (!html5AudioRef.current) return;
    
    clearFadeInterval();
    
    const audioEl = html5AudioRef.current;
    const startVolume = audioEl.volume;
    const steps = 30;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;
    
    let currentStep = 0;
    
    return new Promise<void>((resolve) => {
      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
        audioEl.volume = newVolume;
        
        if (currentStep >= steps || newVolume <= 0) {
          clearFadeInterval();
          audioEl.pause();
          audioEl.volume = startVolume;
          resolve();
        }
      }, stepDuration);
    });
  }, [clearFadeInterval]);

  // ============================================================================
  // Effects - Procedural Audio
  // ============================================================================

  useEffect(() => {
    if (!useProcedural) return;

    // Handle state changes from app store
    switch (currentState) {
      case 'IN_MOMENT':
        // Initialize and start when entering moment
        if (!audio.isInitialized && autoPlay) {
          initializeAndStart();
        } else if (audio.isInitialized && !audio.isPlaying) {
          audio.start();
          setStoreAudioState('playing');
        }
        break;
        
      case 'LEAVING':
      case 'EXITED':
        // Stop when leaving
        if (audio.isPlaying) {
          stopAudio();
        }
        break;
        
      default:
        break;
    }
  }, [currentState, autoPlay, useProcedural, audio, initializeAndStart, stopAudio, setStoreAudioState]);

  // Update volume
  useEffect(() => {
    if (useProcedural && audio.isInitialized) {
      audio.setMasterGain(audioVolume);
    }
  }, [audioVolume, useProcedural, audio]);

  // ============================================================================
  // Effects - HTML5 Audio Fallback
  // ============================================================================

  useEffect(() => {
    if (useProcedural || !audioUrl) return;
    
    const audioEl = new Audio(audioUrl);
    audioEl.loop = true;
    audioEl.volume = 0;
    audioEl.preload = 'auto';
    
    html5AudioRef.current = audioEl;
    setStoreAudioState('loading');
    
    // Event listeners
    const handleCanPlay = () => {
      setStoreAudioState('idle');
      onLoad?.();
    };
    
    const handlePlay = () => {
      setStoreAudioState('playing');
    };
    
    const handlePause = () => {
      setStoreAudioState('paused');
    };
    
    const handleError = () => {
      setStoreAudioState('error');
      onError?.(new Error('Failed to load audio'));
    };
    
    audioEl.addEventListener('canplay', handleCanPlay);
    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('error', handleError);
    
    // Auto-play if requested and in moment
    if (autoPlay && currentState === 'IN_MOMENT') {
      fadeInHTML5();
    }
    
    return () => {
      clearFadeInterval();
      audioEl.pause();
      audioEl.removeEventListener('canplay', handleCanPlay);
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('error', handleError);
      html5AudioRef.current = null;
    };
  }, [audioUrl, autoPlay, currentState, useProcedural, setStoreAudioState, onLoad, onError, fadeInHTML5, clearFadeInterval]);

  // Handle state changes for HTML5 audio
  useEffect(() => {
    if (useProcedural || !html5AudioRef.current) return;
    
    switch (currentState) {
      case 'IN_MOMENT':
        if (storeAudioState !== 'playing' && storeAudioState !== 'error') {
          fadeInHTML5();
        }
        break;
        
      case 'LEAVING':
      case 'EXITED':
        if (storeAudioState === 'playing') {
          fadeOutHTML5();
        }
        break;
        
      default:
        break;
    }
  }, [currentState, storeAudioState, useProcedural, fadeInHTML5, fadeOutHTML5]);

  // Update HTML5 volume
  useEffect(() => {
    if (!useProcedural && html5AudioRef.current && storeAudioState === 'playing') {
      html5AudioRef.current.volume = audioVolume;
    }
  }, [audioVolume, storeAudioState, useProcedural]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audio.destroy();
    };
  }, [audio]);

  // This component doesn't render anything visible
  return null;
}

// ============================================================================
// Hook - useAudioEngine
// ============================================================================

/**
 * Hook for accessing audio engine state and controls
 * 
 * Returns:
 * - audioState: Current audio state ('idle', 'playing', 'paused', 'error')
 * - audioVolume: Current volume (0-1)
 * - setAudioVolume: Function to set volume
 * - isPlaying: Boolean indicating if audio is playing
 * - isLoading: Boolean indicating if audio is loading
 * - hasError: Boolean indicating if there's an error
 * - initialize: Function to initialize audio (must be called from user gesture)
 * - start: Function to start audio
 * - stop: Function to stop audio
 */
export function useAudioEngine() {
  const { audioState, audioVolume, setAudioVolume } = useAppStore();
  const proceduralAudio = useAudio();
  
  return {
    // From store (HTML5 audio state)
    audioState,
    audioVolume,
    setAudioVolume,
    isPlaying: audioState === 'playing' || proceduralAudio.isPlaying,
    isLoading: audioState === 'loading',
    hasError: audioState === 'error' || proceduralAudio.state === 'error',
    
    // From procedural audio
    initialize: proceduralAudio.initialize,
    start: proceduralAudio.start,
    stop: proceduralAudio.stop,
    pause: proceduralAudio.pause,
    resume: proceduralAudio.resume,
    
    // Procedural audio state
    proceduralState: proceduralAudio.state,
    sessionTime: proceduralAudio.sessionTime,
    adaptationLevel: proceduralAudio.adaptationLevel,
    isInitialized: proceduralAudio.isInitialized,
  };
}

export default AudioEngine;
