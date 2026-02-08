/**
 * THE HOLD - Main Audio Engine
 * 
 * Procedural ambient audio engine with adaptive state machine.
 * Manages AudioContext, master output chain, and state transitions.
 * 
 * Architecture:
 * - AudioContext management with suspension/resumption handling
 * - Master gain staging with limiter for clip prevention
 * - State machine: idle → entry → settle → hold → soften → exit
 * - Session time tracking for adaptive behavior
 * - Event-driven architecture for state changes
 */

import {
  AudioState,
  AudioEngineConfig,
  SessionData,
  StateChangeCallback,
  AdaptationCallback,
  ErrorCallback,
  DEFAULT_AUDIO_CONFIG,
  AUDIO_CONSTANTS,
} from './types';
import { EffectsChain } from './effects';
import { LayerManager } from './layers';
import { Scheduler } from './scheduler';

export interface AudioEngineOptions {
  config?: Partial<AudioEngineConfig>;
  onStateChange?: StateChangeCallback;
  onAdaptation?: AdaptationCallback;
  onError?: ErrorCallback;
  autoSuspend?: boolean; // Auto-suspend when not playing
}

export class AudioEngine {
  // Audio context
  private ctx: AudioContext | null = null;
  private ctxState: 'closed' | 'suspended' | 'running' = 'closed';
  
  // Master chain
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private effectsChain: EffectsChain | null = null;
  
  // Subsystems
  private layerManager: LayerManager | null = null;
  private scheduler: Scheduler | null = null;
  
  // Configuration
  private config: AudioEngineConfig;
  
  // State machine
  private state: AudioState = 'idle';
  private stateStartTime: number = 0;
  private sessionStartTime: number = 0;
  private adaptationLevel: number = 0;
  private stateTimeoutId: number | null = null;
  private adaptationIntervalId: number | null = null;
  
  // Callbacks
  private onStateChange?: StateChangeCallback;
  private onAdaptation?: AdaptationCallback;
  private onError?: ErrorCallback;
  
  // Flags
  private isInitialized: boolean = false;
  private isDestroyed: boolean = false;
  private autoSuspend: boolean;
  
  // Visibility handling
  private visibilityHandler: (() => void) | null = null;
  
  constructor(options: AudioEngineOptions = {}) {
    this.config = this.mergeConfig(options.config);
    this.onStateChange = options.onStateChange;
    this.onAdaptation = options.onAdaptation;
    this.onError = options.onError;
    this.autoSuspend = options.autoSuspend ?? true;
    
    this.setupVisibilityHandling();
  }
  
  /**
   * Merge user config with defaults
   */
  private mergeConfig(userConfig?: Partial<AudioEngineConfig>): AudioEngineConfig {
    if (!userConfig) return DEFAULT_AUDIO_CONFIG;
    
    return {
      master: { ...DEFAULT_AUDIO_CONFIG.master, ...userConfig.master },
      states: { ...DEFAULT_AUDIO_CONFIG.states, ...userConfig.states },
      effects: {
        reverb: { ...DEFAULT_AUDIO_CONFIG.effects.reverb, ...userConfig.effects?.reverb },
        filter: { ...DEFAULT_AUDIO_CONFIG.effects.filter, ...userConfig.effects?.filter },
        limiter: { ...DEFAULT_AUDIO_CONFIG.effects.limiter, ...userConfig.effects?.limiter },
      },
      layers: userConfig.layers ?? DEFAULT_AUDIO_CONFIG.layers,
    };
  }
  
  /**
   * Setup page visibility handling for auto-suspend
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return;
    
    this.visibilityHandler = () => {
      if (document.hidden && this.autoSuspend && this.ctx?.state === 'running') {
        this.suspend();
      } else if (!document.hidden && this.state !== 'idle' && this.state !== 'exit') {
        this.resume();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
  
  /**
   * Initialize the audio engine
   * Must be called from a user gesture context
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isDestroyed) return;
    
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }
      
      this.ctx = new AudioContextClass({
        latencyHint: 'playback',
        sampleRate: 48000, // Consistent sample rate
      });
      
      // Wait for context to be ready
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      
      this.ctxState = this.ctx.state;
      
      // Setup master chain
      this.setupMasterChain();
      
      // Initialize effects
      this.effectsChain = new EffectsChain(this.ctx, this.config.effects);
      
      // Initialize layer manager
      this.layerManager = new LayerManager(this.ctx, this.config.layers, this.effectsChain.getInput());
      
      // Initialize scheduler
      this.scheduler = new Scheduler(this.ctx);
      
      // Connect effects to master
      this.effectsChain.connect(this.masterGain!);
      
      // Setup state change listeners
      this.setupStateListeners();
      
      this.isInitialized = true;
      
      // Start "mid-thought" - begin at settle state
      this.transitionTo('entry');
      
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }
  
  /**
   * Setup the master output chain with gain staging and limiter
   */
  private setupMasterChain(): void {
    if (!this.ctx) return;
    
    // Master gain - primary volume control
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Start silent
    
    // Limiter - prevents clipping, always last in chain
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = this.config.effects.limiter.threshold;
    this.limiter.knee.value = 0; // Hard knee
    this.limiter.ratio.value = 20; // Aggressive limiting
    this.limiter.attack.value = 0.003; // Fast attack
    this.limiter.release.value = this.config.effects.limiter.release;
    
    // Connect: masterGain → limiter → destination
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);
  }
  
  /**
   * Setup listeners for audio context state changes
   */
  private setupStateListeners(): void {
    if (!this.ctx) return;
    
    // Monitor context state
    const checkState = () => {
      if (this.ctx) {
        this.ctxState = this.ctx.state as 'closed' | 'suspended' | 'running';
      }
    };
    
    // Check periodically
    setInterval(checkState, 1000);
  }
  
  /**
   * State machine transition
   */
  private transitionTo(newState: AudioState): void {
    const previousState = this.state;
    this.state = newState;
    this.stateStartTime = this.ctx?.currentTime ?? 0;
    
    // Notify listeners
    this.onStateChange?.(previousState, newState, this.getSessionData());
    
    // Execute state logic
    this.executeStateLogic(newState);
  }
  
  /**
   * Execute logic for current state
   */
  private executeStateLogic(state: AudioState): void {
    if (!this.ctx || !this.masterGain) return;
    
    const now = this.ctx.currentTime;
    const config = this.config.states;
    
    // Clear any pending state timeouts
    if (this.stateTimeoutId !== null) {
      clearTimeout(this.stateTimeoutId);
      this.stateTimeoutId = null;
    }
    
    switch (state) {
      case 'entry':
        // Fade in from silence
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(0, now);
        this.masterGain.gain.linearRampToValueAtTime(
          config.entry.targetGain * this.config.master.gain * AUDIO_CONSTANTS.MASTER_HEADROOM,
          now + config.entry.duration
        );
        
        // Start layers
        this.layerManager?.startAll(now);
        
        // Transition to settle
        this.scheduleStateTransition('settle', config.entry.duration * 1000);
        break;
        
      case 'settle':
        // Establish the sound world, subtle stabilization
        this.masterGain.gain.setTargetAtTime(
          this.config.master.gain * AUDIO_CONSTANTS.MASTER_HEADROOM,
          now,
          0.5
        );
        
        // Start adaptation tracking
        this.startAdaptationTracking();
        
        // Transition to hold
        this.scheduleStateTransition('hold', config.settle.duration * 1000);
        break;
        
      case 'hold':
        // Main sustained state - audio continues with subtle evolution
        this.layerManager?.enterHoldState();
        
        // Schedule max session time check
        if (this.config.master.maxSessionTime !== Infinity) {
          this.scheduleStateTransition('soften', this.config.master.maxSessionTime * 1000);
        }
        break;
        
      case 'soften':
        // Begin fade out preparation
        this.layerManager?.enterSoftState();
        
        // Gradual volume reduction
        this.masterGain.gain.setTargetAtTime(
          this.config.master.gain * AUDIO_CONSTANTS.MASTER_HEADROOM * 0.5,
          now,
          config.soften.duration / 3
        );
        
        // Transition to exit
        this.scheduleStateTransition('exit', config.soften.duration * 1000);
        break;
        
      case 'exit':
        // Fade to silence
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + config.exit.duration);
        
        // Stop layers after fade
        setTimeout(() => {
          this.layerManager?.stopAll();
          this.stopAdaptationTracking();
        }, config.exit.duration * 1000);
        break;
        
      case 'suspended':
        // Context was suspended (browser policy)
        this.layerManager?.pause();
        break;
        
      case 'idle':
      case 'error':
        // Reset state
        this.reset();
        break;
    }
  }
  
  /**
   * Schedule a state transition
   */
  private scheduleStateTransition(nextState: AudioState, delayMs: number): void {
    if (this.isDestroyed) return;
    
    this.stateTimeoutId = window.setTimeout(() => {
      this.transitionTo(nextState);
    }, delayMs);
  }
  
  /**
   * Start adaptation tracking based on session time
   */
  private startAdaptationTracking(): void {
    if (this.adaptationIntervalId !== null) return;
    
    const interval = this.config.states.hold.adaptationInterval * 1000;
    
    this.adaptationIntervalId = window.setInterval(() => {
      this.updateAdaptationLevel();
    }, interval);
  }
  
  /**
   * Stop adaptation tracking
   */
  private stopAdaptationTracking(): void {
    if (this.adaptationIntervalId !== null) {
      clearInterval(this.adaptationIntervalId);
      this.adaptationIntervalId = null;
    }
  }
  
  /**
   * Update adaptation level based on session time
   */
  private updateAdaptationLevel(): void {
    const sessionTime = this.getSessionTime();
    const maxTime = this.config.master.maxSessionTime;
    
    // Calculate adaptation level (0.0 to 1.0)
    let level: number;
    switch (this.config.master.adaptationCurve) {
      case 'exponential':
        level = 1 - Math.exp(-sessionTime / (maxTime / 3));
        break;
      case 'logarithmic':
        level = Math.log(1 + sessionTime) / Math.log(1 + maxTime);
        break;
      case 'linear':
      default:
        level = Math.min(sessionTime / maxTime, 1);
        break;
    }
    
    this.adaptationLevel = level;
    this.onAdaptation?.(level, this.getSessionData());
    
    // Apply adaptation to layers
    this.layerManager?.applyAdaptation(level);
  }
  
  /**
   * Get current session time in seconds
   */
  private getSessionTime(): number {
    if (!this.ctx || this.sessionStartTime === 0) return 0;
    return this.ctx.currentTime - this.sessionStartTime;
  }
  
  /**
   * Get complete session data
   */
  private getSessionData(): SessionData {
    return {
      startTime: this.sessionStartTime,
      currentTime: this.getSessionTime(),
      state: this.state,
      stateStartTime: this.stateStartTime,
      adaptationLevel: this.adaptationLevel,
    };
  }
  
  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[AudioEngine] Error:', error);
    this.state = 'error';
    this.onError?.(error);
  }
  
  /**
   * Reset engine state
   */
  private reset(): void {
    this.stopAdaptationTracking();
    this.sessionStartTime = 0;
    this.adaptationLevel = 0;
  }
  
  // Public API
  
  /**
   * Start audio playback
   */
  start(): void {
    if (!this.isInitialized) {
      console.warn('[AudioEngine] Not initialized. Call initialize() first.');
      return;
    }
    
    if (this.state === 'exit' || this.state === 'idle') {
      // Restart from entry
      this.sessionStartTime = this.ctx?.currentTime ?? 0;
      this.transitionTo('entry');
    } else if (this.state === 'suspended') {
      this.resume();
    }
  }
  
  /**
   * Stop audio playback (fade to exit)
   */
  stop(): void {
    if (this.state === 'hold' || this.state === 'settle') {
      this.transitionTo('soften');
    } else if (this.state === 'entry') {
      // Skip to exit if stopped during entry
      this.transitionTo('exit');
    }
  }
  
  /**
   * Pause audio (suspend context)
   */
  pause(): void {
    this.suspend();
  }
  
  /**
   * Suspend audio context
   */
  private suspend(): void {
    if (this.ctx?.state === 'running') {
      this.ctx.suspend();
      this.previousState = this.state;
      this.state = 'suspended';
    }
  }
  
  private previousState: AudioState = 'idle';
  
  /**
   * Resume audio context
   */
  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.previousState !== 'suspended') {
          this.state = this.previousState;
        }
      });
    }
  }
  
  /**
   * Set master gain
   */
  setMasterGain(gain: number): void {
    this.config.master.gain = Math.max(0, Math.min(1, gain));
    if (this.masterGain && this.ctx) {
      const targetGain = this.config.master.gain * AUDIO_CONSTANTS.MASTER_HEADROOM;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
  }
  
  /**
   * Get current state
   */
  getState(): AudioState {
    return this.state;
  }
  
  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return this.state === 'entry' || this.state === 'settle' || this.state === 'hold';
  }
  
  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get current session time
   */
  getCurrentSessionTime(): number {
    return this.getSessionTime();
  }
  
  /**
   * Get adaptation level
   */
  getAdaptationLevel(): number {
    return this.adaptationLevel;
  }
  
  /**
   * Get audio context
   */
  getContext(): AudioContext | null {
    return this.ctx;
  }
  
  /**
   * Destroy the engine and cleanup resources
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // Remove visibility listener
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    
    // Clear timeouts
    if (this.stateTimeoutId !== null) {
      clearTimeout(this.stateTimeoutId);
    }
    this.stopAdaptationTracking();
    
    // Stop and cleanup subsystems
    this.layerManager?.destroy();
    this.scheduler?.destroy();
    this.effectsChain?.destroy();
    
    // Close audio context
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    
    // Clear references
    this.ctx = null;
    this.masterGain = null;
    this.limiter = null;
    this.effectsChain = null;
    this.layerManager = null;
    this.scheduler = null;
    this.isInitialized = false;
  }
}

// Singleton instance for app-wide use
let engineInstance: AudioEngine | null = null;

export function getAudioEngine(options?: AudioEngineOptions): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine(options);
  }
  return engineInstance;
}

export function destroyAudioEngine(): void {
  engineInstance?.destroy();
  engineInstance = null;
}
