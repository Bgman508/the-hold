/**
 * POST /api/session/begin
 * 
 * Begins a new anonymous session for a live moment.
 * Returns a JWT token that must be used for WebSocket authentication.
 * 
 * Request Body:
 * {
 *   "momentId": string  // Optional - defaults to current live moment
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "token": "jwt-token-string",
 *   "sessionId": "session-id",
 *   "expiresAt": "2024-01-01T00:00:00Z"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { createAnonymousSession, hashIpAddress } from '../../../../lib/session';
import { apiRateLimiter } from '../../../../lib/rate-limiter';

// Rate limit: 5 sessions per minute per IP
const RATE_LIMIT_KEY_PREFIX = 'session_begin:';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and abuse detection
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${clientIp}`;

    // Parse request body
    let body: { momentId?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // If no momentId provided, get the current live moment
    let momentId = body.momentId;
    if (!momentId) {
      const liveMoment = await prisma.moment.findFirst({
        where: { status: 'live' },
        select: { id: true },
      });

      if (!liveMoment) {
        return NextResponse.json(
          { 
            success: false,
            error: 'No live moment found',
            message: 'There is no active moment at this time.' 
          },
          { status: 404 }
        );
      }

      momentId = liveMoment.id;
    }

    // Get user agent (for analytics only)
    const userAgent = request.headers.get('user-agent') || undefined;

    // Create anonymous session
    const result = await createAnonymousSession(
      {
        momentId,
        userAgent,
        ipAddress: clientIp !== 'unknown' ? clientIp : undefined,
      },
      rateLimitKey
    );

    if (!result.success) {
      const statusCode = result.retryAfter ? 429 : 400;
      return NextResponse.json(
        { 
          success: false,
          error: result.error,
          retryAfter: result.retryAfter 
        },
        { 
          status: statusCode,
          headers: result.retryAfter ? {
            'Retry-After': String(result.retryAfter),
          } : {}
        }
      );
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      token: result.token,
      sessionId: result.sessionId,
      momentId,
      expiresAt: expiresAt.toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[API] Error beginning session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
