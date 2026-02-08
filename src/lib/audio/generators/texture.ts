/**
 * THE HOLD - Texture Generator
 * 
 * Creates evolving, granular-style textures.
 * Uses overlapping short sounds with random parameters
 * to create a dense, shifting sound field.
 * 
 * Character:
 * - Granular synthesis approach
 * - Random frequency selection within range
 * - Stereo spread for width
 * - Slowly evolving density
 */

import { TextureConfig } from '../types';

interface Grain {
  oscillator: OscillatorNode;
  gain: GainNode;
  panner: StereoPannerNode;
  startTime: number;
  duration: number;
}

export class TextureGenerator {
  private ctx: AudioContext;
  private config: TextureConfig;
  private outputNode: GainNode;
  
  // Grain management
  private activeGrains: Map<string, Grain> = new Map();
  private grainIdCounter: number = 0;
  
  // Scheduling
  private nextGrainTime: number = 0;
  private scheduleInterval: number | null = null;
  
  // Evolution
  private evolutionInterval: number | null = null;
  private currentDensity: number;
  private currentFreqRange: [number, number];
  
  // State
  private isPlaying: boolean = false;
  private isDestroyed: boolean = false;
  private masterGain: GainNode;
  
  constructor(ctx: AudioContext, config: TextureConfig, outputNode: GainNode) {
    this.ctx = ctx;
    this.config = config;
    this.outputNode = outputNode;
    
    // Create master gain for this generator
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = config.gain;
    this.masterGain.connect(outputNode);
    
    // Initialize evolving parameters
    this.currentDensity = config.density;
    this.currentFreqRange = [...config.frequencyRange] as [number, number];
  }
  
  /**
   * Start the texture generator
   */
  start(time?: number): void {
    if (this.isPlaying || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    
    // Fade in master gain
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.config.gain, now + this.config.fadeInTime);
    
    // Start scheduling grains
    this.nextGrainTime = now;
    this.scheduleInterval = window.setInterval(() => {
      this.scheduleGrains();
    }, 50); // Check every 50ms
    
    // Start evolution
    this.startEvolution();
    
    this.isPlaying = true;
  }
  
  /**
   * Stop the texture generator
   */
  stop(time?: number): void {
    if (!this.isPlaying || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    
    // Fade out master gain
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + this.config.fadeOutTime);
    
    // Stop scheduling
    if (this.scheduleInterval !== null) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
    
    // Stop evolution
    this.stopEvolution();
    
    // Clean up active grains after fade
    setTimeout(() => {
      this.cleanupAllGrains();
    }, this.config.fadeOutTime * 1000 + 200);
    
    this.isPlaying = false;
  }
  
  /**
   * Schedule upcoming grains
   */
  private scheduleGrains(): void {
    const now = this.ctx.currentTime;
    const lookahead = 0.2; // Schedule 200ms ahead
    
    // Schedule grains until lookahead time
    while (this.nextGrainTime < now + lookahead) {
      this.spawnGrain(this.nextGrainTime);
      
      // Calculate next grain time based on density
      // Randomize slightly for organic feel
      const avgInterval = 1 / this.currentDensity;
      const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
      this.nextGrainTime += avgInterval * randomFactor;
    }
    
    // Cleanup finished grains
    this.cleanupFinishedGrains(now);
  }
  
  /**
   * Spawn a single grain
   */
  private spawnGrain(time: number): void {
    const grainId = `grain-${this.grainIdCounter++}`;
    
    // Random frequency within range
    const freq = this.currentFreqRange[0] + 
      Math.random() * (this.currentFreqRange[1] - this.currentFreqRange[0]);
    
    // Random duration with variation
    const duration = this.config.grainDuration * (0.7 + Math.random() * 0.6);
    
    // Random stereo position
    const pan = (Math.random() - 0.5) * 2 * this.config.stereoSpread;
    
    // Create oscillator
    const osc = this.ctx.createOscillator();
    
    // Choose waveform based on frequency (lower = more sine-like)
    if (freq < 300) {
      osc.type = 'sine';
    } else if (freq < 600) {
      osc.type = 'triangle';
    } else {
      osc.type = 'sine'; // Keep it soft
    }
    
    osc.frequency.value = freq;
    
    // Create envelope
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    
    // Create panner
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    
    // Connect: osc → gain → panner → master
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);
    
    // Apply envelope
    const attack = duration * 0.3;
    const decay = duration * 0.7;
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, time + attack + decay);
    
    // Start and stop oscillator
    osc.start(time);
    osc.stop(time + duration + 0.1);
    
    // Store grain
    const grain: Grain = {
      oscillator: osc,
      gain,
      panner,
      startTime: time,
      duration,
    };
    
    this.activeGrains.set(grainId, grain);
    
    // Auto-cleanup when done
    setTimeout(() => {
      this.cleanupGrain(grainId);
    }, (duration + 0.2) * 1000);
  }
  
  /**
   * Cleanup a single grain
   */
  private cleanupGrain(grainId: string): void {
    const grain = this.activeGrains.get(grainId);
    if (!grain) return;
    
    try {
      grain.oscillator.disconnect();
      grain.gain.disconnect();
      grain.panner.disconnect();
    } catch (e) {
      // May already be disconnected
    }
    
    this.activeGrains.delete(grainId);
  }
  
  /**
   * Cleanup finished grains
   */
  private cleanupFinishedGrains(now: number): void {
    this.activeGrains.forEach((grain, id) => {
      if (now > grain.startTime + grain.duration + 0.1) {
        this.cleanupGrain(id);
      }
    });
  }
  
  /**
   * Cleanup all grains
   */
  private cleanupAllGrains(): void {
    this.activeGrains.forEach((_, id) => {
      this.cleanupGrain(id);
    });
    this.activeGrains.clear();
  }
  
  /**
   * Start parameter evolution
   */
  private startEvolution(): void {
    if (this.evolutionInterval !== null) return;
    
    const evolve = () => {
      if (!this.isPlaying) return;
      
      // Slowly drift frequency range
      const driftAmount = this.config.evolutionSpeed * 10;
      this.currentFreqRange[0] = Math.max(100, 
        this.config.frequencyRange[0] + (Math.random() - 0.5) * driftAmount);
      this.currentFreqRange[1] = Math.min(3000, 
        this.config.frequencyRange[1] + (Math.random() - 0.5) * driftAmount);
      
      // Ensure min < max
      if (this.currentFreqRange[0] > this.currentFreqRange[1]) {
        [this.currentFreqRange[0], this.currentFreqRange[1]] = 
          [this.currentFreqRange[1], this.currentFreqRange[0]];
      }
    };
    
    this.evolutionInterval = window.setInterval(evolve, 3000);
  }
  
  /**
   * Stop evolution
   */
  private stopEvolution(): void {
    if (this.evolutionInterval !== null) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = null;
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
   * Set density (grains per second)
   */
  setDensity(density: number): void {
    this.currentDensity = Math.max(1, Math.min(30, density));
  }
  
  /**
   * Set frequency range
   */
  setFrequencyRange(min: number, max: number): void {
    this.currentFreqRange = [Math.max(50, min), Math.min(5000, max)];
  }
  
  /**
   * Apply adaptation based on session time
   */
  applyAdaptation(level: number, time?: number): void {
    // As session progresses:
    // - Density increases slightly
    // - Frequency range expands upward
    
    this.currentDensity = this.config.density * (1 + level * 0.3);
    
    const freqExpansion = level * 200;
    this.currentFreqRange[1] = Math.min(3000, 
      this.config.frequencyRange[1] + freqExpansion);
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
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Get active grain count (for debugging)
   */
  getActiveGrainCount(): number {
    return this.activeGrains.size;
  }
  
  /**
   * Destroy the generator
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
    
    if (this.scheduleInterval !== null) {
      clearInterval(this.scheduleInterval);
    }
    
    this.stopEvolution();
    this.cleanupAllGrains();
    
    this.masterGain.disconnect();
  }
}

/**
 * Create a texture generator with default configuration
 */
export function createTexture(
  ctx: AudioContext,
  outputNode: GainNode,
  config?: Partial<TextureConfig>
): TextureGenerator {
  const fullConfig: TextureConfig = {
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
    ...config,
  };
  
  return new TextureGenerator(ctx, fullConfig, outputNode);
}
