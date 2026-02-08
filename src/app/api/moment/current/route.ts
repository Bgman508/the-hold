/**
 * GET /api/moment/current
 * 
 * Returns the currently live moment with presence count.
 * No authentication required - public endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { presenceService } from '../../../../websocket/presence-service';
import { apiRateLimiter } from '../../../../lib/rate-limiter';

// Rate limit: 30 requests per minute per IP
const RATE_LIMIT_KEY_PREFIX = 'moment_current:';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${clientIp}`;
    
    const rateLimitCheck = apiRateLimiter.check(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
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

    // Find the currently live moment
    const moment = await prisma.moment.findFirst({
      where: { status: 'live' },
      include: {
        architect: {
          select: {
            id: true,
            name: true,
            bio: true,
            isAnonymous: true,
          },
        },
        theHold: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!moment) {
      return NextResponse.json(
        { 
          error: 'No live moment found',
          message: 'There is no active moment at this time. Please check back later.' 
        },
        { status: 404 }
      );
    }

    // Get real-time presence count from WebSocket service
    // Note: In production, this might be fetched from Redis or shared state
    const livePresenceCount = presenceService.getMomentPresenceCount(moment.id);

    // Return moment data (excluding internal fields)
    const response = {
      id: moment.id,
      title: moment.title,
      description: moment.description,
      status: moment.status,
      startedAt: moment.startedAt,
      architect: moment.architect.isAnonymous 
        ? {
            id: moment.architect.id,
            name: 'Anonymous',
            isAnonymous: true,
          }
        : {
            id: moment.architect.id,
            name: moment.architect.name,
            bio: moment.architect.bio,
            isAnonymous: false,
          },
      theHold: moment.theHold,
      metrics: {
        totalSessions: moment.totalSessions,
        totalMinutesPresent: moment.totalMinutesPresent,
        peakPresence: moment.peakPresence,
        livePresenceCount,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching current moment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
