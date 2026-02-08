#!/usr/bin/env python3
"""
THE HOLD - Loop Asset Generator

Generates short, seamless ambient loops for the audio engine.
These are optional - the engine can run purely procedurally.

Loops are:
- Short (4-8 seconds) for memory efficiency
- Seamless (perfect loops)
- 432Hz base frequency
- Minor key, contemplative
- Warm, analog character
"""

import numpy as np
import wave
import struct
import os

# Audio settings
SAMPLE_RATE = 48000
BITS_PER_SAMPLE = 16
MAX_AMP = 32767

# Musical constants
BASE_FREQ = 432  # Hz - contemplative tuning
MINOR_RATIOS = [1, 1.2, 1.5, 2, 2.4, 3]  # Minor-like harmonic series

def generate_sine_wave(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate a pure sine wave."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return np.sin(2 * np.pi * freq * t)

def generate_triangle_wave(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate a triangle wave."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return 2 * np.arcsin(np.sin(2 * np.pi * freq * t)) / np.pi

def apply_fade(waveform, fade_duration=0.1, sample_rate=SAMPLE_RATE):
    """Apply fade in/out for seamless looping."""
    fade_samples = int(fade_duration * sample_rate)
    
    # Fade in
    fade_in = np.linspace(0, 1, fade_samples)
    waveform[:fade_samples] *= fade_in
    
    # Fade out
    fade_out = np.linspace(1, 0, fade_samples)
    waveform[-fade_samples:] *= fade_out
    
    return waveform

def apply_envelope(waveform, attack=0.5, release=0.5, sample_rate=SAMPLE_RATE):
    """Apply ADSR-like envelope."""
    attack_samples = int(attack * sample_rate)
    release_samples = int(release * sample_rate)
    
    envelope = np.ones_like(waveform)
    
    # Attack
    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    
    # Release
    if release_samples > 0:
        envelope[-release_samples:] = np.linspace(1, 0, release_samples)
    
    return waveform * envelope

def mix_waveforms(waveforms, gains=None):
    """Mix multiple waveforms with optional gains."""
    if gains is None:
        gains = [1.0 / len(waveforms)] * len(waveforms)
    
    mixed = np.zeros_like(waveforms[0])
    for wave, gain in zip(waveforms, gains):
        mixed += wave * gain
    
    return mixed

def normalize_audio(waveform, headroom=0.9):
    """Normalize audio to prevent clipping."""
    peak = np.max(np.abs(waveform))
    if peak > 0:
        waveform = waveform / peak * headroom
    return waveform

def save_wav(waveform, filename, sample_rate=SAMPLE_RATE):
    """Save waveform as WAV file."""
    # Convert to 16-bit integers
    waveform_int = (waveform * MAX_AMP).astype(np.int16)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    # Write WAV file
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(waveform_int.tobytes())
    
    print(f"Saved: {filename}")

def generate_drone_loop(duration=6.0):
    """Generate a contemplative drone loop."""
    # Base frequency (octave below 432)
    base = BASE_FREQ / 2
    
    # Create harmonics
    harmonics = []
    gains = []
    
    for i, ratio in enumerate(MINOR_RATIOS[:4]):
        freq = base * ratio
        # Slight detune for richness
        detune = (np.random.random() - 0.5) * 2  # ±1 Hz
        
        wave = generate_sine_wave(freq + detune, duration)
        
        # Higher harmonics are quieter
        gain = 1.0 / (i + 1)
        
        harmonics.append(wave)
        gains.append(gain)
    
    # Mix harmonics
    mixed = mix_waveforms(harmonics, gains)
    
    # Apply subtle envelope for seamless loop
    mixed = apply_fade(mixed, fade_duration=0.5)
    
    # Normalize
    mixed = normalize_audio(mixed, headroom=0.7)
    
    return mixed

def generate_texture_loop(duration=4.0):
    """Generate a granular-style texture loop."""
    # Multiple overlapping tones
    num_tones = 5
    tones = []
    
    for _ in range(num_tones):
        # Random frequency in range
        freq = np.random.uniform(200, 800)
        
        # Random duration for each tone
        tone_duration = np.random.uniform(1.0, 3.0)
        tone_start = np.random.uniform(0, duration - tone_duration)
        
        # Generate tone
        tone = generate_sine_wave(freq, duration)
        
        # Apply envelope to create grain-like effect
        tone = apply_envelope(tone, attack=0.3, release=0.3)
        
        # Random pan position (simulated by amplitude)
        pan = np.random.uniform(0.5, 1.0)
        tone *= pan
        
        tones.append(tone)
    
    # Mix tones
    mixed = mix_waveforms(tones)
    
    # Apply fade for seamless loop
    mixed = apply_fade(mixed, fade_duration=0.3)
    
    # Normalize
    mixed = normalize_audio(mixed, headroom=0.5)
    
    return mixed

def generate_breath_loop(duration=11.0):
    """Generate a breath-paced loop (inhale-exhale-pause cycle)."""
    # Breath cycle: 4s inhale, 6s exhale, 1s pause = 11s total
    
    base_freq = 216  # Subtle low presence
    
    # Create the breath modulation
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    
    # Inhale (0-4s): rising
    # Exhale (4-10s): falling  
    # Pause (10-11s): silence
    
    breath_shape = np.zeros_like(t)
    
    # Inhale phase
    inhale_mask = t < 4
    breath_shape[inhale_mask] = np.linspace(0, 0.5, np.sum(inhale_mask))
    
    # Exhale phase
    exhale_mask = (t >= 4) & (t < 10)
    breath_shape[exhale_mask] = np.linspace(0.5, 0, np.sum(exhale_mask))
    
    # Pause phase - already zeros
    
    # Generate carrier wave
    carrier = generate_sine_wave(base_freq, duration)
    
    # Modulate with breath shape
    modulated = carrier * breath_shape
    
    # Apply fade for seamless loop (breath loops need careful fading)
    modulated = apply_fade(modulated, fade_duration=1.0)
    
    # Normalize
    modulated = normalize_audio(modulated, headroom=0.4)
    
    return modulated

def generate_pad_loop(duration=8.0):
    """Generate a warm pad loop."""
    # Richer pad with triangle waves
    base = BASE_FREQ / 4  # Two octaves down
    
    waves = []
    gains = []
    
    # Fundamental
    waves.append(generate_triangle_wave(base, duration))
    gains.append(0.5)
    
    # Octave
    waves.append(generate_sine_wave(base * 2, duration))
    gains.append(0.3)
    
    # Fifth
    waves.append(generate_sine_wave(base * 1.5, duration))
    gains.append(0.2)
    
    # Mix
    mixed = mix_waveforms(waves, gains)
    
    # Apply long fade for very smooth loop
    mixed = apply_fade(mixed, fade_duration=1.5)
    
    # Normalize
    mixed = normalize_audio(mixed, headroom=0.6)
    
    return mixed

def main():
    """Generate all loop assets."""
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("THE HOLD - Loop Asset Generator")
    print("=" * 40)
    
    # Generate drone loop
    print("\nGenerating drone loop...")
    drone = generate_drone_loop(duration=6.0)
    save_wav(drone, os.path.join(output_dir, "drone-base.wav"))
    
    # Generate texture loop
    print("\nGenerating texture loop...")
    texture = generate_texture_loop(duration=4.0)
    save_wav(texture, os.path.join(output_dir, "texture-grains.wav"))
    
    # Generate breath loop
    print("\nGenerating breath loop...")
    breath = generate_breath_loop(duration=11.0)
    save_wav(breath, os.path.join(output_dir, "breath-cycle.wav"))
    
    # Generate pad loop
    print("\nGenerating pad loop...")
    pad = generate_pad_loop(duration=8.0)
    save_wav(pad, os.path.join(output_dir, "pad-warm.wav"))
    
    print("\n" + "=" * 40)
    print("Loop generation complete!")
    print(f"Output directory: {output_dir}")

if __name__ == "__main__":
    main()
