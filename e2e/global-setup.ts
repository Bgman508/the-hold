/**
 * Playwright Global Setup
 * 
 * Setup that runs once before all E2E tests.
 */

import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('Running global setup...');

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-e2e';
  process.env.IP_HASH_SECRET = 'test-ip-hash-secret-for-e2e';

  // Run database migrations
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Database migrations completed');
  } catch (error) {
    console.warn('Migration warning:', error);
  }

  // Seed test data if needed
  try {
    execSync('npx prisma db seed', { stdio: 'inherit' });
    console.log('Database seeding completed');
  } catch (error) {
    console.warn('Seeding warning:', error);
  }

  console.log('Global setup completed');
}

export default globalSetup;
