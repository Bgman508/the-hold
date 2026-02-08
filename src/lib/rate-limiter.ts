/**
 * Rate Limiter for WebSocket and API
 * 
 * Implements sliding window rate limiting with IP-based tracking.
 * Uses hashed IPs for privacy (no raw IPs stored).
 */

import crypto from 'crypto';

export interface RateLimitConfig {
  // Maximum requests per window
  maxRequests: number;
  // Window size in milliseconds
  windowMs: number;
  // Block duration after exceeding limit (ms)
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil?: number;
}

// Default rate limits
export const DEFAULT_WS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,      // 60 messages
  windowMs: 60000,      // per minute
  blockDurationMs: 300000, // Block for 5 minutes
};

export const DEFAULT_API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,      // 30 requests
  windowMs: 60000,      // per minute
  blockDurationMs: 300000, // Block for 5 minutes
};

export const HEARTBEAT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 120,     // 120 heartbeats
  windowMs: 60000,      // per minute (every 500ms max)
  blockDurationMs: 60000,  // Block for 1 minute
};

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = DEFAULT_WS_RATE_LIMIT) {
    this.config = config;
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Hash an IP address for privacy
   */
  static hashIp(ip: string): string {
    return crypto
      .createHmac('sha256', process.env.IP_HASH_SECRET || 'default-secret-change-in-production')
      .update(ip)
      .digest('hex');
  }

  /**
   * Create a rate limit key from identifier
   */
  createKey(identifier: string): string {
    return identifier;
  }

  /**
   * Check if request is allowed
   * Returns { allowed, retryAfter }
   */
  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const key = this.createKey(identifier);
    const entry = this.limits.get(key);

    // If no entry exists, allow and create new entry
    if (!entry) {
      this.limits.set(key, {
        count: 1,
        windowStart: now,
        blocked: false,
      });
      return { allowed: true };
    }

    // Check if currently blocked
    if (entry.blocked) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        return { 
          allowed: false, 
          retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) 
        };
      }
      // Block expired, reset
      entry.blocked = false;
      entry.count = 1;
      entry.windowStart = now;
      return { allowed: true };
    }

    // Check if window has expired
    if (now - entry.windowStart > this.config.windowMs) {
      entry.count = 1;
      entry.windowStart = now;
      return { allowed: true };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true;
      entry.blockedUntil = now + this.config.blockDurationMs;
      return { 
        allowed: false, 
        retryAfter: Math.ceil(this.config.blockDurationMs / 1000) 
      };
    }

    return { allowed: true };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.limits.delete(this.createKey(identifier));
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      // Remove entries where window has expired and not blocked
      if (!entry.blocked && now - entry.windowStart > this.config.windowMs) {
        this.limits.delete(key);
      }
      // Remove entries where block has expired
      if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get current stats (for monitoring)
   */
  getStats(): { totalEntries: number; blockedEntries: number } {
    let blockedEntries = 0;
    for (const entry of this.limits.values()) {
      if (entry.blocked) blockedEntries++;
    }
    return {
      totalEntries: this.limits.size,
      blockedEntries,
    };
  }
}

// Export singleton instances
export const wsRateLimiter = new RateLimiter(DEFAULT_WS_RATE_LIMIT);
export const apiRateLimiter = new RateLimiter(DEFAULT_API_RATE_LIMIT);
export const heartbeatRateLimiter = new RateLimiter(HEARTBEAT_RATE_LIMIT);

export default RateLimiter;
