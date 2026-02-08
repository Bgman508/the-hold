/**
 * Session Management Unit Tests
 * 
 * Tests for session creation, validation, and management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAnonymousSession,
  validateSessionToken,
  verifySession,
  endSession,
  cleanupStaleSessions,
  hashIpAddress,
  SessionResult,
} from '../../lib/session';
import { mockPrismaClient } from '../../test/setup';

// Mock jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-jwt-token'),
    verify: vi.fn((token, secret, callback) => {
      if (token === 'valid-token') {
        return { sessionId: 'session-123', momentId: 'moment-123', iat: Date.now(), exp: Date.now() + 86400000 };
      }
      if (token === 'expired-token') {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      }
      if (token === 'invalid-token') {
        const error = new Error('Invalid token');
        (error as any).name = 'JsonWebTokenError';
        throw error;
      }
      return { sessionId: 'session-123', momentId: 'moment-123', iat: Date.now(), exp: Date.now() + 86400000 };
    }),
    TokenExpiredError: class TokenExpiredError extends Error {
      name = 'TokenExpiredError';
    },
    JsonWebTokenError: class JsonWebTokenError extends Error {
      name = 'JsonWebTokenError';
    },
  },
}));

// Mock rate limiter
vi.mock('../../lib/rate-limiter', () => ({
  RateLimiter: class MockRateLimiter {
    check(key: string) {
      if (key === 'blocked-key') {
        return { allowed: false, retryAfter: 300 };
      }
      return { allowed: true };
    }
  },
}));

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashIpAddress', () => {
    it('should hash IP address consistently', () => {
      const ip = '192.168.1.1';
      const hash1 = hashIpAddress(ip);
      const hash2 = hashIpAddress(ip);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIpAddress('192.168.1.1');
      const hash2 = hashIpAddress('192.168.1.2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle IPv6 addresses', () => {
      const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const hash = hashIpAddress(ip);
      
      expect(hash).toHaveLength(64);
    });
  });

  describe('createAnonymousSession', () => {
    const mockMoment = {
      id: 'moment-123',
      title: 'Test Moment',
      status: 'live',
      maxParticipants: 100,
    };

    const mockSession = {
      id: 'session-123',
      momentId: 'moment-123',
      token: 'mock-jwt-token',
      startedAt: new Date(),
    };

    it('should create a session successfully', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue(mockMoment);
      mockPrismaClient.session.create.mockResolvedValue(mockSession);
      mockPrismaClient.session.update.mockResolvedValue({ ...mockSession, token: 'mock-jwt-token' });
      mockPrismaClient.moment.update.mockResolvedValue({ ...mockMoment, totalSessions: 1 });

      const result = await createAnonymousSession(
        { momentId: 'moment-123', userAgent: 'Test Agent', ipAddress: '192.168.1.1' },
        'rate-limit-key'
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.sessionId).toBe('session-123');
    });

    it('should reject when rate limit exceeded', async () => {
      const result = await createAnonymousSession(
        { momentId: 'moment-123' },
        'blocked-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.retryAfter).toBe(300);
    });

    it('should reject when moment not found', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue(null);

      const result = await createAnonymousSession(
        { momentId: 'non-existent-moment' },
        'rate-limit-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Moment not found');
    });

    it('should reject when moment is not live', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue({
        ...mockMoment,
        status: 'scheduled',
      });

      const result = await createAnonymousSession(
        { momentId: 'moment-123' },
        'rate-limit-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Moment is not currently live');
    });

    it('should handle session without IP address', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue(mockMoment);
      mockPrismaClient.session.create.mockResolvedValue(mockSession);
      mockPrismaClient.session.update.mockResolvedValue({ ...mockSession, token: 'mock-jwt-token' });
      mockPrismaClient.moment.update.mockResolvedValue({ ...mockMoment, totalSessions: 1 });

      const result = await createAnonymousSession(
        { momentId: 'moment-123', userAgent: 'Test Agent' },
        'rate-limit-key'
      );

      expect(result.success).toBe(true);
    });

    it('should truncate long user agent strings', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue(mockMoment);
      mockPrismaClient.session.create.mockResolvedValue(mockSession);
      mockPrismaClient.session.update.mockResolvedValue({ ...mockSession, token: 'mock-jwt-token' });

      const longUserAgent = 'A'.repeat(1000);
      
      await createAnonymousSession(
        { momentId: 'moment-123', userAgent: longUserAgent },
        'rate-limit-key'
      );

      expect(mockPrismaClient.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userAgent: 'A'.repeat(500),
          }),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.moment.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await createAnonymousSession(
        { momentId: 'moment-123' },
        'rate-limit-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create session');
    });
  });

  describe('validateSessionToken', () => {
    it('should validate a valid token', () => {
      const payload = validateSessionToken('valid-token');
      
      expect(payload).not.toBeNull();
      expect(payload?.sessionId).toBe('session-123');
      expect(payload?.momentId).toBe('moment-123');
    });

    it('should return null for expired token', () => {
      const payload = validateSessionToken('expired-token');
      
      expect(payload).toBeNull();
    });

    it('should return null for invalid token', () => {
      const payload = validateSessionToken('invalid-token');
      
      expect(payload).toBeNull();
    });

    it('should return null for malformed token', () => {
      const payload = validateSessionToken('malformed');
      
      expect(payload).toBeNull();
    });
  });

  describe('verifySession', () => {
    const mockSession = {
      id: 'session-123',
      momentId: 'moment-123',
      endedAt: null,
      startedAt: new Date(),
    };

    it('should verify a valid active session', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);

      const result = await verifySession('valid-token');

      expect(result.valid).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(result.momentId).toBe('moment-123');
    });

    it('should reject invalid token', async () => {
      const result = await verifySession('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should reject non-existent session', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      const result = await verifySession('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should reject ended session', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
      });

      const result = await verifySession('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session has ended');
    });
  });

  describe('endSession', () => {
    const mockSession = {
      id: 'session-123',
      momentId: 'moment-123',
      startedAt: new Date(Date.now() - 60000), // Started 1 minute ago
      endedAt: null,
      presences: [],
    };

    it('should end a session successfully', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaClient.session.update.mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
        durationSeconds: 60,
      });
      mockPrismaClient.presence.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.moment.update.mockResolvedValue({});

      const result = await endSession('session-123');

      expect(result.success).toBe(true);
      expect(result.durationSeconds).toBeGreaterThanOrEqual(60);
    });

    it('should reject non-existent session', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      const result = await endSession('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should reject already ended session', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
      });

      const result = await endSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session already ended');
    });

    it('should clean up presences on session end', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue({
        ...mockSession,
        presences: [{ id: 'presence-1' }, { id: 'presence-2' }],
      });
      mockPrismaClient.session.update.mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
        durationSeconds: 60,
      });
      mockPrismaClient.presence.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.moment.update.mockResolvedValue({});

      await endSession('session-123');

      expect(mockPrismaClient.presence.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
      });
    });

    it('should update moment metrics when session ends', async () => {
      const longSession = {
        ...mockSession,
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(longSession);
      mockPrismaClient.session.update.mockResolvedValue({
        ...longSession,
        endedAt: new Date(),
        durationSeconds: 300,
      });
      mockPrismaClient.presence.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.moment.update.mockResolvedValue({});

      await endSession('session-123');

      expect(mockPrismaClient.moment.update).toHaveBeenCalledWith({
        where: { id: 'moment-123' },
        data: {
          totalMinutesPresent: { increment: 5 },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.session.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await endSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to end session');
    });
  });

  describe('cleanupStaleSessions', () => {
    it('should clean up stale sessions', async () => {
      const staleSessions = [
        { id: 'session-1' },
        { id: 'session-2' },
      ];
      
      mockPrismaClient.session.findMany.mockResolvedValue(staleSessions);
      mockPrismaClient.session.findUnique.mockResolvedValue({
        id: 'session-1',
        momentId: 'moment-123',
        startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        endedAt: null,
        presences: [],
      });
      mockPrismaClient.session.update.mockResolvedValue({});
      mockPrismaClient.presence.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.moment.update.mockResolvedValue({});

      const count = await cleanupStaleSessions();

      expect(count).toBe(2);
    });

    it('should return 0 when no stale sessions', async () => {
      mockPrismaClient.session.findMany.mockResolvedValue([]);

      const count = await cleanupStaleSessions();

      expect(count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.session.findMany.mockRejectedValue(new Error('DB Error'));

      const count = await cleanupStaleSessions();

      expect(count).toBe(0);
    });
  });
});
