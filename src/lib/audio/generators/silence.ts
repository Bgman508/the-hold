/**
 * THE HOLD - Silence Generator
 * 
 * Manages silence as an intentional element of the composition.
 * Silence creates space, anticipation, and contrast.
 * Not a true "generator" but a controller that modulates
 * other generators and creates intentional gaps.
 * 
 * Character:
 * - Silence is an element, not an absence
 * - Randomly introduces brief silences
 * - Coordinates with other generators
 * - Creates breathing room in the soundscape
 */

import { SilenceConfig } from '../types';

export type SilenceMode = 'active' | 'silent' | 'transitioning';

interface SilenceEvent {
  startTime: number;
  duration: number;
  depth: number; // How deep the silence (0-1)
}

export class SilenceGenerator {
  private ctx: AudioContext;
  private config: SilenceConfig;
  
  // Connected generators to control
  private controlledGains: GainNode[] = [];
  
  // Silence state
  private mode: SilenceMode = 'active';
  private currentEvent: SilenceEvent | null = null;
  private nextEventTime: number = 0;
  
  // Scheduling
  private checkInterval: number | null = null;
  private eventTimeout: number | null = null;
  
  // Previous gain values for restoration
  private previousGains: Map<GainNode, number> = new Map();
  
  // State
  private isActive: boolean = false;
  private isDestroyed: boolean = false;
  
  // Session tracking for adaptation
  private sessionTime: number = 0;
  
  constructor(ctx: AudioContext, config: SilenceConfig) {
    this.ctx = ctx;
    this.config = config;
  }
  
  /**
   * Register a gain node to be controlled by silence
   */
  registerGain(gainNode: GainNode, baseGain: number): void {
    this.controlledGains.push(gainNode);
    this.previousGains.set(gainNode, baseGain);
  }
  
  /**
   * Unregister a gain node
   */
  unregisterGain(gainNode: GainNode): void {
    const index = this.controlledGains.indexOf(gainNode);
    if (index > -1) {
      this.controlledGains.splice(index, 1);
    }
    this.previousGains.delete(gainNode);
  }
  
  /**
   * Start the silence manager
   */
  start(time?: number): void {
    if (this.isActive || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    
    // Start checking for silence events
    this.checkInterval = window.setInterval(() => {
      this.checkForSilenceEvent();
    }, 1000); // Check every second
    
    this.isActive = true;
    
    // Schedule first potential silence
    this.scheduleNextEvent(now);
  }
  
  /**
   * Stop the silence manager
   */
  stop(time?: number): void {
    if (!this.isActive || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    
    // Clear intervals and timeouts
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.eventTimeout !== null) {
      clearTimeout(this.eventTimeout);
      this.eventTimeout = null;
    }
    
    // Restore all gains if in silence
    if (this.mode === 'silent') {
      this.restoreGains(now);
    }
    
    this.isActive = false;
    this.mode = 'active';
    this.currentEvent = null;
  }
  
  /**
   * Check if a silence event should occur
   */
  private checkForSilenceEvent(): void {
    if (!this.isActive || this.mode !== 'active') return;
    
    const now = this.ctx.currentTime;
    
    if (now >= this.nextEventTime && Math.random() < this.config.probability) {
      this.triggerSilenceEvent(now);
    }
  }
  
  /**
   * Schedule the next potential silence event
   */
  private scheduleNextEvent(time: number): void {
    // Random time until next potential silence
    // Average 30-60 seconds between checks
    const delay = 20000 + Math.random() * 40000;
    this.nextEventTime = time + delay / 1000;
  }
  
  /**
   * Trigger a silence event
   */
  private triggerSilenceEvent(time: number): void {
    if (this.mode !== 'active') return;
    
    const duration = this.config.minSilenceDuration + 
      Math.random() * (this.config.maxSilenceDuration - this.config.minSilenceDuration);
    
    const depth = 0.3 + Math.random() * 0.7; // 30-100% silence depth
    
    this.currentEvent = {
      startTime: time,
      duration,
      depth,
    };
    
    this.enterSilence(time, depth, duration);
  }
  
  /**
   * Enter silence state
   */
  private enterSilence(time: number, depth: number, duration: number): void {
    this.mode = 'transitioning';
    
    const now = time;
    const fadeTime = 2.0; // 2 second fade to silence
    
    // Store current gains and fade down
    this.controlledGains.forEach(gainNode => {
      const currentGain = gainNode.gain.value;
      this.previousGains.set(gainNode, currentGain);
      
      // Calculate target gain (may not be complete silence)
      const targetGain = currentGain * (1 - depth);
      
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(currentGain, now);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.001, targetGain), now + fadeTime);
    });
    
    // Set mode to silent after fade
    setTimeout(() => {
      this.mode = 'silent';
    }, fadeTime * 1000);
    
    // Schedule exit from silence
    this.eventTimeout = window.setTimeout(() => {
      this.exitSilence();
    }, duration * 1000);
  }
  
  /**
   * Exit silence state
   */
  private exitSilence(): void {
    if (this.mode !== 'silent') return;
    
    const now = this.ctx.currentTime;
    const fadeTime = 3.0; // Slower fade back in
    
    this.mode = 'transitioning';
    
    // Restore gains
    this.restoreGains(now, fadeTime);
    
    // Set mode back to active after fade
    setTimeout(() => {
      this.mode = 'active';
      this.currentEvent = null;
      this.scheduleNextEvent(this.ctx.currentTime);
    }, fadeTime * 1000);
  }
  
  /**
   * Restore gain values
   */
  private restoreGains(time: number, fadeTime: number = 1.0): void {
    const now = time;
    
    this.controlledGains.forEach(gainNode => {
      const previousGain = this.previousGains.get(gainNode) ?? 0.5;
      
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(previousGain, now + fadeTime);
    });
  }
  
  /**
   * Force a silence event (for manual control)
   */
  forceSilence(duration?: number, depth?: number): void {
    if (!this.isActive) return;
    
    // Cancel any existing silence
    if (this.eventTimeout !== null) {
      clearTimeout(this.eventTimeout);
    }
    
    // Exit current silence if in one
    if (this.mode === 'silent') {
      this.exitSilence();
    }
    
    const now = this.ctx.currentTime;
    const actualDuration = duration ?? this.config.minSilenceDuration;
    const actualDepth = depth ?? 0.8;
    
    this.triggerSilenceEvent(now);
  }
  
  /**
   * Set silence probability
   */
  setProbability(probability: number): void {
    this.config.probability = Math.max(0, Math.min(1, probability));
  }
  
  /**
   * Set silence duration range
   */
  setDurationRange(min: number, max: number): void {
    this.config.minSilenceDuration = Math.max(0.5, min);
    this.config.maxSilenceDuration = Math.max(this.config.minSilenceDuration, max);
  }
  
  /**
   * Apply adaptation based on session time
   */
  applyAdaptation(level: number): void {
    this.sessionTime = level;
    
    // As session progresses:
    // - Silence becomes slightly more likely
    // - Silence duration increases slightly
    
    this.config.probability = Math.min(0.3, 0.1 + level * 0.2);
    
    const durationIncrease = level * 2; // Up to 2 seconds longer
    this.config.maxSilenceDuration = 8 + durationIncrease;
  }
  
  /**
   * Get current mode
   */
  getMode(): SilenceMode {
    return this.mode;
  }
  
  /**
   * Check if currently in silence
   */
  isInSilence(): boolean {
    return this.mode === 'silent';
  }
  
  /**
   * Check if active
   */
  getIsActive(): boolean {
    return this.isActive;
  }
  
  /**
   * Get current silence event info
   */
  getCurrentEvent(): SilenceEvent | null {
    return this.currentEvent;
  }
  
  /**
   * Destroy the generator
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
    
    this.controlledGains = [];
    this.previousGains.clear();
  }
}

/**
 * Create a silence generator with default configuration
 */
export function createSilence(
  ctx: AudioContext,
  config?: Partial<SilenceConfig>
): SilenceGenerator {
  const fullConfig: SilenceConfig = {
    type: 'silence',
    enabled: true,
    gain: 0,
    fadeInTime: 0,
    fadeOutTime: 0,
    minSilenceDuration: 2.0,
    maxSilenceDuration: 8.0,
    probability: 0.1,
    ...config,
  };
  
  return new SilenceGenerator(ctx, fullConfig);
}

/**
 * Utility to create a silence-controlled gain wrapper
 * This allows any generator to be affected by silence events
 */
export class SilenceControlledGain {
  private gainNode: GainNode;
  private baseGain: number;
  private silenceMultiplier: number = 1.0;
  
  constructor(ctx: AudioContext, baseGain: number = 1.0) {
    this.gainNode = ctx.createGain();
    this.baseGain = baseGain;
    this.updateGain();
  }
  
  /**
   * Get the gain node for connection
   */
  getNode(): GainNode {
    return this.gainNode;
  }
  
  /**
   * Set base gain level
   */
  setBaseGain(gain: number): void {
    this.baseGain = Math.max(0, Math.min(1, gain));
    this.updateGain();
  }
  
  /**
   * Set silence multiplier (called by SilenceGenerator)
   */
  setSilenceMultiplier(multiplier: number): void {
    this.silenceMultiplier = Math.max(0, Math.min(1, multiplier));
    this.updateGain();
  }
  
  /**
   * Update actual gain value
   */
  private updateGain(): void {
    this.gainNode.gain.value = this.baseGain * this.silenceMultiplier;
  }
  
  /**
   * Connect to destination
   */
  connect(destination: AudioNode): void {
    this.gainNode.connect(destination);
  }
  
  /**
   * Disconnect
   */
  disconnect(): void {
    this.gainNode.disconnect();
  }
}
