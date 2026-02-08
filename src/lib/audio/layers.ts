/**
 * THE HOLD - Layer Manager
 * 
 * Manages multiple simultaneous audio layers with crossfading.
 * Each layer contains multiple generators that work together.
 * Layers can fade in/out based on session time.
 * 
 * Features:
 * - Multiple simultaneous layers
 * - Smooth crossfades between layers
 * - Dynamic layer mixing based on session time
 * - Per-layer gain control
 */

import {
  LayerConfig,
  AnyGeneratorConfig,
  GeneratorType,
  DroneConfig,
  TextureConfig,
  BreathConfig,
  SilenceConfig,
} from './types';
import {
  DroneGenerator,
  TextureGenerator,
  BreathGenerator,
  SilenceGenerator,
} from './generators';

// Union type for all generator instances
type GeneratorInstance = 
  | DroneGenerator 
  | TextureGenerator 
  | BreathGenerator 
  | SilenceGenerator;

interface Layer {
  config: LayerConfig;
  gainNode: GainNode;
  generators: GeneratorInstance[];
  isActive: boolean;
  fadeState: 'in' | 'out' | 'steady' | null;
}

export class LayerManager {
  private ctx: AudioContext;
  private config: LayerConfig[];
  private outputNode: AudioNode;
  
  // Layers
  private layers: Map<string, Layer> = new Map();
  
  // Session tracking
  private sessionStartTime: number = 0;
  private adaptationLevel: number = 0;
  
  // Silence manager (shared across layers)
  private silenceGenerator: SilenceGenerator | null = null;
  
  // State
  private isDestroyed: boolean = false;
  private holdState: boolean = false;
  
  constructor(ctx: AudioContext, config: LayerConfig[], outputNode: AudioNode) {
    this.ctx = ctx;
    this.config = config;
    this.outputNode = outputNode;
    
    // Initialize layers
    this.initializeLayers();
  }
  
  /**
   * Initialize all layers from configuration
   */
  private initializeLayers(): void {
    this.config.forEach(layerConfig => {
      this.createLayer(layerConfig);
    });
  }
  
  /**
   * Create a single layer
   */
  private createLayer(config: LayerConfig): Layer {
    // Create gain node for this layer
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0; // Start silent
    gainNode.connect(this.outputNode);
    
    // Create generators
    const generators: GeneratorInstance[] = [];
    
    config.generators.forEach(genConfig => {
      if (!genConfig.enabled) return;
      
      const generator = this.createGenerator(genConfig, gainNode);
      if (generator) {
        generators.push(generator);
      }
    });
    
    // Create layer object
    const layer: Layer = {
      config,
      gainNode,
      generators,
      isActive: false,
      fadeState: null,
    };
    
    this.layers.set(config.id, layer);
    return layer;
  }
  
  /**
   * Create a generator based on configuration
   */
  private createGenerator(config: AnyGeneratorConfig, outputNode: GainNode): GeneratorInstance | null {
    switch (config.type) {
      case 'drone':
        return new DroneGenerator(this.ctx, config as DroneConfig, outputNode);
        
      case 'texture':
        return new TextureGenerator(this.ctx, config as TextureConfig, outputNode);
        
      case 'breath':
        return new BreathGenerator(this.ctx, config as BreathConfig, outputNode);
        
      case 'silence':
        // Silence generator is special - only create one
        if (!this.silenceGenerator) {
          this.silenceGenerator = new SilenceGenerator(this.ctx, config as SilenceConfig);
        }
        return this.silenceGenerator;
        
      default:
        console.warn(`[LayerManager] Unknown generator type: ${(config as any).type}`);
        return null;
    }
  }
  
  /**
   * Start all layers
   */
  startAll(time?: number): void {
    const now = time ?? this.ctx.currentTime;
    this.sessionStartTime = now;
    
    this.layers.forEach(layer => {
      this.activateLayer(layer, now);
    });
    
    // Start silence manager
    this.silenceGenerator?.start(now);
  }
  
  /**
   * Activate a layer with fade in
   */
  private activateLayer(layer: Layer, time: number): void {
    if (layer.isActive) return;
    
    const now = time;
    
    // Fade in layer gain
    layer.gainNode.gain.cancelScheduledValues(now);
    layer.gainNode.gain.setValueAtTime(0, now);
    layer.gainNode.gain.linearRampToValueAtTime(1, now + layer.config.crossfadeIn);
    
    // Start all generators
    layer.generators.forEach(generator => {
      if ('start' in generator) {
        generator.start(now + Math.random() * 2); // Stagger starts slightly
      }
    });
    
    layer.isActive = true;
    layer.fadeState = 'in';
    
    // Mark as steady after fade
    setTimeout(() => {
      layer.fadeState = 'steady';
    }, layer.config.crossfadeIn * 1000);
  }
  
  /**
   * Deactivate a layer with fade out
   */
  private deactivateLayer(layer: Layer, time: number): void {
    if (!layer.isActive) return;
    
    const now = time;
    
    // Fade out layer gain
    layer.gainNode.gain.cancelScheduledValues(now);
    layer.gainNode.gain.setValueAtTime(layer.gainNode.gain.value, now);
    layer.gainNode.gain.linearRampToValueAtTime(0, now + layer.config.crossfadeOut);
    
    // Stop all generators after fade
    setTimeout(() => {
      layer.generators.forEach(generator => {
        if ('stop' in generator) {
          generator.stop();
        }
      });
    }, layer.config.crossfadeOut * 1000);
    
    layer.isActive = false;
    layer.fadeState = 'out';
  }
  
  /**
   * Stop all layers
   */
  stopAll(time?: number): void {
    const now = time ?? this.ctx.currentTime;
    
    this.layers.forEach(layer => {
      this.deactivateLayer(layer, now);
    });
    
    // Stop silence manager
    this.silenceGenerator?.stop(now);
  }
  
  /**
   * Pause all layers
   */
  pause(time?: number): void {
    const now = time ?? this.ctx.currentTime;
    
    this.layers.forEach(layer => {
      layer.generators.forEach(generator => {
        if ('pause' in generator) {
          generator.pause(now);
        }
      });
    });
    
    this.silenceGenerator?.stop(now);
  }
  
  /**
   * Resume all layers
   */
  resume(time?: number): void {
    const now = time ?? this.ctx.currentTime;
    
    this.layers.forEach(layer => {
      layer.generators.forEach(generator => {
        if ('resume' in generator) {
          generator.resume(now);
        }
      });
    });
    
    this.silenceGenerator?.start(now);
  }
  
  /**
   * Enter hold state - layers settle into maintenance mode
   */
  enterHoldState(): void {
    this.holdState = true;
    
    // Check for layers that should activate based on session time
    this.updateLayerActivation();
  }
  
  /**
   * Enter soften state - prepare for exit
   */
  enterSoftState(): void {
    this.holdState = false;
    
    // Gradually reduce all layers
    const now = this.ctx.currentTime;
    
    this.layers.forEach(layer => {
      if (layer.isActive) {
        // Reduce to 50% over time
        layer.gainNode.gain.setTargetAtTime(0.5, now, 5);
      }
    });
  }
  
  /**
   * Update layer activation based on session time
   */
  private updateLayerActivation(): void {
    if (!this.holdState) return;
    
    const sessionTime = this.ctx.currentTime - this.sessionStartTime;
    const now = this.ctx.currentTime;
    
    this.layers.forEach(layer => {
      const shouldBeActive = sessionTime >= layer.config.sessionTimeStart &&
        (layer.config.sessionTimeEnd === null || sessionTime < layer.config.sessionTimeEnd);
      
      if (shouldBeActive && !layer.isActive) {
        this.activateLayer(layer, now);
      } else if (!shouldBeActive && layer.isActive) {
        this.deactivateLayer(layer, now);
      }
    });
    
    // Schedule next check
    setTimeout(() => this.updateLayerActivation(), 5000);
  }
  
  /**
   * Apply adaptation to all layers
   */
  applyAdaptation(level: number): void {
    this.adaptationLevel = level;
    const now = this.ctx.currentTime;
    
    this.layers.forEach(layer => {
      // Apply adaptation to each generator
      layer.generators.forEach(generator => {
        if ('applyAdaptation' in generator) {
          generator.applyAdaptation(level, now);
        }
      });
    });
    
    // Apply to silence generator
    this.silenceGenerator?.applyAdaptation(level);
  }
  
  /**
   * Crossfade between two layers
   */
  crossfade(fromLayerId: string, toLayerId: string, duration: number = 8.0): void {
    const fromLayer = this.layers.get(fromLayerId);
    const toLayer = this.layers.get(toLayerId);
    
    if (!fromLayer || !toLayer) {
      console.warn(`[LayerManager] Cannot crossfade: layer not found`);
      return;
    }
    
    const now = this.ctx.currentTime;
    
    // Fade out from layer
    fromLayer.gainNode.gain.cancelScheduledValues(now);
    fromLayer.gainNode.gain.setValueAtTime(fromLayer.gainNode.gain.value, now);
    fromLayer.gainNode.gain.linearRampToValueAtTime(0, now + duration);
    
    // Fade in to layer
    toLayer.gainNode.gain.cancelScheduledValues(now);
    toLayer.gainNode.gain.setValueAtTime(0, now);
    toLayer.gainNode.gain.linearRampToValueAtTime(1, now + duration);
    
    // Activate to layer if not active
    if (!toLayer.isActive) {
      toLayer.generators.forEach(generator => {
        if ('start' in generator) {
          generator.start(now);
        }
      });
      toLayer.isActive = true;
    }
    
    // Deactivate from layer after fade
    setTimeout(() => {
      fromLayer.generators.forEach(generator => {
        if ('stop' in generator) {
          generator.stop();
        }
      });
      fromLayer.isActive = false;
    }, duration * 1000);
  }
  
  /**
   * Set layer gain
   */
  setLayerGain(layerId: string, gain: number): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    const now = this.ctx.currentTime;
    layer.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, gain)), now, 0.5);
  }
  
  /**
   * Get layer info
   */
  getLayerInfo(layerId: string): { isActive: boolean; fadeState: string | null } | null {
    const layer = this.layers.get(layerId);
    if (!layer) return null;
    
    return {
      isActive: layer.isActive,
      fadeState: layer.fadeState,
    };
  }
  
  /**
   * Get all layer IDs
   */
  getLayerIds(): string[] {
    return Array.from(this.layers.keys());
  }
  
  /**
   * Get active layer count
   */
  getActiveLayerCount(): number {
    let count = 0;
    this.layers.forEach(layer => {
      if (layer.isActive) count++;
    });
    return count;
  }
  
  /**
   * Add a new layer dynamically
   */
  addLayer(config: LayerConfig): void {
    if (this.layers.has(config.id)) {
      console.warn(`[LayerManager] Layer ${config.id} already exists`);
      return;
    }
    
    this.createLayer(config);
  }
  
  /**
   * Remove a layer
   */
  removeLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    // Deactivate first
    this.deactivateLayer(layer, this.ctx.currentTime);
    
    // Clean up generators
    setTimeout(() => {
      layer.generators.forEach(generator => {
        if ('destroy' in generator) {
          generator.destroy();
        }
      });
      layer.gainNode.disconnect();
    }, (layer.config.crossfadeOut + 0.5) * 1000);
    
    this.layers.delete(layerId);
  }
  
  /**
   * Destroy the layer manager and all layers
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // Stop all layers
    this.stopAll();
    
    // Destroy all generators
    this.layers.forEach(layer => {
      layer.generators.forEach(generator => {
        if ('destroy' in generator) {
          generator.destroy();
        }
      });
      layer.gainNode.disconnect();
    });
    
    // Destroy silence generator
    this.silenceGenerator?.destroy();
    
    // Clear layers
    this.layers.clear();
  }
}

/**
 * Create a crossfade between two gain nodes
 */
export function createCrossfade(
  ctx: AudioContext,
  fromGain: GainNode,
  toGain: GainNode,
  duration: number,
  time?: number
): void {
  const now = time ?? ctx.currentTime;
  
  // Fade out from
  fromGain.gain.cancelScheduledValues(now);
  fromGain.gain.setValueAtTime(fromGain.gain.value, now);
  fromGain.gain.linearRampToValueAtTime(0, now + duration);
  
  // Fade in to
  toGain.gain.cancelScheduledValues(now);
  toGain.gain.setValueAtTime(0, now);
  toGain.gain.linearRampToValueAtTime(1, now + duration);
}

/**
 * Utility for smooth gain transitions
 */
export function smoothGainTransition(
  gainNode: GainNode,
  targetValue: number,
  duration: number,
  time?: number
): void {
  const now = time ?? gainNode.context.currentTime;
  
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(targetValue, now + duration);
}
