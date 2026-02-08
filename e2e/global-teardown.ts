/**
 * Playwright Global Teardown
 * 
 * Teardown that runs once after all E2E tests.
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Running global teardown...');

  // Cleanup test data if needed
  // This could include:
  // - Cleaning up test database
  // - Removing test files
  // - Resetting external services

  console.log('Global teardown completed');
}

export default globalTeardown;
