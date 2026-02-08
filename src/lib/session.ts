/**
 * Session Management for THE HOLD
 * 
 * Handles anonymous session creation, validation, and JWT token management.
 * No PII is stored - only hashed IPs for abuse detection.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from './prisma';
import { RateLimiter } from './rate-limiter';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h'; // Sessions expire after 24 hours

// Session rate limiting
const sessionCreationLimiter = new RateLimiter({
  maxRequests: 5,       // 5 sessions
  windowMs: 60000,      // per minute
  blockDurationMs: 300000, // Block for 5 minutes
});

// ============================================
// Types
// ============================================

export interface SessionTokenPayload {
  sessionId: string;
  momentId: string;
  iat: number;
  exp: number;
}

export interface CreateSessionInput {
  momentId: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionResult {
  success: boolean;
  token?: string;
  sessionId?: string;
  error?: string;
  retryAfter?: number;
}

// ============================================
// IP Hashing (for abuse detection, no PII)
// ============================================

/**
 * Hash IP address for privacy-preserving abuse detection
 */
export function hashIpAddress(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || 'default-secret-change-in-production';
  return crypto
    .createHmac('sha256', secret)
    .update(ip)
    .digest('hex');
}

// ============================================
// Session Creation
// ============================================

/**
 * Create a new anonymous session
 */
export async function createAnonymousSession(
  input: CreateSessionInput,
  rateLimitKey: string
): Promise<SessionResult> {
  // Check rate limit
  const rateLimitCheck = sessionCreationLimiter.check(rateLimitKey);
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: rateLimitCheck.retryAfter,
    };
  }

  try {
    // Verify moment exists and is live
    const moment = await prisma.moment.findUnique({
      where: { id: input.momentId },
    });

    if (!moment) {
      return {
        success: false,
        error: 'Moment not found',
      };
    }

    if (moment.status !== 'live') {
      return {
        success: false,
        error: 'Moment is not currently live',
      };
    }

    // Hash IP if provided
    const ipHash = input.ipAddress ? hashIpAddress(input.ipAddress) : null;

    // Create session in database
    const session = await prisma.session.create({
      data: {
        momentId: input.momentId,
        token: '', // Will be updated after JWT creation
        userAgent: input.userAgent?.slice(0, 500) || null, // Limit length
        ipHash,
        startedAt: new Date(),
        durationSeconds: 0,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        sessionId: session.id,
        momentId: input.momentId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update session with token
    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    // Increment moment session count
    await prisma.moment.update({
      where: { id: input.momentId },
      data: { totalSessions: { increment: 1 } },
    });

    return {
      success: true,
      token,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Session creation error:', error);
    return {
      success: false,
      error: 'Failed to create session',
    };
  }
}

// ============================================
// Session Validation
// ============================================

/**
 * Validate and decode a session token
 */
export function validateSessionToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return null;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return null;
    }
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Get session from database
 */
export async function getSession(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: { moment: true },
  });
}

/**
 * Verify session is valid and active
 */
export async function verifySession(token: string): Promise<{
  valid: boolean;
  sessionId?: string;
  momentId?: string;
  error?: string;
}> {
  const payload = validateSessionToken(token);
  
  if (!payload) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  const session = await getSession(payload.sessionId);

  if (!session) {
    return { valid: false, error: 'Session not found' };
  }

  if (session.endedAt) {
    return { valid: false, error: 'Session has ended' };
  }

  return {
    valid: true,
    sessionId: payload.sessionId,
    momentId: payload.momentId,
  };
}

// ============================================
// Session Ending
// ============================================

/**
 * End a session and calculate duration
 */
export async function endSession(sessionId: string): Promise<{
  success: boolean;
  durationSeconds?: number;
  error?: string;
}> {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { presences: true },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.endedAt) {
      return { success: false, error: 'Session already ended' };
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    // Update session
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        endedAt,
        durationSeconds,
      },
    });

    // Clean up any remaining presences
    if (session.presences.length > 0) {
      await prisma.presence.deleteMany({
        where: { sessionId },
      });
    }

    // Update moment aggregated metrics
    const durationMinutes = Math.floor(durationSeconds / 60);
    if (durationMinutes > 0) {
      await prisma.moment.update({
        where: { id: session.momentId },
        data: {
          totalMinutesPresent: { increment: durationMinutes },
        },
      });
    }

    return {
      success: true,
      durationSeconds,
    };
  } catch (error) {
    console.error('Session end error:', error);
    return {
      success: false,
      error: 'Failed to end session',
    };
  }
}

// ============================================
// Session Cleanup
// ============================================

/**
 * Clean up stale sessions (called periodically)
 */
export async function cleanupStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  try {
    // Find sessions that have been inactive for 24 hours
    const staleSessions = await prisma.session.findMany({
      where: {
        endedAt: null,
        presences: {
          every: {
            lastHeartbeatAt: {
              lt: cutoff,
            },
          },
        },
      },
      select: { id: true },
    });

    // End each stale session
    for (const session of staleSessions) {
      await endSession(session.id);
    }

    return staleSessions.length;
  } catch (error) {
    console.error('Cleanup error:', error);
    return 0;
  }
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    cleanupStaleSessions().then((count) => {
      if (count > 0) {
        console.log(`Cleaned up ${count} stale sessions`);
      }
    });
  }, 300000);
}
