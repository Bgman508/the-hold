/**
 * Integration Test Setup
 * 
 * Setup for integration tests with real database.
 */

import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

// ============================================
// Database Setup
// ============================================

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test-integration.db',
    },
  },
});

// ============================================
// Test Database Management
// ============================================

/**
 * Reset database to clean state
 */
async function resetDatabase() {
  // Delete all data in reverse order of dependencies
  await prisma.presence.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.moment.deleteMany({});
  await prisma.auditLog.deleteMany({});
}

/**
 * Run migrations
 */
function runMigrations() {
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
    });
  } catch (error) {
    console.warn('Migration warning (may already be up to date):', error);
  }
}

// ============================================
// Global Setup
// ============================================

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration';
  process.env.IP_HASH_SECRET = 'test-ip-hash-secret-for-integration';

  // Run migrations
  runMigrations();

  // Connect to database
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up
  await resetDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Reset database before each test
  await resetDatabase();
  
  // Clear all mocks
  vi.clearAllMocks();
});

// ============================================
// Test Utilities
// ============================================

/**
 * Create a test moment in the database
 */
export async function createTestMoment(data: Partial<any> = {}) {
  return prisma.moment.create({
    data: {
      title: 'Test Moment',
      description: 'A test moment',
      slug: `test-moment-${Date.now()}`,
      status: 'live',
      maxParticipants: 100,
      duration: 3600,
      isPublic: true,
      ...data,
    },
  });
}

/**
 * Create a test session in the database
 */
export async function createTestSession(momentId: string, data: Partial<any> = {}) {
  return prisma.session.create({
    data: {
      momentId,
      token: `test-token-${Date.now()}`,
      startedAt: new Date(),
      ...data,
    },
  });
}

/**
 * Create a test presence in the database
 */
export async function createTestPresence(
  sessionId: string,
  momentId: string,
  data: Partial<any> = {}
) {
  return prisma.presence.create({
    data: {
      socketId: `test-socket-${Date.now()}`,
      sessionId,
      momentId,
      connectedAt: new Date(),
      lastHeartbeatAt: new Date(),
      ...data,
    },
  });
}

/**
 * Get database instance
 */
export { prisma };

// ============================================
// Export Vitest utilities
// ============================================

export { vi, expect, describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
