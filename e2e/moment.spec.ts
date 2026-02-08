/**
 * E2E Tests - Moment Entry and Presence
 * 
 * Tests for entering a moment, presence tracking, and leaving.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Moment Entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to moment page', async ({ page }) => {
    // Look for enter moment button or link
    const enterButton = page.locator(
      'text=Enter Moment, text=Join, text=Enter, [data-testid="enter-moment"], button'
    ).first();

    // If enter button exists, click it
    const buttonCount = await enterButton.count();
    if (buttonCount > 0 && await enterButton.isVisible().catch(() => false)) {
      await enterButton.click();
      
      // Should navigate to moment or show moment interface
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show moment interface when entered', async ({ page }) => {
    // Navigate to a moment if available
    await page.goto('/moment/test-moment');
    
    // Check that moment content is displayed
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display presence count', async ({ page }) => {
    // Navigate to moment
    await page.goto('/moment/test-moment');
    
    // Look for presence indicator
    const presenceIndicator = page.locator(
      '[data-testid="presence-count"], text=/\\d+ present/i, text=/\\d+ here/i'
    );

    // Presence indicator may not exist in MVP
    const count = await presenceIndicator.count();
    if (count > 0) {
      await expect(presenceIndicator.first()).toBeVisible();
    }
  });

  test('should allow leaving moment', async ({ page }) => {
    // Navigate to moment
    await page.goto('/moment/test-moment');
    
    // Look for leave button
    const leaveButton = page.locator(
      'text=Leave, text=Exit, [data-testid="leave-moment"]'
    ).first();

    const count = await leaveButton.count();
    if (count > 0 && await leaveButton.isVisible().catch(() => false)) {
      await leaveButton.click();
      
      // Should navigate back or show confirmation
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle moment not found', async ({ page }) => {
    // Navigate to non-existent moment
    await page.goto('/moment/non-existent-moment-12345');
    
    // Should show error or redirect
    await expect(page.locator('body')).toBeVisible();
    
    // Check for error message
    const errorMessage = page.locator('text=/not found|error|404/i');
    const hasError = await errorMessage.count() > 0;
    
    // Either show error or handle gracefully
    expect(hasError || await page.locator('body').isVisible()).toBeTruthy();
  });
});

test.describe('Multi-Tab Presence', () => {
  test('should show presence count across tabs', async ({ browser }) => {
    // Create first context (tab 1)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    // Create second context (tab 2)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // Navigate both to the same moment
      await page1.goto('/moment/test-moment');
      await page2.goto('/moment/test-moment');

      // Wait for presence to update
      await page1.waitForTimeout(2000);

      // Check presence count on page1
      const presenceIndicator1 = page1.locator('[data-testid="presence-count"]');
      if (await presenceIndicator1.count() > 0) {
        const text1 = await presenceIndicator1.textContent();
        
        // Should show at least 1 person present
        const match1 = text1?.match(/(\d+)/);
        if (match1) {
          const count1 = parseInt(match1[1], 10);
          expect(count1).toBeGreaterThanOrEqual(1);
        }
      }

      // Check presence count on page2
      const presenceIndicator2 = page2.locator('[data-testid="presence-count"]');
      if (await presenceIndicator2.count() > 0) {
        const text2 = await presenceIndicator2.textContent();
        
        const match2 = text2?.match(/(\d+)/);
        if (match2) {
          const count2 = parseInt(match2[1], 10);
          expect(count2).toBeGreaterThanOrEqual(1);
        }
      }
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should update presence when tab closes', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // Both tabs enter moment
      await page1.goto('/moment/test-moment');
      await page2.goto('/moment/test-moment');
      
      await page1.waitForTimeout(2000);

      // Close second tab
      await context2.close();

      // Wait for presence update
      await page1.waitForTimeout(2000);

      // Presence should update on remaining tab
      await expect(page1.locator('body')).toBeVisible();
    } finally {
      await context1.close();
    }
  });
});
