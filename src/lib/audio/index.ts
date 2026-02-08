/**
 * THE HOLD - Audio Engine
 * 
 * Complete procedural ambient audio system for THE HOLD.
 * 
 * Features:
 * - Continuous adaptive audio (no track boundaries)
 * - Procedural synthesis (no external audio files required)
 * - State machine: entry → settle → hold → soften → exit
 * - Breath-paced rhythm
 * - Silence as an element
 * - Gain staging with limiter (no clipping)
 * - CPU-efficient scheduling
 * 
 * Quick Start:
 * ```typescript
 * import { useAudio } from '@/hooks/use-audio';
 * 
 * function App() {
 *   const { initialize, start, stop, isPlaying } = useAudio();
 *   
 *   const handleStart = async () => {
 *     await initialize(); // Must be called from user gesture
 *     start();
 *   };
 *   
 *   return (
 *     <button onClick={isPlaying ? stop : handleStart}>
 *       {isPlaying ? 'Stop' : 'Start'}
 *     </button>
 *   );
 * }
 * ```
 */

// Main engine
export {
  AudioEngine,
  getAudioEngine,
  destroyAudioEngine,
  type AudioEngineOptions,
} from './engine';

// Types
export * from './types';

// Generators
export {
  DroneGenerator,
  TextureGenerator,
  BreathGenerator,
  SilenceGenerator,
  SilenceControlledGain,
  createDrone,
  createTexture,
  createBreath,
  createSilence,
  type BreathPhase,
  type SilenceMode,
} from './generators';

// Effects
export {
  EffectsChain,
  Limiter,
  createWarmFilter,
  createSubtleChorus,
} from './effects';

// Layers
export {
  LayerManager,
  createCrossfade,
  smoothGainTransition,
} from './layers';

// Scheduler
export {
  Scheduler,
  scheduleGrain,
  scheduleBreath,
  getBreathTiming,
  getEvolvingTiming,
  scheduleWithDrift,
} from './scheduler';

// Default configuration
export { DEFAULT_AUDIO_CONFIG } from './types';
