/**
 * THE HOLD - Drone Generator
 * 
 * Creates sustained harmonic drones with subtle evolution.
 * Uses multiple oscillators with slight detuning for richness.
 * Features pitch drift for organic, living quality.
 * 
 * Character:
 * - Warm, analog feel
 * - Minor key harmonics (contemplative)
 * - Subtle pitch drift (living quality)
 * - 432Hz base frequency
 */

import { DroneConfig, AUDIO_CONSTANTS } from '../types';

export class DroneGenerator {
  private ctx: AudioContext;
  private config: DroneConfig;
  private outputNode: GainNode;
  
  // Oscillator voices
  private oscillators: OscillatorNode[] = [];
  private oscillatorGains: GainNode[] = [];
  private detuneLFOs: OscillatorNode[] = [];
  private detuneLFOGains: GainNode[] = [];
  
  // Pitch drift
  private driftInterval: number | null = null;
  private currentFrequencies: number[] = [];
  private targetFrequencies: number[] = [];
  
  // State
  private isPlaying: boolean = false;
  private isDestroyed: boolean = false;
  private startTime: number = 0;
  
  constructor(ctx: AudioContext, config: DroneConfig, outputNode: GainNode) {
    this.ctx = ctx;
    this.config = config;
    this.outputNode = outputNode;
  }
  
  /**
   * Create all oscillator voices for the drone
   */
  private createVoices(): void {
    const now = this.ctx.currentTime;
    
    this.config.harmonicSeries.forEach((harmonic, index) => {
      // Calculate frequency for this harmonic
      const baseFreq = this.config.baseFrequency * harmonic;
      this.currentFrequencies[index] = baseFreq;
      this.targetFrequencies[index] = baseFreq;
      
      // Create oscillator
      const osc = this.ctx.createOscillator();
      osc.type = this.config.waveform;
      osc.frequency.value = baseFreq;
      
      // Slight random detune for each voice
      const randomDetune = (Math.random() - 0.5) * this.config.detuneAmount;
      osc.detune.value = randomDetune;
      
      // Create gain node for this voice
      const gain = this.ctx.createGain();
      
      // Calculate voice level - fundamental is loudest, harmonics quieter
      const harmonicGain = 1 / (index + 1);
      gain.gain.value = 0; // Start silent
      
      // Create subtle detune LFO for organic movement
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      // Each voice has different LFO rate
      lfo.frequency.value = 0.05 + index * 0.02;
      
      const lfoGain = this.ctx.createGain();
      // Subtle detune modulation
      lfoGain.gain.value = 2 + index; // More modulation on higher harmonics
      
      // Connect LFO to detune
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      
      // Connect oscillator to its gain, then to output
      osc.connect(gain);
      gain.connect(this.outputNode);
      
      // Start oscillator and LFO
      osc.start(now);
      lfo.start(now);
      
      // Store references
      this.oscillators.push(osc);
      this.oscillatorGains.push(gain);
      this.detuneLFOs.push(lfo);
      this.detuneLFOGains.push(lfoGain);
    });
  }
  
  /**
   * Start the drone
   */
  start(time?: number): void {
    if (this.isPlaying || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    this.startTime = now;
    
    // Create voices
    this.createVoices();
    
    // Fade in
    this.oscillatorGains.forEach((gain, index) => {
      const harmonicGain = 1 / (index + 1);
      const voiceLevel = harmonicGain * this.config.gain;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(voiceLevel, now + this.config.fadeInTime);
    });
    
    // Start pitch drift
    this.startPitchDrift();
    
    this.isPlaying = true;
  }
  
  /**
   * Stop the drone
   */
  stop(time?: number): void {
    if (!this.isPlaying || this.isDestroyed) return;
    
    const now = time ?? this.ctx.currentTime;
    const fadeOutTime = this.config.fadeOutTime;
    
    // Fade out all voices
    this.oscillatorGains.forEach(gain => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);
    });
    
    // Stop oscillators after fade
    setTimeout(() => {
      this.cleanupVoices();
    }, fadeOutTime * 1000 + 100);
    
    // Stop pitch drift
    this.stopPitchDrift();
    
    this.isPlaying = false;
  }
  
  /**
   * Start subtle pitch drift for organic feel
   */
  private startPitchDrift(): void {
    if (this.driftInterval !== null) return;
    
    // Update target frequencies periodically
    const updateInterval = 5000; // Every 5 seconds
    
    const drift = () => {
      if (!this.isPlaying) return;
      
      this.oscillators.forEach((osc, index) => {
        const baseFreq = this.config.baseFrequency * this.config.harmonicSeries[index];
        // Random drift within ±driftSpeed * 100 cents
        const driftAmount = (Math.random() - 0.5) * 2 * this.config.driftSpeed;
        this.targetFrequencies[index] = baseFreq * (1 + driftAmount);
        
        // Smooth transition to new frequency
        const now = this.ctx.currentTime;
        osc.frequency.setTargetAtTime(this.targetFrequencies[index], now, 2);
      });
    };
    
    this.driftInterval = window.setInterval(drift, updateInterval);
    
    // Initial drift
    drift();
  }
  
  /**
   * Stop pitch drift
   */
  private stopPitchDrift(): void {
    if (this.driftInterval !== null) {
      clearInterval(this.driftInterval);
      this.driftInterval = null;
    }
  }
  
  /**
   * Cleanup all oscillator voices
   */
  private cleanupVoices(): void {
    // Stop and disconnect all oscillators
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // May already be stopped
      }
      osc.disconnect();
    });
    
    // Stop and disconnect LFOs
    this.detuneLFOs.forEach(lfo => {
      try {
        lfo.stop();
      } catch (e) {
        // May already be stopped
      }
      lfo.disconnect();
    });
    
    // Disconnect gains
    this.oscillatorGains.forEach(gain => gain.disconnect());
    this.detuneLFOGains.forEach(gain => gain.disconnect());
    
    // Clear arrays
    this.oscillators = [];
    this.oscillatorGains = [];
    this.detuneLFOs = [];
    this.detuneLFOGains = [];
  }
  
  /**
   * Set the output gain
   */
  setGain(gain: number, time?: number): void {
    const now = time ?? this.ctx.currentTime;
    const clampedGain = Math.max(0, Math.min(1, gain));
    
    this.oscillatorGains.forEach((gainNode, index) => {
      const harmonicGain = 1 / (index + 1);
      const voiceLevel = harmonicGain * clampedGain;
      gainNode.gain.setTargetAtTime(voiceLevel, now, 0.5);
    });
  }
  
  /**
   * Set base frequency
   */
  setBaseFrequency(frequency: number, time?: number): void {
    const now = time ?? this.ctx.currentTime;
    
    this.oscillators.forEach((osc, index) => {
      const harmonicFreq = frequency * this.config.harmonicSeries[index];
      osc.frequency.setTargetAtTime(harmonicFreq, now, 0.5);
    });
  }
  
  /**
   * Apply adaptation based on session time
   */
  applyAdaptation(level: number, time?: number): void {
    const now = time ?? this.ctx.currentTime;
    
    // As session progresses, subtly shift harmonics
    // More upper harmonics emerge over time
    this.oscillatorGains.forEach((gainNode, index) => {
      if (index >= 3) {
        // Higher harmonics become more present
        const adaptationGain = level * 0.3;
        const harmonicGain = 1 / (index + 1);
        const voiceLevel = harmonicGain * this.config.gain * (1 + adaptationGain);
        gainNode.gain.setTargetAtTime(voiceLevel, now, 5);
      }
    });
  }
  
  /**
   * Pause (fade out but keep voices)
   */
  pause(time?: number): void {
    if (!this.isPlaying) return;
    
    const now = time ?? this.ctx.currentTime;
    
    this.oscillatorGains.forEach(gain => {
      gain.gain.setTargetAtTime(0, now, 0.5);
    });
  }
  
  /**
   * Resume from pause
   */
  resume(time?: number): void {
    if (!this.isPlaying) return;
    
    const now = time ?? this.ctx.currentTime;
    
    this.oscillatorGains.forEach((gain, index) => {
      const harmonicGain = 1 / (index + 1);
      const voiceLevel = harmonicGain * this.config.gain;
      gain.gain.setTargetAtTime(voiceLevel, now, 0.5);
    });
  }
  
  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Destroy the generator and cleanup
   */
  destroy(): void {
    this.isDestroyed = true;
    
    this.stop();
    this.cleanupVoices();
    this.stopPitchDrift();
  }
}

/**
 * Create a simple drone with default configuration
 */
export function createDrone(
  ctx: AudioContext, 
  outputNode: GainNode,
  baseFrequency?: number,
  config?: Partial<DroneConfig>
): DroneGenerator {
  const fullConfig: DroneConfig = {
    type: 'drone',
    enabled: true,
    gain: 0.4,
    fadeInTime: 4.0,
    fadeOutTime: 4.0,
    baseFrequency: baseFrequency ?? AUDIO_CONSTANTS.BASE_FREQUENCY / 2,
    harmonicSeries: AUDIO_CONSTANTS.MINOR_HARMONICS.slice(0, 5),
    detuneAmount: 8,
    driftSpeed: 0.02,
    waveform: 'sine',
    ...config,
  };
  
  return new DroneGenerator(ctx, fullConfig, outputNode);
}
