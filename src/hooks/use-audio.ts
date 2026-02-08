/**
 * THE HOLD - useAudio React Hook
 * 
 * React hook for integrating the audio engine into components.
 * Provides controls, state tracking, and lifecycle management.
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { state, isPlaying, initialize, start, stop } = useAudio({
 *     onStateChange: (from, to) => console.log(`${from} -> ${to}`),
 *   });
 *   
 *   return (
 *     <button onClick={() => initialize().then(start)}>
 *       {isPlaying ? 'Stop' : 'Start'}
 *     </button>
 *   );
 * }
 * ```
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AudioEngine,
  getAudioEngine,
  destroyAudioEngine,
  AudioEngineOptions,
} from '../lib/audio/engine';
import {
  AudioState,
  AudioEngineConfig,
  EffectsConfig,
  SessionData,
  UseAudioReturn,
} from '../lib/audio/types';

// Subscriber type for external store
type Subscriber = () => void;

// Create a simple store for audio state that works with useSyncExternalStore
class AudioStateStore {
  private subscribers: Set<Subscriber> = new Set();
  private engine: AudioEngine | null = null;
  
  setEngine(engine: AudioEngine | null) {
    this.engine = engine;
    this.notify();
  }
  
  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }
  
  private notify() {
    this.subscribers.forEach(sub => sub());
  }
  
  getState(): AudioState {
    return this.engine?.getState() ?? 'idle';
  }
  
  getSessionTime(): number {
    return this.engine?.getCurrentSessionTime() ?? 0;
  }
  
  getAdaptationLevel(): number {
    return this.engine?.getAdaptationLevel() ?? 0;
  }
  
  isInitialized(): boolean {
    return this.engine?.getIsInitialized() ?? false;
  }
  
  isPlaying(): boolean {
    return this.engine?.isPlaying() ?? false;
  }
}

const globalStore = new AudioStateStore();

// Hook options interface
export interface UseAudioOptions extends AudioEngineOptions {
  /** Auto-initialize on mount (requires user gesture) */
  autoInitialize?: boolean;
  /** Auto-start after initialization */
  autoStart?: boolean;
}

/**
 * useAudio hook
 * 
 * Provides reactive access to the audio engine state and controls.
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { autoInitialize, autoStart, ...engineOptions } = options;
  
  // Use sync external store for state that needs to be in sync with audio engine
  const state = useSyncExternalStore(
    (callback) => globalStore.subscribe(callback),
    () => globalStore.getState(),
    () => 'idle' // Server snapshot
  );
  
  // Use refs for engine instance to persist across renders
  const engineRef = useRef<AudioEngine | null>(null);
  const initAttemptedRef = useRef(false);
  
  // Local state for values that need React re-renders
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [adaptationLevel, setAdaptationLevel] = useState(0);
  
  // Derived state
  const isPlaying = state === 'entry' || state === 'settle' || state === 'hold';
  
  // Get or create engine instance
  const getEngine = useCallback((): AudioEngine => {
    if (!engineRef.current) {
      engineRef.current = getAudioEngine({
        ...engineOptions,
        onStateChange: (from, to, sessionData) => {
          // Update store to trigger re-renders
          globalStore.setEngine(engineRef.current);
          
          // Call user's callback
          engineOptions.onStateChange?.(from, to, sessionData);
        },
        onAdaptation: (level, sessionData) => {
          setAdaptationLevel(level);
          engineOptions.onAdaptation?.(level, sessionData);
        },
        onError: (error) => {
          console.error('[useAudio] Audio engine error:', error);
          engineOptions.onError?.(error);
        },
      });
      
      globalStore.setEngine(engineRef.current);
    }
    return engineRef.current;
  }, [engineOptions]);
  
  /**
   * Initialize the audio engine
   * Must be called from a user gesture context
   */
  const initialize = useCallback(async (): Promise<void> => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;
    
    try {
      const engine = getEngine();
      await engine.initialize();
      setIsInitialized(true);
      globalStore.setEngine(engine);
    } catch (error) {
      initAttemptedRef.current = false;
      throw error;
    }
  }, [getEngine]);
  
  /**
   * Start audio playback
   */
  const start = useCallback((): void => {
    const engine = getEngine();
    
    if (!engine.getIsInitialized()) {
      console.warn('[useAudio] Engine not initialized. Call initialize() first.');
      return;
    }
    
    engine.start();
  }, [getEngine]);
  
  /**
   * Stop audio playback (fade to exit)
   */
  const stop = useCallback((): void => {
    const engine = getEngine();
    engine.stop();
  }, [getEngine]);
  
  /**
   * Pause audio (suspend context)
   */
  const pause = useCallback((): void => {
    const engine = getEngine();
    engine.pause();
  }, [getEngine]);
  
  /**
   * Resume audio context
   */
  const resume = useCallback((): void => {
    const engine = getEngine();
    engine.resume();
  }, [getEngine]);
  
  /**
   * Set master gain
   */
  const setMasterGain = useCallback((gain: number): void => {
    const engine = getEngine();
    engine.setMasterGain(gain);
  }, [getEngine]);
  
  /**
   * Update effects configuration
   */
  const setEffects = useCallback((effects: Partial<EffectsConfig>): void => {
    const engine = getEngine();
    // Effects are updated through the engine's effects chain
    // This would need to be exposed in the engine
    console.warn('[useAudio] setEffects not yet implemented');
  }, [getEngine]);
  
  /**
   * Destroy the audio engine
   */
  const destroy = useCallback((): void => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
      globalStore.setEngine(null);
    }
    destroyAudioEngine();
    setIsInitialized(false);
    initAttemptedRef.current = false;
  }, []);
  
  // Update session time periodically
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (engine) {
        setSessionTime(engine.getCurrentSessionTime());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  // Auto-initialize effect
  useEffect(() => {
    if (autoInitialize && !initAttemptedRef.current) {
      initialize().then(() => {
        if (autoStart) {
          start();
        }
      }).catch((error) => {
        console.error('[useAudio] Auto-initialization failed:', error);
      });
    }
  }, [autoInitialize, autoStart, initialize, start]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy on unmount - engine is singleton
      // Just update the store
      globalStore.setEngine(null);
    };
  }, []);
  
  return {
    // State
    state,
    isPlaying,
    isInitialized,
    sessionTime,
    adaptationLevel,
    
    // Controls
    initialize,
    start,
    stop,
    pause,
    resume,
    
    // Configuration
    setMasterGain,
    setEffects,
    
    // Cleanup
    destroy,
  };
}

/**
 * useAudioContext hook
 * 
 * Provides direct access to the AudioContext for advanced use cases.
 */
export function useAudioContext(): AudioContext | null {
  const engine = getAudioEngine();
  return engine.getContext();
}

/**
 * useAudioState hook
 * 
 * Returns only the audio state for simple state monitoring.
 */
export function useAudioState(): AudioState {
  return useSyncExternalStore(
    (callback) => globalStore.subscribe(callback),
    () => globalStore.getState(),
    () => 'idle'
  );
}

/**
 * useIsPlaying hook
 * 
 * Returns whether audio is currently playing.
 */
export function useIsPlaying(): boolean {
  const state = useAudioState();
  return state === 'entry' || state === 'settle' || state === 'hold';
}

/**
 * useSessionTime hook
 * 
 * Returns the current session time in seconds.
 */
export function useSessionTime(): number {
  const [time, setTime] = useState(0);
  const isPlaying = useIsPlaying();
  
  useEffect(() => {
    if (!isPlaying) {
      setTime(0);
      return;
    }
    
    const engine = getAudioEngine();
    
    const interval = setInterval(() => {
      setTime(engine.getCurrentSessionTime());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  return time;
}

/**
 * AudioButton component helper
 * 
 * Returns props for a button that initializes and starts audio on click.
 */
export function useAudioButton(options: UseAudioOptions = {}) {
  const audio = useAudio(options);
  
  const handleClick = useCallback(async () => {
    if (!audio.isInitialized) {
      try {
        await audio.initialize();
        audio.start();
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    } else if (audio.isPlaying) {
      audio.stop();
    } else {
      audio.start();
    }
  }, [audio]);
  
  return {
    onClick: handleClick,
    isPlaying: audio.isPlaying,
    isInitialized: audio.isInitialized,
    label: audio.isPlaying ? 'Stop' : audio.isInitialized ? 'Start' : 'Initialize',
  };
}

export default useAudio;
