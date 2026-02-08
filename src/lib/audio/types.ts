/**
 * THE HOLD - Audio Engine Type Definitions
 * Procedural ambient audio system with adaptive state machine
 */

// Audio Engine States
export type AudioState = 
  | 'idle'      // Before initialization
  | 'entry'     // Fade in, establishing presence
  | 'settle'    // Establishing the sound world
  | 'hold'      // Main sustained state
  | 'soften'    // Preparing for exit
  | 'exit'      // Fade to silence
  | 'suspended' // Audio context suspended (browser policy)
  | 'error';    // Error state

// State transition configuration
export interface StateConfig {
  entry: { duration: number; targetGain: number };
  settle: { duration: number };
  hold: { duration: number; adaptationInterval: number };
  soften: { duration: number };
  exit: { duration: number };
}

// Default state timing (in seconds)
export const DEFAULT_STATE_CONFIG: StateConfig = {
  entry: { duration: 8.0, targetGain: 0.7 },
  settle: { duration: 12.0 },
  hold: { duration: Infinity, adaptationInterval: 30.0 },
  soften: { duration: 10.0 },
  exit: { duration: 6.0 },
};

// Generator types
export type GeneratorType = 'drone' | 'texture' | 'breath' | 'silence';

// Base generator configuration
export interface GeneratorConfig {
  type: GeneratorType;
  enabled: boolean;
  gain: number; // 0.0 to 1.0
  fadeInTime: number;
  fadeOutTime: number;
}

// Drone generator - sustained harmonic tones
export interface DroneConfig extends GeneratorConfig {
  type: 'drone';
  baseFrequency: number; // Hz (432 or 440 base)
  harmonicSeries: number[]; // Multipliers for harmonics [1, 1.5, 2, 2.5, 3]
  detuneAmount: number; // cents
  driftSpeed: number; // Hz per second for subtle pitch drift
  waveform: OscillatorType;
}

// Texture generator - granular-style evolving sounds
export interface TextureConfig extends GeneratorConfig {
  type: 'texture';
  density: number; // grains per second
  grainDuration: number; // seconds
  frequencyRange: [number, number]; // min/max Hz
  stereoSpread: number; // 0.0 to 1.0
  evolutionSpeed: number; // how fast texture evolves
}

// Breath generator - rhythmic breath-paced elements
export interface BreathConfig extends GeneratorConfig {
  type: 'breath';
  inhaleDuration: number; // seconds
  exhaleDuration: number; // seconds
  pauseDuration: number; // seconds between breaths
  frequency: number; // base frequency
  depth: number; // modulation depth
}

// Silence generator - manages silence as an element
export interface SilenceConfig extends GeneratorConfig {
  type: 'silence';
  minSilenceDuration: number;
  maxSilenceDuration: number;
  probability: number; // chance of silence occurring
}

// Union type for all generator configs
export type AnyGeneratorConfig = DroneConfig | TextureConfig | BreathConfig | SilenceConfig;

// Layer configuration
export interface LayerConfig {
  id: string;
  generators: AnyGeneratorConfig[];
  crossfadeIn: number; // seconds to fade in
  crossfadeOut: number; // seconds to fade out
  sessionTimeStart: number; // when this layer becomes active (seconds into session)
  sessionTimeEnd: number | null; // when this layer ends (null = never)
}

// Effects configuration
export interface EffectsConfig {
  reverb: {
    enabled: boolean;
    decayTime: number; // seconds
    preDelay: number; // seconds
    wetLevel: number; // 0.0 to 1.0
  };
  filter: {
    enabled: boolean;
    type: BiquadFilterType;
    frequency: number; // Hz
    Q: number;
    modulationDepth: number; // subtle filter movement
    modulationSpeed: number; // Hz
  };
  limiter: {
    enabled: boolean;
    threshold: number; // dB
    release: number; // seconds
  };
}

// Master output configuration
export interface MasterConfig {
  gain: number; // 0.0 to 1.0
  baseFrequency: 432 | 440; // tuning standard
  maxSessionTime: number; // seconds before forcing exit
  adaptationCurve: 'linear' | 'exponential' | 'logarithmic';
}

// Complete audio engine configuration
export interface AudioEngineConfig {
  master: MasterConfig;
  states: StateConfig;
  effects: EffectsConfig;
  layers: LayerConfig[];
}

// Scheduler event types
export type SchedulerEventType = 
  | 'grain'
  | 'breath'
  | 'silence'
  | 'parameterChange'
  | 'layerTransition';

export interface SchedulerEvent {
  id: string;
  type: SchedulerEventType;
  time: number; // audio context time
  callback: (time: number) => void;
  cancelable: boolean;
}

// Session tracking
export interface SessionData {
  startTime: number; // audio context time
  currentTime: number; // elapsed session time
  state: AudioState;
  stateStartTime: number;
  adaptationLevel: number; // 0.0 to 1.0 based on session time
}

// Audio node references for cleanup
export interface AudioNodeChain {
  source: AudioNode;
  effects: AudioNode[];
  gain: GainNode;
  output: AudioNode;
}

// Callback types
export type StateChangeCallback = (from: AudioState, to: AudioState, sessionData: SessionData) => void;
export type AdaptationCallback = (level: number, sessionData: SessionData) => void;
export type ErrorCallback = (error: Error) => void;

// Hook return type
export interface UseAudioReturn {
  // State
  state: AudioState;
  isPlaying: boolean;
  isInitialized: boolean;
  sessionTime: number;
  adaptationLevel: number;
  
  // Controls
  initialize: () => Promise<void>;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  
  // Configuration
  setMasterGain: (gain: number) => void;
  setEffects: (effects: Partial<EffectsConfig>) => void;
  
  // Cleanup
  destroy: () => void;
}

// Constants
export const AUDIO_CONSTANTS = {
  // Timing
  SCHEDULER_LOOKAHEAD: 0.1, // seconds
  SCHEDULER_INTERVAL: 0.025, // seconds
  
  // Gain staging
  MASTER_HEADROOM: 0.85, // leave 15% headroom
  MAX_GAIN: 0.95, // absolute maximum
  
  // Frequencies (432Hz tuning - more contemplative)
  BASE_FREQUENCY: 432,
  
  // Harmonic series for contemplative drones (minor tonality)
  MINOR_HARMONICS: [1, 1.2, 1.5, 2, 2.4, 3, 4], // approximate minor relationships
  
  // Breath timing (relaxed, meditative)
  BREATH_INHALE: 4.0, // seconds
  BREATH_EXHALE: 6.0, // seconds
  BREATH_PAUSE: 1.0, // seconds
  
  // Filter settings for warmth
  WARM_FILTER_FREQ: 800, // Hz
  WARM_FILTER_Q: 0.7,
  
  // Limiter settings
  LIMITER_THRESHOLD: -3, // dB
  LIMITER_RELEASE: 0.1, // seconds
} as const;

// Default configurations for generators
export const DEFAULT_DRONE_CONFIG: DroneConfig = {
  type: 'drone',
  enabled: true,
  gain: 0.4,
  fadeInTime: 4.0,
  fadeOutTime: 4.0,
  baseFrequency: AUDIO_CONSTANTS.BASE_FREQUENCY / 2, // Start an octave down
  harmonicSeries: AUDIO_CONSTANTS.MINOR_HARMONICS.slice(0, 5),
  detuneAmount: 8,
  driftSpeed: 0.02,
  waveform: 'sine',
};

export const DEFAULT_TEXTURE_CONFIG: TextureConfig = {
  type: 'texture',
  enabled: true,
  gain: 0.25,
  fadeInTime: 6.0,
  fadeOutTime: 6.0,
  density: 8,
  grainDuration: 0.3,
  frequencyRange: [200, 1200],
  stereoSpread: 0.6,
  evolutionSpeed: 0.05,
};

export const DEFAULT_BREATH_CONFIG: BreathConfig = {
  type: 'breath',
  enabled: true,
  gain: 0.15,
  fadeInTime: 3.0,
  fadeOutTime: 3.0,
  inhaleDuration: AUDIO_CONSTANTS.BREATH_INHALE,
  exhaleDuration: AUDIO_CONSTANTS.BREATH_EXHALE,
  pauseDuration: AUDIO_CONSTANTS.BREATH_PAUSE,
  frequency: 216, // Subtle low presence
  depth: 0.3,
};

export const DEFAULT_SILENCE_CONFIG: SilenceConfig = {
  type: 'silence',
  enabled: true,
  gain: 0,
  fadeInTime: 0,
  fadeOutTime: 0,
  minSilenceDuration: 2.0,
  maxSilenceDuration: 8.0,
  probability: 0.1,
};

// Default complete configuration
export const DEFAULT_AUDIO_CONFIG: AudioEngineConfig = {
  master: {
    gain: 0.7,
    baseFrequency: 432,
    maxSessionTime: 1800, // 30 minutes max
    adaptationCurve: 'logarithmic',
  },
  states: DEFAULT_STATE_CONFIG,
  effects: {
    reverb: {
      enabled: true,
      decayTime: 6.0,
      preDelay: 0.02,
      wetLevel: 0.35,
    },
    filter: {
      enabled: true,
      type: 'lowpass',
      frequency: AUDIO_CONSTANTS.WARM_FILTER_FREQ,
      Q: AUDIO_CONSTANTS.WARM_FILTER_Q,
      modulationDepth: 50,
      modulationSpeed: 0.1,
    },
    limiter: {
      enabled: true,
      threshold: AUDIO_CONSTANTS.LIMITER_THRESHOLD,
      release: AUDIO_CONSTANTS.LIMITER_RELEASE,
    },
  },
  layers: [
    {
      id: 'base-layer',
      generators: [DEFAULT_DRONE_CONFIG, DEFAULT_TEXTURE_CONFIG],
      crossfadeIn: 8.0,
      crossfadeOut: 8.0,
      sessionTimeStart: 0,
      sessionTimeEnd: null,
    },
    {
      id: 'breath-layer',
      generators: [DEFAULT_BREATH_CONFIG],
      crossfadeIn: 12.0,
      crossfadeOut: 8.0,
      sessionTimeStart: 30, // Breath emerges after 30 seconds
      sessionTimeEnd: null,
    },
  ],
};
