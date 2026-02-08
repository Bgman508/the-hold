/**
 * POST /api/session/end
 * 
 * Ends an anonymous session and calculates total duration.
 * This should be called when a user leaves the moment.
 * 
 * Request Headers:
 *   Authorization: Bearer <session-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "session-id",
 *   "durationSeconds": 3600,
 *   "durationMinutes": 60
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { endSession, validateSessionToken } from '../../../../lib/session';
import { apiRateLimiter } from '../../../../lib/rate-limiter';
import { prisma } from '../../../../lib/prisma';

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_KEY_PREFIX = 'session_end:';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${clientIp}`;

    // Check rate limit
    const rateLimitCheck = apiRateLimiter.check(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitCheck.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter || 60),
          }
        }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing or invalid authorization header',
          message: 'Please provide a Bearer token in the Authorization header' 
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Validate token
    const payload = validateSessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired token',
          message: 'Please begin a new session' 
        },
        { status: 401 }
      );
    }

    // Clean up any remaining presences for this session
    // This handles cases where WebSocket disconnects without proper leave
    await prisma.presence.deleteMany({
      where: { sessionId: payload.sessionId },
    });

    // End the session
    const result = await endSession(payload.sessionId);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: payload.sessionId,
      momentId: payload.momentId,
      durationSeconds: result.durationSeconds,
      durationMinutes: result.durationSeconds ? Math.floor(result.durationSeconds / 60) : 0,
      message: 'Session ended successfully. Thank you for being present.',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[API] Error ending session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
