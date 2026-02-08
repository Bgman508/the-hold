/**
 * Rate Limiter Unit Tests
 * 
 * Tests for sliding window rate limiting with abuse detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RateLimiter, {
  DEFAULT_WS_RATE_LIMIT,
  DEFAULT_API_RATE_LIMIT,
  HEARTBEAT_RATE_LIMIT,
  wsRateLimiter,
  apiRateLimiter,
  heartbeatRateLimiter,
} from '../../lib/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Configuration', () => {
    it('should have correct default WebSocket rate limit', () => {
      expect(DEFAULT_WS_RATE_LIMIT.maxRequests).toBe(60);
      expect(DEFAULT_WS_RATE_LIMIT.windowMs).toBe(60000);
      expect(DEFAULT_WS_RATE_LIMIT.blockDurationMs).toBe(300000);
    });

    it('should have correct default API rate limit', () => {
      expect(DEFAULT_API_RATE_LIMIT.maxRequests).toBe(30);
      expect(DEFAULT_API_RATE_LIMIT.windowMs).toBe(60000);
      expect(DEFAULT_API_RATE_LIMIT.blockDurationMs).toBe(300000);
    });

    it('should have correct heartbeat rate limit', () => {
      expect(HEARTBEAT_RATE_LIMIT.maxRequests).toBe(120);
      expect(HEARTBEAT_RATE_LIMIT.windowMs).toBe(60000);
      expect(HEARTBEAT_RATE_LIMIT.blockDurationMs).toBe(60000);
    });

    it('should export singleton instances', () => {
      expect(wsRateLimiter).toBeInstanceOf(RateLimiter);
      expect(apiRateLimiter).toBeInstanceOf(RateLimiter);
      expect(heartbeatRateLimiter).toBeInstanceOf(RateLimiter);
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should allow first request', () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      const result = limiter.check('user-1');

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should allow requests within limit', () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user-1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        limiter.check('user-1');
      }

      // Next request should be blocked
      const result = limiter.check('user-1');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(300); // 5 minutes in seconds
    });

    it('should track different identifiers separately', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Use up limit for user-1
      for (let i = 0; i < 3; i++) {
        limiter.check('user-1');
      }

      // user-2 should still be allowed
      const result = limiter.check('user-2');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Sliding Window', () => {
    it('should reset counter after window expires', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Use up limit
      for (let i = 0; i < 3; i++) {
        limiter.check('user-1');
      }

      // Advance time past window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const result = limiter.check('user-1');
      expect(result.allowed).toBe(true);
    });

    it('should maintain separate windows for different users', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // First request for user-1
      limiter.check('user-1');

      // Advance time partially
      vi.advanceTimersByTime(30000);

      // First request for user-2
      limiter.check('user-2');

      // Advance time past user-1's window but not user-2's
      vi.advanceTimersByTime(35000);

      // user-1 should have fresh window
      const user1Result = limiter.check('user-1');
      expect(user1Result.allowed).toBe(true);

      // user-2 should still be in their window
      const user2Result = limiter.check('user-2');
      expect(user2Result.allowed).toBe(true);
    });
  });

  describe('Blocking', () => {
    it('should block for specified duration', () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 120000, // 2 minutes
      });

      // Exceed limit
      limiter.check('user-1');
      limiter.check('user-1');
      limiter.check('user-1'); // This triggers block

      // Should be blocked immediately after
      let result = limiter.check('user-1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(120);

      // Advance time but not past block duration
      vi.advanceTimersByTime(60000);

      // Should still be blocked
      result = limiter.check('user-1');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(60);
    });

    it('should allow requests after block expires', () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 60000,
      });

      // Exceed limit
      limiter.check('user-1');
      limiter.check('user-1');
      limiter.check('user-1');

      // Advance past block duration
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const result = limiter.check('user-1');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset rate limit for identifier', () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Exceed limit
      limiter.check('user-1');
      limiter.check('user-1');
      limiter.check('user-1');

      // Reset
      limiter.reset('user-1');

      // Should be allowed
      const result = limiter.check('user-1');
      expect(result.allowed).toBe(true);
    });

    it('should not affect other users when resetting', () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Exceed limit for both users
      limiter.check('user-1');
      limiter.check('user-1');
      limiter.check('user-1');

      limiter.check('user-2');
      limiter.check('user-2');
      limiter.check('user-2');

      // Reset only user-1
      limiter.reset('user-1');

      // user-1 should be allowed
      expect(limiter.check('user-1').allowed).toBe(true);

      // user-2 should still be blocked
      expect(limiter.check('user-2').allowed).toBe(false);
    });
  });

  describe('Stats', () => {
    it('should return correct stats', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Add some entries
      limiter.check('user-1');
      limiter.check('user-2');
      limiter.check('user-3');

      // Block one user
      limiter.check('user-1');
      limiter.check('user-1');
      limiter.check('user-1');

      const stats = limiter.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.blockedEntries).toBe(1);
    });

    it('should return zero stats for empty limiter', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      const stats = limiter.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.blockedEntries).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Add entry
      limiter.check('user-1');

      // Advance past window
      vi.advanceTimersByTime(61000);

      // Trigger cleanup by adding new entry
      limiter.check('user-2');

      // Stats should show only one entry
      const stats = limiter.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should cleanup expired blocks', () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        blockDurationMs: 60000,
      });

      // Block user
      limiter.check('user-1');
      limiter.check('user-1');
      limiter.check('user-1');

      // Advance past block duration
      vi.advanceTimersByTime(61000);

      // Trigger cleanup
      limiter.check('user-2');

      const stats = limiter.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.blockedEntries).toBe(0);
    });
  });

  describe('IP Hashing', () => {
    it('should hash IP addresses consistently', () => {
      const ip = '192.168.1.1';
      const hash1 = RateLimiter.hashIp(ip);
      const hash2 = RateLimiter.hashIp(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = RateLimiter.hashIp('192.168.1.1');
      const hash2 = RateLimiter.hashIp('192.168.1.2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive requests', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      // Make 100 rapid requests
      for (let i = 0; i < 100; i++) {
        const result = limiter.check('user-1');
        expect(result.allowed).toBe(true);
      }

      // 101st should be blocked
      const result = limiter.check('user-1');
      expect(result.allowed).toBe(false);
    });

    it('should handle empty identifier', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      const result = limiter.check('');
      expect(result.allowed).toBe(true);
    });

    it('should handle special characters in identifier', () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        blockDurationMs: 300000,
      });

      const specialIds = [
        'user@example.com',
        'user:123:456',
        'user/123/456',
        'user\\123\\456',
        'user 123 456',
      ];

      specialIds.forEach((id) => {
        const result = limiter.check(id);
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Abuse Detection', () => {
    it('should detect and block rapid abuse pattern', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000, // 1 second window
        blockDurationMs: 5000,
      });

      // Rapid requests within 1 second
      for (let i = 0; i < 10; i++) {
        limiter.check('abuser');
      }

      // Should be blocked
      const result = limiter.check('abuser');
      expect(result.allowed).toBe(false);
    });

    it('should have different limits for different endpoints', () => {
      // WebSocket limit is higher than API limit
      expect(DEFAULT_WS_RATE_LIMIT.maxRequests).toBeGreaterThan(
        DEFAULT_API_RATE_LIMIT.maxRequests
      );

      // Heartbeat limit is highest
      expect(HEARTBEAT_RATE_LIMIT.maxRequests).toBeGreaterThan(
        DEFAULT_WS_RATE_LIMIT.maxRequests
      );
    });
  });
});
