# THE HOLD - Audio Engine

A procedural ambient audio engine built for contemplative experiences. No external audio files required - all sound is synthesized in real-time using the Web Audio API.

## Features

- **Continuous Adaptive Audio**: No track boundaries, seamless evolution
- **Procedural Synthesis**: Pure Web Audio API, no external dependencies
- **State Machine**: `entry → settle → hold → soften → exit`
- **Breath-Paced Rhythm**: Natural breathing patterns, not BPM-led
- **Silence as Element**: Intentional silence creates space and contrast
- **Gain Staging with Limiter**: Never clips, smooth output
- **CPU-Efficient**: Lookahead scheduling, minimal processing overhead
- **Adaptive**: Sound evolves subtly based on session time

## Quick Start

```tsx
import { useAudio } from '@/hooks/use-audio';

function App() {
  const { initialize, start, stop, isPlaying, state } = useAudio({
    onStateChange: (from, to) => console.log(`${from} -> ${to}`),
  });

  const handleStart = async () => {
    await initialize(); // Must be called from user gesture
    start();
  };

  return (
    <button onClick={isPlaying ? stop : handleStart}>
      {isPlaying ? 'Stop' : 'Start Ambient'}
    </button>
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AUDIO ENGINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Layer 1    │    │   Layer 2    │    │   Layer N    │  │
│  │  (drones)    │    │  (breath)    │    │  (texture)   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             ▼                               │
│                    ┌─────────────────┐                      │
│                    │   Layer Mix     │                      │
│                    │  (crossfades)   │                      │
│                    └────────┬────────┘                      │
│                             ▼                               │
│              ┌──────────────────────────────┐               │
│              │        EFFECTS CHAIN         │               │
│              │  Filter → Reverb → Limiter   │               │
│              └──────────────────────────────┘               │
│                             ▼                               │
│                    ┌─────────────────┐                      │
│                    │   Master Gain   │                      │
│                    │   (headroom)    │                      │
│                    └─────────────────┘                      │
│                             ▼                               │
│                    ┌─────────────────┐                      │
│                    │   Destination   │                      │
│                    └─────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## State Machine

The audio engine follows a state machine that mirrors the contemplative experience:

```
idle → entry → settle → hold → soften → exit
```

| State | Duration | Description |
|-------|----------|-------------|
| `idle` | - | Before initialization |
| `entry` | 8s | Fade in, establishing presence |
| `settle` | 12s | Establishing the sound world |
| `hold` | ∞ | Main sustained state, subtle evolution |
| `soften` | 10s | Preparing for exit |
| `exit` | 6s | Fade to silence |

## Generators

### Drone Generator
Sustained harmonic tones with subtle pitch drift.

```typescript
import { DroneGenerator } from '@/lib/audio/generators';

const drone = new DroneGenerator(ctx, {
  type: 'drone',
  baseFrequency: 216, // 432/2
  harmonicSeries: [1, 1.2, 1.5, 2, 2.4],
  detuneAmount: 8,
  driftSpeed: 0.02,
  waveform: 'sine',
}, outputNode);

drone.start();
```

### Texture Generator
Granular-style evolving textures.

```typescript
import { TextureGenerator } from '@/lib/audio/generators';

const texture = new TextureGenerator(ctx, {
  type: 'texture',
  density: 8, // grains per second
  grainDuration: 0.3,
  frequencyRange: [200, 1200],
  stereoSpread: 0.6,
}, outputNode);

texture.start();
```

### Breath Generator
Breath-paced rhythmic elements.

```typescript
import { BreathGenerator } from '@/lib/audio/generators';

const breath = new BreathGenerator(ctx, {
  type: 'breath',
  inhaleDuration: 4.0,
  exhaleDuration: 6.0,
  pauseDuration: 1.0,
  frequency: 216,
  depth: 0.3,
}, outputNode);

breath.start();
```

### Silence Generator
Manages silence as an intentional element.

```typescript
import { SilenceGenerator } from '@/lib/audio/generators';

const silence = new SilenceGenerator(ctx, {
  type: 'silence',
  minSilenceDuration: 2.0,
  maxSilenceDuration: 8.0,
  probability: 0.1,
});

silence.start();
```

## Effects Chain

### Reverb
Algorithmic reverb using delay network (CPU-efficient).

```typescript
import { EffectsChain } from '@/lib/audio/effects';

const effects = new EffectsChain(ctx, {
  reverb: {
    enabled: true,
    decayTime: 6.0,
    preDelay: 0.02,
    wetLevel: 0.35,
  },
});
```

### Filter
Warm low-pass filter with subtle modulation.

```typescript
const effects = new EffectsChain(ctx, {
  filter: {
    enabled: true,
    type: 'lowpass',
    frequency: 800,
    Q: 0.7,
    modulationDepth: 50,
    modulationSpeed: 0.1,
  },
});
```

### Limiter
Final stage protection against clipping.

```typescript
import { Limiter } from '@/lib/audio/effects';

const limiter = new Limiter(ctx, -3, 0.1);
```

## Scheduler

CPU-efficient event scheduling with lookahead.

```typescript
import { Scheduler } from '@/lib/audio/scheduler';

const scheduler = new Scheduler(ctx);
scheduler.start();

// Schedule an event
scheduler.addEvent('grain', ctx.currentTime + 1.0, (time) => {
  // Play grain at scheduled time
});

// Schedule recurring
scheduler.scheduleRecurring('breath', 11.0, (time) => {
  // Breath cycle
});
```

## Layer Manager

Manage multiple simultaneous layers with crossfading.

```typescript
import { LayerManager } from '@/lib/audio/layers';

const layers = new LayerManager(ctx, [
  {
    id: 'base-layer',
    generators: [droneConfig, textureConfig],
    crossfadeIn: 8.0,
    crossfadeOut: 8.0,
    sessionTimeStart: 0,
    sessionTimeEnd: null,
  },
  {
    id: 'breath-layer',
    generators: [breathConfig],
    crossfadeIn: 12.0,
    crossfadeOut: 8.0,
    sessionTimeStart: 30, // Activates after 30 seconds
    sessionTimeEnd: null,
  },
], effectsInput);

layers.startAll();
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_AUDIO_CONFIG = {
  master: {
    gain: 0.7,
    baseFrequency: 432,
    maxSessionTime: 1800, // 30 minutes
    adaptationCurve: 'logarithmic',
  },
  states: {
    entry: { duration: 8.0, targetGain: 0.7 },
    settle: { duration: 12.0 },
    hold: { duration: Infinity, adaptationInterval: 30.0 },
    soften: { duration: 10.0 },
    exit: { duration: 6.0 },
  },
  effects: {
    reverb: { enabled: true, decayTime: 6.0, preDelay: 0.02, wetLevel: 0.35 },
    filter: { enabled: true, type: 'lowpass', frequency: 800, Q: 0.7 },
    limiter: { enabled: true, threshold: -3, release: 0.1 },
  },
  layers: [
    // Layer configurations
  ],
};
```

### Custom Configuration

```typescript
const audio = useAudio({
  config: {
    master: {
      gain: 0.5,
      baseFrequency: 440, // Standard tuning
    },
    states: {
      entry: { duration: 4.0, targetGain: 0.6 },
    },
  },
});
```

## React Hooks

### useAudio
Main hook for audio control and state.

```typescript
const {
  state,           // Current audio state
  isPlaying,       // Boolean
  isInitialized,   // Boolean
  sessionTime,     // Seconds
  adaptationLevel, // 0.0 to 1.0
  initialize,      // () => Promise<void>
  start,           // () => void
  stop,            // () => void
  pause,           // () => void
  resume,          // () => void
  setMasterGain,   // (gain: number) => void
  setEffects,      // (effects: Partial<EffectsConfig>) => void
  destroy,         // () => void
} = useAudio(options);
```

### useAudioState
Simple state monitoring.

```typescript
const state = useAudioState(); // 'idle' | 'entry' | 'settle' | 'hold' | ...
```

### useIsPlaying
Quick playing check.

```typescript
const isPlaying = useIsPlaying(); // boolean
```

### useSessionTime
Track session duration.

```typescript
const sessionTime = useSessionTime(); // seconds
```

## Audio Character

- **Base Frequency**: 432Hz (contemplative, warm)
- **Harmonic Series**: Minor-like relationships [1, 1.2, 1.5, 2, 2.4, 3]
- **Waveforms**: Primarily sine and triangle for warmth
- **No Percussion**: Purely tonal, no rhythmic elements
- **Slow Evolution**: Changes happen over minutes, not seconds
- **Breath Timing**: Inhale 4s, Exhale 6s, Pause 1s

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require user gesture)
- Mobile: Supported with touch gesture for initialization

## Performance

- CPU usage: ~5-10% on modern devices
- Memory: Minimal (no audio file loading)
- Battery: Efficient due to procedural synthesis
- Scheduling: Lookahead prevents dropouts

## File Structure

```
src/lib/audio/
├── index.ts           # Main exports
├── types.ts           # TypeScript definitions
├── engine.ts          # Main audio engine
├── effects.ts         # Effects chain (reverb, filter, limiter)
├── layers.ts          # Layer manager with crossfades
├── scheduler.ts       # CPU-efficient event scheduler
└── generators/
    ├── index.ts       # Generator exports
    ├── drone.ts       # Sustained harmonic drones
    ├── texture.ts     # Granular-style textures
    ├── breath.ts      # Breath-paced elements
    └── silence.ts     # Silence management
```

## License

Part of THE HOLD MVP.
