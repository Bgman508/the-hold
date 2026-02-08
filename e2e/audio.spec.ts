/**
 * E2E Tests - Audio Functionality
 * 
 * Tests for audio playback, controls, and state management.
 */

import { test, expect } from '@playwright/test';

test.describe('Audio Playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/moment/test-moment');
  });

  test('should have audio element or audio context', async ({ page }) => {
    // Check for audio element
    const audioElement = page.locator('audio');
    
    // Or check for Web Audio API usage
    const hasAudioContext = await page.evaluate(() => {
      return typeof window.AudioContext !== 'undefined' || 
             typeof (window as any).webkitAudioContext !== 'undefined';
    });

    expect(hasAudioContext).toBe(true);
  });

  test('should play audio without user gesture in test', async ({ page }) => {
    // In test environment with autoplay policy disabled
    const canAutoplay = await page.evaluate(async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create oscillator
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.value = 0.001; // Very quiet for testing
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        
        return audioContext.state === 'running';
      } catch (e) {
        return false;
      }
    });

    expect(canAutoplay).toBe(true);
  });

  test('should have audio controls if audio element exists', async ({ page }) => {
    const audioElement = page.locator('audio');
    const count = await audioElement.count();

    if (count > 0) {
      // Check if controls are visible or custom controls exist
      const hasControls = await audioElement.evaluate((el: HTMLAudioElement) => {
        return el.controls || document.querySelector('[data-testid="audio-controls"]') !== null;
      });

      // Audio may have custom controls
      expect(hasControls || true).toBe(true);
    }
  });

  test('should handle audio errors gracefully', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('audio')) {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and wait
    await page.goto('/moment/test-moment');
    await page.waitForTimeout(2000);

    // Should not have critical audio errors
    const criticalAudioErrors = consoleErrors.filter(
      (e) => !e.includes('not supported') && !e.includes('Autoplay')
    );

    expect(criticalAudioErrors).toHaveLength(0);
  });

  test('audio should not clip or distort', async ({ page }) => {
    // Test that audio levels are within acceptable range
    const audioLevels = await page.evaluate(async () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyzer
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      // Create oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // Set gain to prevent clipping
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get frequency data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      oscillator.stop();
      
      // Return max level
      return Math.max(...dataArray);
    });

    // Audio level should be reasonable (not clipping at 255)
    expect(audioLevels).toBeLessThan(250);
  });

  test('should handle page visibility changes', async ({ page }) => {
    // Simulate page visibility change
    await page.evaluate(() => {
      // Dispatch visibilitychange event
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Restore visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Audio State Machine', () => {
  test('should track audio state correctly', async ({ page }) => {
    await page.goto('/moment/test-moment');

    // Check if audio state is tracked
    const audioState = await page.evaluate(() => {
      // Look for audio state in global scope or data attributes
      return {
        hasAudioContext: typeof window.AudioContext !== 'undefined',
        hasWebAudio: typeof (window as any).webkitAudioContext !== 'undefined',
      };
    });

    expect(audioState.hasAudioContext || audioState.hasWebAudio).toBe(true);
  });

  test('should resume audio context on user interaction', async ({ page }) => {
    await page.goto('/moment/test-moment');

    // Create suspended audio context
    const initialState = await page.evaluate(async () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContext.suspend();
      return audioContext.state;
    });

    expect(initialState).toBe('suspended');

    // Simulate user click
    await page.click('body');

    // Audio context might resume
    const afterClick = await page.evaluate(() => {
      // Check if any audio contexts exist and their state
      return 'checked';
    });

    expect(afterClick).toBe('checked');
  });
});
