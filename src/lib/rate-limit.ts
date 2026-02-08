/**
 * Rate Limiting for THE HOLD
 * 
 * Security Features:
 * - WebSocket connection rate limiting
 * - API endpoint rate limiting
 * - Abuse detection per IP hash (no PII)
 * - Sliding window algorithm
 * - Automatic cleanup of expired entries
 */

import { hashIpAddress, getClientIp } from '@/middleware/auth';
import type { NextRequest } from 'next/server';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Rate limit configuration
 * All limits are per IP hash (no PII stored)
 */
export const RATE_LIMIT_CONFIG = {
  // WebSocket connections
  websocket: {
    windowMs: 60 * 1000, // 1 minute window
    maxConnections: 10, // Max 10 connection attempts per minute
    blockDurationMs: 5 * 60 * 1000, // 5 minute block if exceeded
  },
  
  // API endpoints
  api: {
    // General API
    general: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
    },
    // Moment creation (Council only, stricter)
    momentCreate: {
      windowMs: 60 * 1000,
      maxRequests: 5, // 5 moment creates per minute
    },
    // Moment activation (Council only, stricter)
    momentActivate: {
      windowMs: 60 * 1000,
      maxRequests: 10, // 10 activations per minute
    },
    // Anonymous session creation
    anonymousSession: {
      windowMs: 60 * 1000,
      maxRequests: 20, // 20 sessions per minute
    },
  },
  
  // Abuse detection thresholds
  abuse: {
    // Suspicious patterns
    rapidRequestsThreshold: 100, // 100 requests in 10 seconds
    rapidRequestsWindowMs: 10 * 1000,
    rapidRequestsBlockMs: 15 * 60 * 1000, // 15 minute block
    
    // Repeated violations
    violationThreshold: 3, // 3 rate limit violations
    violationWindowMs: 10 * 60 * 1000, // in 10 minutes
    violationBlockMs: 30 * 60 * 1000, // 30 minute block
    
    // Burst detection
    burstThreshold: 50, // 50 requests in 5 seconds
    burstWindowMs: 5 * 1000,
    burstBlockMs: 10 * 60 * 1000, // 10 minute block
  },
};

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
  violations: number[];
  blocked: boolean;
  blockedUntil?: number;
  abuseScore: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  abuseDetected?: boolean;
}

// ============================================================================
// IN-MEMORY STORE (Production: Use Redis)
// ============================================================================

/**
 * In-memory rate limit store
 * Key: IP hash (no PII)
 * Value: Rate limit entry
 * 
 * NOTE: For production, replace with Redis or similar
 * for distributed rate limiting across multiple servers
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, entry] of this.store.entries()) {
      const lastActivity = Math.max(
        entry.windowStart,
        entry.blockedUntil || 0,
        ...entry.violations
      );
      
      if (now - lastActivity > maxAge) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  // For monitoring/debugging (no PII exposed)
  getStats(): { totalEntries: number; blockedEntries: number } {
    let blockedEntries = 0;
    for (const entry of this.store.values()) {
      if (entry.blocked) blockedEntries++;
    }
    return {
      totalEntries: this.store.size,
      blockedEntries,
    };
  }
}

// Global store instance
const rateLimitStore = new RateLimitStore();

// ============================================================================
// CORE RATE LIMITING LOGIC
// ============================================================================

/**
 * Check if request is within rate limit
 * Uses sliding window algorithm
 */
function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number,
  blockDurationMs: number = 0
): RateLimitResult {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  // Check if currently blocked
  if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Reset block if expired
  if (entry?.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blocked = false;
    entry.blockedUntil = undefined;
    entry.count = 0;
    entry.windowStart = now;
  }

  // Create new entry if doesn't exist or window expired
  if (!entry || now - entry.windowStart > windowMs) {
    entry = {
      count: 1,
      windowStart: now,
      violations: entry?.violations || [],
      blocked: false,
      abuseScore: entry?.abuseScore || 0,
    };
    rateLimitStore.set(identifier, entry);
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    // Record violation
    entry.violations.push(now);
    
    // Apply block if configured
    if (blockDurationMs > 0 && !entry.blocked) {
      entry.blocked = true;
      entry.blockedUntil = now + blockDurationMs;
    }
    
    rateLimitStore.set(identifier, entry);

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil || now + windowMs,
      retryAfter: Math.ceil(((entry.blockedUntil || now + windowMs) - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.windowStart + windowMs,
  };
}

// ============================================================================
// WEBSOCKET RATE LIMITING
// ============================================================================

/**
 * Rate limit WebSocket connection attempts
 * @param ipHash - Hashed IP address (no PII)
 * @returns Rate limit result
 */
export function limitWebSocketConnection(ipHash: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIG.websocket;
  const identifier = `ws:${ipHash}`;
  
  return checkRateLimit(
    identifier,
    config.windowMs,
    config.maxConnections,
    config.blockDurationMs
  );
}

/**
 * Check WebSocket rate limit from request
 */
export function checkWebSocketRateLimit(req: NextRequest): RateLimitResult {
  const ip = getClientIp(req);
  const ipHash = hashIpAddress(ip);
  return limitWebSocketConnection(ipHash);
}

// ============================================================================
// API RATE LIMITING
// ============================================================================

/**
 * Rate limit general API requests
 */
export function limitApiRequest(ipHash: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIG.api.general;
  const identifier = `api:${ipHash}`;
  
  return checkRateLimit(identifier, config.windowMs, config.maxRequests);
}

/**
 * Rate limit moment creation (Council only)
 */
export function limitMomentCreate(ipHash: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIG.api.momentCreate;
  const identifier = `api:moment:create:${ipHash}`;
  
  return checkRateLimit(identifier, config.windowMs, config.maxRequests);
}

/**
 * Rate limit moment activation (Council only)
 */
export function limitMomentActivate(ipHash: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIG.api.momentActivate;
  const identifier = `api:moment:activate:${ipHash}`;
  
  return checkRateLimit(identifier, config.windowMs, config.maxRequests);
}

/**
 * Rate limit anonymous session creation
 */
export function limitAnonymousSession(ipHash: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIG.api.anonymousSession;
  const identifier = `api:session:anonymous:${ipHash}`;
  
  return checkRateLimit(identifier, config.windowMs, config.maxRequests);
}

// ============================================================================
// ABUSE DETECTION
// ============================================================================

interface AbuseCheckResult {
  isAbusive: boolean;
  reason?: string;
  blockDurationMs?: number;
}

/**
 * Check for abusive request patterns
 * @param ipHash - Hashed IP address (no PII)
 * @returns Abuse detection result
 */
export function checkAbusePatterns(ipHash: string): AbuseCheckResult {
  const now = Date.now();
  const identifier = `api:${ipHash}`;
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    return { isAbusive: false };
  }

  const abuse = RATE_LIMIT_CONFIG.abuse;

  // Check rapid requests (burst detection)
  const recentRequests = entry.violations.filter(
    v => now - v < abuse.rapidRequestsWindowMs
  ).length;
  
  if (recentRequests >= abuse.rapidRequestsThreshold) {
    // Apply extended block
    entry.blocked = true;
    entry.blockedUntil = now + abuse.rapidRequestsBlockMs;
    entry.abuseScore += 10;
    rateLimitStore.set(identifier, entry);
    
    return {
      isAbusive: true,
      reason: 'rapid_requests',
      blockDurationMs: abuse.rapidRequestsBlockMs,
    };
  }

  // Check burst pattern
  const burstRequests = entry.violations.filter(
    v => now - v < abuse.burstWindowMs
  ).length;
  
  if (burstRequests >= abuse.burstThreshold) {
    entry.blocked = true;
    entry.blockedUntil = now + abuse.burstBlockMs;
    entry.abuseScore += 5;
    rateLimitStore.set(identifier, entry);
    
    return {
      isAbusive: true,
      reason: 'burst_detected',
      blockDurationMs: abuse.burstBlockMs,
    };
  }

  // Check repeated violations
  const recentViolations = entry.violations.filter(
    v => now - v < abuse.violationWindowMs
  ).length;
  
  if (recentViolations >= abuse.violationThreshold) {
    entry.blocked = true;
    entry.blockedUntil = now + abuse.violationBlockMs;
    entry.abuseScore += 3;
    rateLimitStore.set(identifier, entry);
    
    return {
      isAbusive: true,
      reason: 'repeated_violations',
      blockDurationMs: abuse.violationBlockMs,
    };
  }

  // Check abuse score
  if (entry.abuseScore >= 20) {
    entry.blocked = true;
    entry.blockedUntil = now + abuse.violationBlockMs;
    rateLimitStore.set(identifier, entry);
    
    return {
      isAbusive: true,
      reason: 'high_abuse_score',
      blockDurationMs: abuse.violationBlockMs,
    };
  }

  return { isAbusive: false };
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
  maxRequests: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Apply rate limit to API route
 * Returns null if allowed, Response if blocked
 */
export function applyRateLimit(
  req: NextRequest,
  limiter: (ipHash: string) => RateLimitResult,
  maxRequests: number
): Response | null {
  const ip = getClientIp(req);
  const ipHash = hashIpAddress(ip);

  // Check for abuse patterns first
  const abuseCheck = checkAbusePatterns(ipHash);
  if (abuseCheck.isAbusive) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        code: 'ABUSE_DETECTED',
        reason: abuseCheck.reason,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((abuseCheck.blockDurationMs || 60000) / 1000).toString(),
        },
      }
    );
  }

  // Apply rate limit
  const result = limiter(ipHash);

  if (!result.allowed) {
    const headers = createRateLimitHeaders(result, maxRequests);
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    );
  }

  return null;
}

/**
 * Middleware wrapper for API routes with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  limiter: (ipHash: string) => RateLimitResult,
  maxRequests: number
) {
  return async (req: NextRequest): Promise<Response> => {
    const rateLimitResponse = applyRateLimit(req, limiter, maxRequests);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const response = await handler(req);
    
    // Add rate limit headers to successful response
    const ip = getClientIp(req);
    const ipHash = hashIpAddress(ip);
    const result = limiter(ipHash);
    const headers = createRateLimitHeaders(result, maxRequests);
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// ============================================================================
// MONITORING
// ============================================================================

/**
 * Get rate limiting statistics (no PII)
 */
export function getRateLimitStats(): {
  totalTracked: number;
  blockedCount: number;
  config: typeof RATE_LIMIT_CONFIG;
} {
  const stats = rateLimitStore.getStats();
  
  return {
    totalTracked: stats.totalEntries,
    blockedCount: stats.blockedEntries,
    config: RATE_LIMIT_CONFIG,
  };
}

/**
 * Reset rate limit for an IP hash (admin use)
 */
export function resetRateLimit(ipHash: string): void {
  rateLimitStore.delete(`api:${ipHash}`);
  rateLimitStore.delete(`ws:${ipHash}`);
  rateLimitStore.delete(`api:moment:create:${ipHash}`);
  rateLimitStore.delete(`api:moment:activate:${ipHash}`);
  rateLimitStore.delete(`api:session:anonymous:${ipHash}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  RATE_LIMIT_CONFIG,
  limitWebSocketConnection,
  limitApiRequest,
  limitMomentCreate,
  limitMomentActivate,
  limitAnonymousSession,
  checkAbusePatterns,
  checkWebSocketRateLimit,
  applyRateLimit,
  withRateLimit,
  createRateLimitHeaders,
  getRateLimitStats,
  resetRateLimit,
};
