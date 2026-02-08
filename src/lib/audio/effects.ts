/**
 * THE HOLD - Effects Chain
 * 
 * Manages the audio effects chain:
 * Input → Filter → Reverb → Output
 * 
 * Features:
 * - Algorithmic reverb using delay network
 * - Warm low-pass filter with subtle modulation
 * - Limiter at end of master chain (in engine.ts)
 * - Efficient processing with minimal CPU usage
 */

import { EffectsConfig, AUDIO_CONSTANTS } from './types';

export class EffectsChain {
  private ctx: AudioContext;
  private config: EffectsConfig;
  
  // Input/output nodes
  private inputNode: GainNode;
  private outputNode: GainNode;
  
  // Filter
  private filterNode: BiquadFilterNode | null = null;
  private filterLFO: OscillatorNode | null = null;
  private filterLFOGain: GainNode | null = null;
  
  // Reverb network
  private reverbInput: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbDelays: DelayNode[] = [];
  private reverbFilters: BiquadFilterNode[] = [];
  private reverbFeedbackGains: GainNode[] = [];
  
  // Modulation
  private modulationNodes: AudioNode[] = [];
  
  constructor(ctx: AudioContext, config: EffectsConfig) {
    this.ctx = ctx;
    this.config = config;
    
    // Create input/output nodes
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    
    // Build the effects chain
    this.buildChain();
  }
  
  /**
   * Build the complete effects chain
   */
  private buildChain(): void {
    let currentNode: AudioNode = this.inputNode;
    
    // Filter stage
    if (this.config.filter.enabled) {
      currentNode = this.buildFilterStage(currentNode);
    }
    
    // Reverb stage
    if (this.config.reverb.enabled) {
      currentNode = this.buildReverbStage(currentNode);
    } else {
      // Direct connection if no reverb
      currentNode.connect(this.outputNode);
    }
  }
  
  /**
   * Build the filter stage with subtle modulation
   */
  private buildFilterStage(inputNode: AudioNode): AudioNode {
    // Create filter
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = this.config.filter.type;
    this.filterNode.frequency.value = this.config.filter.frequency;
    this.filterNode.Q.value = this.config.filter.Q;
    
    // Create LFO for subtle filter modulation (warm movement)
    if (this.config.filter.modulationDepth > 0 && this.config.filter.modulationSpeed > 0) {
      this.filterLFO = this.ctx.createOscillator();
      this.filterLFO.type = 'sine';
      this.filterLFO.frequency.value = this.config.filter.modulationSpeed;
      
      // LFO gain controls modulation depth
      this.filterLFOGain = this.ctx.createGain();
      this.filterLFOGain.gain.value = this.config.filter.modulationDepth;
      
      // Connect LFO to filter frequency
      this.filterLFO.connect(this.filterLFOGain);
      this.filterLFOGain.connect(this.filterNode.frequency);
      
      // Start LFO
      this.filterLFO.start();
      
      // Track for cleanup
      this.modulationNodes.push(this.filterLFO, this.filterLFOGain);
    }
    
    // Connect input to filter
    inputNode.connect(this.filterNode);
    
    return this.filterNode;
  }
  
  /**
   * Build algorithmic reverb using delay network
   * More CPU-efficient than convolution reverb
   */
  private buildReverbStage(inputNode: AudioNode): AudioNode {
    const decayTime = this.config.reverb.decayTime;
    const wetLevel = this.config.reverb.wetLevel;
    const preDelay = this.config.reverb.preDelay;
    
    // Create wet/dry mix nodes
    this.reverbInput = this.ctx.createGain();
    this.reverbWetGain = this.ctx.createGain();
    this.reverbDryGain = this.ctx.createGain();
    
    // Set levels
    this.reverbWetGain.gain.value = wetLevel;
    this.reverbDryGain.gain.value = 1 - wetLevel * 0.5; // Keep some dry signal
    
    // Pre-delay
    const preDelayNode = this.ctx.createDelay(1.0);
    preDelayNode.delayTime.value = preDelay;
    
    // Connect input to pre-delay and dry path
    inputNode.connect(this.reverbInput);
    this.reverbInput.connect(preDelayNode);
    this.reverbInput.connect(this.reverbDryGain);
    
    // Create delay network for reverb tail
    // Using prime number ratios for more natural decay
    const delayTimes = [0.043, 0.053, 0.067, 0.079, 0.097, 0.113];
    const feedbackGains = delayTimes.map((dt, i) => {
      // Calculate feedback gain for desired decay time
      // g = 10^(-3 * dt / decayTime)
      const g = Math.pow(10, (-3 * dt) / decayTime);
      return Math.min(g * (0.7 + i * 0.05), 0.95); // Cap at 0.95 to prevent runaway
    });
    
    // Create parallel delay lines with feedback
    const reverbMix = this.ctx.createGain();
    reverbMix.gain.value = 1 / delayTimes.length;
    
    delayTimes.forEach((delayTime, index) => {
      // Delay node
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = delayTime;
      
      // Low-pass filter in feedback loop for warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000 - index * 300; // Vary cutoff per delay
      filter.Q.value = 0.5;
      
      // Feedback gain
      const feedback = this.ctx.createGain();
      feedback.gain.value = feedbackGains[index];
      
      // Connect: preDelay → delay → filter → feedback → delay
      preDelayNode.connect(delay);
      delay.connect(filter);
      filter.connect(feedback);
      feedback.connect(delay);
      
      // Output to mix
      filter.connect(reverbMix);
      
      // Track for cleanup
      this.reverbDelays.push(delay);
      this.reverbFilters.push(filter);
      this.reverbFeedbackGains.push(feedback);
    });
    
    // Connect reverb mix to wet gain
    reverbMix.connect(this.reverbWetGain);
    
    // Connect wet and dry to output
    this.reverbWetGain.connect(this.outputNode);
    this.reverbDryGain.connect(this.outputNode);
    
    return this.outputNode;
  }
  
  /**
   * Get the input node for connecting sources
   */
  getInput(): AudioNode {
    return this.inputNode;
  }
  
  /**
   * Connect the output to a destination
   */
  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }
  
  /**
   * Disconnect from destination
   */
  disconnect(): void {
    this.outputNode.disconnect();
  }
  
  /**
   * Update reverb settings
   */
  setReverb(wetLevel: number): void {
    if (this.reverbWetGain && this.reverbDryGain) {
      const now = this.ctx.currentTime;
      const clampedWet = Math.max(0, Math.min(1, wetLevel));
      
      this.reverbWetGain.gain.setTargetAtTime(clampedWet, now, 0.1);
      this.reverbDryGain.gain.setTargetAtTime(1 - clampedWet * 0.5, now, 0.1);
    }
  }
  
  /**
   * Update filter frequency
   */
  setFilterFrequency(frequency: number): void {
    if (this.filterNode) {
      const now = this.ctx.currentTime;
      const clampedFreq = Math.max(20, Math.min(20000, frequency));
      this.filterNode.frequency.setTargetAtTime(clampedFreq, now, 0.1);
    }
  }
  
  /**
   * Update filter modulation speed
   */
  setFilterModulation(speed: number): void {
    if (this.filterLFO) {
      const now = this.ctx.currentTime;
      this.filterLFO.frequency.setTargetAtTime(Math.max(0.01, speed), now, 0.5);
    }
  }
  
  /**
   * Get current effects configuration
   */
  getConfig(): EffectsConfig {
    return { ...this.config };
  }
  
  /**
   * Update effects configuration
   */
  updateConfig(config: Partial<EffectsConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Apply changes
    if (config.reverb?.wetLevel !== undefined) {
      this.setReverb(config.reverb.wetLevel);
    }
    if (config.filter?.frequency !== undefined) {
      this.setFilterFrequency(config.filter.frequency);
    }
    if (config.filter?.modulationSpeed !== undefined) {
      this.setFilterModulation(config.filter.modulationSpeed);
    }
  }
  
  /**
   * Cleanup all resources
   */
  destroy(): void {
    // Stop modulation oscillators
    this.modulationNodes.forEach(node => {
      if (node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch (e) {
          // May already be stopped
        }
      }
    });
    
    // Disconnect all nodes
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    
    if (this.filterNode) {
      this.filterNode.disconnect();
    }
    
    this.reverbDelays.forEach(d => d.disconnect());
    this.reverbFilters.forEach(f => f.disconnect());
    this.reverbFeedbackGains.forEach(g => g.disconnect());
    
    if (this.reverbInput) this.reverbInput.disconnect();
    if (this.reverbWetGain) this.reverbWetGain.disconnect();
    if (this.reverbDryGain) this.reverbDryGain.disconnect();
    
    // Clear arrays
    this.reverbDelays = [];
    this.reverbFilters = [];
    this.reverbFeedbackGains = [];
    this.modulationNodes = [];
  }
}

/**
 * Simple limiter using DynamicsCompressorNode
 * Used as the final stage in the master chain
 */
export class Limiter {
  private ctx: AudioContext;
  private compressor: DynamicsCompressorNode;
  private inputNode: GainNode;
  private outputNode: GainNode;
  
  constructor(ctx: AudioContext, threshold: number = -3, release: number = 0.1) {
    this.ctx = ctx;
    
    // Create nodes
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    
    // Create compressor configured as limiter
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = threshold;
    this.compressor.knee.value = 0; // Hard knee
    this.compressor.ratio.value = 20; // High ratio = limiting
    this.compressor.attack.value = 0.003; // Fast attack
    this.compressor.release.value = release;
    
    // Connect
    this.inputNode.connect(this.compressor);
    this.compressor.connect(this.outputNode);
  }
  
  /**
   * Get input node
   */
  getInput(): AudioNode {
    return this.inputNode;
  }
  
  /**
   * Connect output to destination
   */
  connect(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }
  
  /**
   * Set threshold in dB
   */
  setThreshold(threshold: number): void {
    const now = this.ctx.currentTime;
    this.compressor.threshold.setTargetAtTime(threshold, now, 0.01);
  }
  
  /**
   * Set release time
   */
  setRelease(release: number): void {
    const now = this.ctx.currentTime;
    this.compressor.release.setTargetAtTime(release, now, 0.01);
  }
  
  /**
   * Get reduction amount in dB
   */
  getReduction(): number {
    return this.compressor.reduction;
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.inputNode.disconnect();
    this.compressor.disconnect();
    this.outputNode.disconnect();
  }
}

/**
 * Utility to create a simple low-pass filter for warmth
 */
export function createWarmFilter(ctx: AudioContext, frequency: number = 800): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = frequency;
  filter.Q.value = AUDIO_CONSTANTS.WARM_FILTER_Q;
  return filter;
}

/**
 * Utility to create a subtle chorus effect for thickness
 */
export function createSubtleChorus(ctx: AudioContext, input: AudioNode, output: AudioNode): void {
  // Create multiple detuned voices
  const voices = 3;
  const baseDelay = 0.02; // 20ms
  
  for (let i = 0; i < voices; i++) {
    const delay = ctx.createDelay(0.1);
    delay.delayTime.value = baseDelay + i * 0.005;
    
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1 + i * 0.05; // Slow modulation
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.003; // Subtle modulation
    
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0.3 / voices; // Mix in subtly
    
    // Connect
    input.connect(delay);
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    delay.connect(voiceGain);
    voiceGain.connect(output);
    
    // Start LFO
    lfo.start();
  }
}
