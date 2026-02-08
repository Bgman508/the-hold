/**
 * E2E Tests - Home Page
 * 
 * Tests for the home page loading and basic functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/THE HOLD/i);

    // Check main content is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display the logo or brand', async ({ page }) => {
    // Check for brand text or logo
    const brand = page.locator('text=THE HOLD, [data-testid="logo"], h1');
    await expect(brand.first()).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    
    // Navigation may or may not exist
    const navCount = await nav.count();
    if (navCount > 0) {
      await expect(nav.first()).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have no console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('Source map') &&
        !error.includes('webpack')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper meta tags', async ({ page }) => {
    // Check charset
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toLowerCase()).toBe('utf-8');

    // Check viewport
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
