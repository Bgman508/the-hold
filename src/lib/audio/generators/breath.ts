/**
 * THE HOLD - Breath Generator
 * 
 * Creates breath-paced rhythmic elements.
 * Follows natural breathing patterns: inhale → exhale → pause.
 * Subtle, almost subliminal presence.
 * 
 * Character:
 * - Breath-paced (not BPM-led)
 * - Inhale: 4 seconds
 * - Exhale: 6 seconds  
 * - Pause: 1 second
 * - Very subtle, felt more than heard
 */

import { BreathConfig, AUDIO_CONSTANTS } from '../types';

export type BreathPhase = 'inhale' | 'exhale' | 'pause';

interface BreathCycle {
  phase: BreathPhase;
  startTime: number;
  duration: number;
}

export class BreathGenerator {
  private ctx: AudioContext;
  private config: BreathConfig;
  private outputNode: GainNode;
  
  // Audio nodes
  private oscillator: OscillatorNode | null = null;
  private breathGain: GainNode;
  private filter: BiquadFilterNode;
  private masterGain: GainNode;
  
  // Breath cycle
  private currentCycle: BreathCycle | null = null;
  private nextCycleTime: number = 0;
  private breathTimeout: number | null = null;
  
  // Phase tracking
  private currentPhase: BreathPhase = 'pause';
  private phaseStartTime: number = 0;
  
  // Subtle variation
  private variationAmount: number = 0.1; // ±10% variation
  
  // State
  private isPlaying: boolean = false;
  private isDestroyed: boolean = false;
  
  constructor(ctx: AudioContext, config: BreathConfig, outputNode: GainNode) {
    this.ctx = ctx;
    this.config = config;
    this.outputNode = outputNode;
    
    // Create master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = config.gain;
    this.masterGain.connect(outputNode);
    
    // Create breath envelope gain
    this.breathGain = ctx.createGain();
    this.breathGain.gain.value = 0;
    
    // Create filter for warmth
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400;
    this.filter.Q.value = 0.5;
    
    // Connect: breath nodes will connect to filter → master
    this.filter.connect(this.masterGain);
  }
  
  /**
   * Start the breath generator
   */
  start(time?: number): void {
    if (this.isPlaying || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    
    // Fade in master gain
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.config.gain, now + this.config.fadeInTime);
    
    // Create oscillator
    this.createOscillator(now);
    
    // Start breath cycle
    this.nextCycleTime = now;
    this.scheduleNextPhase();
    
    this.isPlaying = true;
  }
  
  /**
   * Create the breath oscillator
   */
  private createOscillator(time: number): void {
    // Create subtle noise-like source using multiple sines
    // This creates a more breath-like quality than pure sine
    
    // Main oscillator
    this.oscillator = this.ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = this.config.frequency;
    
    // Connect through breath envelope and filter
    this.oscillator.connect(this.breathGain);
    this.breathGain.connect(this.filter);
    
    // Start
    this.oscillator.start(time);
  }
  
  /**
   * Schedule the next breath phase
   */
  private scheduleNextPhase(): void {
    if (!this.isPlaying || this.isDestroyed) return;
    
    const now = this.ctx.currentTime;
    
    // Determine next phase
    let nextPhase: BreathPhase;
    let duration: number;
    
    switch (this.currentPhase) {
      case 'pause':
        nextPhase = 'inhale';
        duration = this.config.inhaleDuration * this.getVariation();
        break;
      case 'inhale':
        nextPhase = 'exhale';
        duration = this.config.exhaleDuration * this.getVariation();
        break;
      case 'exhale':
        nextPhase = 'pause';
        duration = this.config.pauseDuration * this.getVariation();
        break;
      default:
        nextPhase = 'inhale';
        duration = this.config.inhaleDuration;
    }
    
    this.currentPhase = nextPhase;
    this.phaseStartTime = now;
    
    // Apply phase envelope
    this.applyPhaseEnvelope(nextPhase, duration);
    
    // Schedule next phase
    this.breathTimeout = window.setTimeout(() => {
      this.scheduleNextPhase();
    }, duration * 1000);
  }
  
  /**
   * Apply envelope for current breath phase
   */
  private applyPhaseEnvelope(phase: BreathPhase, duration: number): void {
    const now = this.ctx.currentTime;
    const depth = this.config.depth;
    
    switch (phase) {
      case 'inhale':
        // Gradual rise during inhale
        this.breathGain.gain.cancelScheduledValues(now);
        this.breathGain.gain.setValueAtTime(0, now);
        this.breathGain.gain.linearRampToValueAtTime(depth * 0.5, now + duration * 0.7);
        this.breathGain.gain.linearRampToValueAtTime(depth, now + duration);
        
        // Slight frequency rise
        if (this.oscillator) {
          this.oscillator.frequency.setValueAtTime(this.config.frequency, now);
          this.oscillator.frequency.linearRampToValueAtTime(
            this.config.frequency * 1.05, 
            now + duration
          );
        }
        break;
        
      case 'exhale':
        // Gradual fall during exhale
        this.breathGain.gain.cancelScheduledValues(now);
        this.breathGain.gain.setValueAtTime(depth, now);
        this.breathGain.gain.linearRampToValueAtTime(depth * 0.3, now + duration * 0.6);
        this.breathGain.gain.linearRampToValueAtTime(0, now + duration);
        
        // Slight frequency fall
        if (this.oscillator) {
          this.oscillator.frequency.setValueAtTime(this.config.frequency * 1.05, now);
          this.oscillator.frequency.linearRampToValueAtTime(
            this.config.frequency, 
            now + duration
          );
        }
        break;
        
      case 'pause':
        // Silence during pause
        this.breathGain.gain.cancelScheduledValues(now);
        this.breathGain.gain.setValueAtTime(0, now);
        this.breathGain.gain.linearRampToValueAtTime(0, now + duration);
        break;
    }
  }
  
  /**
   * Get random variation factor
   */
  private getVariation(): number {
    return 1 + (Math.random() - 0.5) * 2 * this.variationAmount;
  }
  
  /**
   * Stop the breath generator
   */
  stop(time?: number): void {
    if (!this.isPlaying || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    
    // Clear timeout
    if (this.breathTimeout !== null) {
      clearTimeout(this.breathTimeout);
      this.breathTimeout = null;
    }
    
    // Fade out master gain
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + this.config.fadeOutTime);
    
    // Fade breath gain
    this.breathGain.gain.cancelScheduledValues(now);
    this.breathGain.gain.setValueAtTime(this.breathGain.gain.value, now);
    this.breathGain.gain.exponentialRampToValueAtTime(0.001, now + this.config.fadeOutTime);
    
    // Stop oscillator after fade
    setTimeout(() => {
      this.cleanupOscillator();
    }, this.config.fadeOutTime * 1000 + 100);
    
    this.isPlaying = false;
    this.currentPhase = 'pause';
  }
  
  /**
   * Cleanup oscillator
   */
  private cleanupOscillator(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // May already be stopped
      }
      this.oscillator.disconnect();
      this.oscillator = null;
    }
  }
  
  /**
   * Set master gain
   */
  setGain(gain: number, time?: number): void {
    const now = time ?? this.ctx.currentTime;
    const clampedGain = Math.max(0, Math.min(1, gain));
    this.masterGain.gain.setTargetAtTime(clampedGain, now, 0.5);
  }
  
  /**
   * Set breath timing
   */
  setTiming(inhale: number, exhale: number, pause: number): void {
    this.config.inhaleDuration = Math.max(1, inhale);
    this.config.exhaleDuration = Math.max(1, exhale);
    this.config.pauseDuration = Math.max(0, pause);
  }
  
  /**
   * Set modulation depth
   */
  setDepth(depth: number): void {
    this.config.depth = Math.max(0, Math.min(1, depth));
  }
  
  /**
   * Apply adaptation based on session time
   */
  applyAdaptation(level: number, time?: number): void {
    const now = time ?? this.ctx.currentTime;
    
    // As session progresses:
    // - Breath becomes slightly more present
    // - Timing may slow slightly (more meditative)
    
    const adaptedGain = this.config.gain * (1 + level * 0.2);
    this.masterGain.gain.setTargetAtTime(adaptedGain, now, 2);
    
    // Slightly slower breathing
    const slowFactor = 1 + level * 0.1;
    this.config.inhaleDuration = AUDIO_CONSTANTS.BREATH_INHALE * slowFactor;
    this.config.exhaleDuration = AUDIO_CONSTANTS.BREATH_EXHALE * slowFactor;
  }
  
  /**
   * Pause
   */
  pause(time?: number): void {
    if (!this.isPlaying) return;
    
    const now = time ?? this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, 0.5);
  }
  
  /**
   * Resume
   */
  resume(time?: number): void {
    if (!this.isPlaying) return;
    
    const now = time ?? this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.config.gain, now, 0.5);
  }
  
  /**
   * Get current phase
   */
  getCurrentPhase(): BreathPhase {
    return this.currentPhase;
  }
  
  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Destroy the generator
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
    
    if (this.breathTimeout !== null) {
      clearTimeout(this.breathTimeout);
    }
    
    this.cleanupOscillator();
    
    this.breathGain.disconnect();
    this.filter.disconnect();
    this.masterGain.disconnect();
  }
}

/**
 * Create a breath generator with default configuration
 */
export function createBreath(
  ctx: AudioContext,
  outputNode: GainNode,
  config?: Partial<BreathConfig>
): BreathGenerator {
  const fullConfig: BreathConfig = {
    type: 'breath',
    enabled: true,
    gain: 0.15,
    fadeInTime: 3.0,
    fadeOutTime: 3.0,
    inhaleDuration: AUDIO_CONSTANTS.BREATH_INHALE,
    exhaleDuration: AUDIO_CONSTANTS.BREATH_EXHALE,
    pauseDuration: AUDIO_CONSTANTS.BREATH_PAUSE,
    frequency: 216,
    depth: 0.3,
    ...config,
  };
  
  return new BreathGenerator(ctx, fullConfig, outputNode);
}
