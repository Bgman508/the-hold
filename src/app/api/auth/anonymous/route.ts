/**
 * Anonymous Session API Route
 * 
 * Demonstrates:
 * - Anonymous session creation
 * - Rate limiting
 * - No PII collection
 * - JWT token generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAnonymousToken, getClientIp } from '@/middleware/auth';
import { limitAnonymousSession, applyRateLimit } from '@/lib/rate-limit';
import { createAnonymousSessionSchema, formatValidationErrors } from '@/lib/validation';
import { logAuthAction, AuditActorRole } from '@/lib/audit';

// Rate limit configuration for this endpoint
const RATE_LIMIT_MAX = 20;

/**
 * POST /api/auth/anonymous
 * Create an anonymous session
 * 
 * Security:
 * - Rate limited (20 per minute)
 * - No PII collected
 * - Short-lived tokens (4 hours)
 * - Session audited
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Apply rate limiting
    const rateLimitResult = applyRateLimit(req, limitAnonymousSession, RATE_LIMIT_MAX);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Step 2: Parse request body (optional)
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is allowed
    }

    // Step 3: Validate input
    const validationResult = createAnonymousSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationErrors(validationResult.error),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Step 4: Generate anonymous session
    const { token, session } = await generateAnonymousToken(
      validatedData.momentId || null
    );

    // Step 5: Log session creation (no PII)
    const clientIp = getClientIp(req);
    logAuthAction(
      'auth.session_created',
      session.sessionId,
      AuditActorRole.ANONYMOUS,
      {
        momentId: validatedData.momentId || null,
        expiresAt: session.expiresAt.toISOString(),
      },
      { ip: clientIp }
    );

    // Step 6: Return response with token
    const response = NextResponse.json({
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt.toISOString(),
      },
    });

    // Set session cookie (httpOnly, secure, sameSite)
    response.cookies.set('hold_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60, // 4 hours
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('[API] Failed to create anonymous session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
