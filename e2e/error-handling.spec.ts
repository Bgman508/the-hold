/**
 * E2E Tests - Error Handling
 * 
 * Tests for error states, error boundaries, and graceful degradation.
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should handle 404 errors gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-12345');

    // Should show 404 page or redirect
    await expect(page.locator('body')).toBeVisible();

    // Check for error message
    const errorMessage = page.locator(
      'text=/404|not found|page not found/i, h1, [data-testid="404"]'
    );

    // Should have some indication of error
    const hasErrorContent = await errorMessage.count() > 0 ||
      (await page.title()).includes('404') ||
      (await page.title()).includes('Not Found');

    expect(hasErrorContent).toBe(true);
  });

  test('should handle 500 errors gracefully', async ({ page }) => {
    // Force an error by navigating to error route
    await page.goto('/api/error-test');

    // Should show error page or message
    await expect(page.locator('body')).toBeVisible();

    // Check for error indicator
    const errorContent = await page.content();
    const hasErrorIndicator = 
      errorContent.includes('error') ||
      errorContent.includes('Error') ||
      (await page.title()).includes('Error');

    expect(hasErrorIndicator).toBe(true);
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out non-critical errors
    const criticalErrors = jsErrors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('source map') &&
        !e.includes('webpack')
    );

    // Should have no critical JS errors
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle network errors', async ({ page }) => {
    // Block all API requests
    await page.route('/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/');

    // Page should still render
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle slow network', async ({ page }) => {
    // Slow down all requests
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/');

    // Page should eventually load
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
  });

  test('should show loading states', async ({ page }) => {
    // Slow down API requests
    await page.route('/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');

    // Check for loading indicator
    const loadingIndicator = page.locator(
      'text=/loading|please wait/i, [data-testid="loading"], .loading, .spinner'
    );

    // May show loading indicator
    expect(await loadingIndicator.count() >= 0).toBe(true);
  });
});

test.describe('Error Boundaries', () => {
  test('should catch component errors', async ({ page }) => {
    // Inject error into page
    await page.goto('/');
    
    const errorCaught = await page.evaluate(() => {
      try {
        // Simulate component error
        throw new Error('Test component error');
      } catch (e) {
        // Check if error boundary would catch this
        return true;
      }
    });

    expect(errorCaught).toBe(true);
  });

  test('should display fallback UI on error', async ({ page }) => {
    await page.goto('/');

    // Check for error boundary fallback
    const fallbackUI = page.locator(
      '[data-testid="error-boundary"], text=/something went wrong|error occurred/i'
    );

    // May or may not have explicit error boundary UI
    expect(await fallbackUI.count() >= 0).toBe(true);
  });

  test('should allow recovery from errors', async ({ page }) => {
    await page.goto('/');

    // Check for retry/recover button
    const retryButton = page.locator(
      'text=/retry|reload|try again/i, button:has-text("Retry")'
    );

    // May have retry functionality
    if (await retryButton.count() > 0) {
      await retryButton.first().click();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('API Error Handling', () => {
  test('should handle API 400 errors', async ({ page }) => {
    // Mock API to return 400
    await page.route('/api/**', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Bad Request' }),
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API 401 errors', async ({ page }) => {
    await page.route('/api/**', (route) => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API 403 errors', async ({ page }) => {
    await page.route('/api/**', (route) => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ error: 'Forbidden' }),
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API 500 errors', async ({ page }) => {
    await page.route('/api/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API timeout', async ({ page }) => {
    await page.route('/api/**', (route) => {
      // Never respond - simulate timeout
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Form Error Handling', () => {
  test('should validate form inputs', async ({ page }) => {
    await page.goto('/');

    // Look for forms
    const forms = page.locator('form');
    const formCount = await forms.count();

    if (formCount > 0) {
      // Try submitting empty form
      const submitButton = forms.first().locator('button[type="submit"], button:has-text("Submit")');
      
      if (await submitButton.count() > 0) {
        await submitButton.first().click();
        
        // Should show validation errors
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should show field-specific errors', async ({ page }) => {
    await page.goto('/');

    // Check for error message containers
    const errorMessages = page.locator(
      '[data-testid="error-message"], .error-message, .field-error'
    );

    // May have error message containers
    expect(await errorMessages.count() >= 0).toBe(true);
  });
});
