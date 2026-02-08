/**
 * Moments API Route
 * 
 * Demonstrates:
 * - Council-only access for moment creation
 * - Rate limiting
 * - Input validation
 * - Audit logging
 * - RBAC enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCouncil, getClientIp } from '@/middleware/auth';
import { limitMomentCreate, applyRateLimit } from '@/lib/rate-limit';
import { createMomentSchema, validate, formatValidationErrors, ValidationError } from '@/lib/validation';
import { logGovernanceAction, AuditActorRole } from '@/lib/audit';
import { Role } from '@/types/rbac';

// Rate limit configuration for this endpoint
const RATE_LIMIT_MAX = 5;

/**
 * GET /api/moments
 * List all moments (public access)
 */
export async function GET(req: NextRequest) {
  try {
    // Apply general API rate limiting
    const rateLimitResult = applyRateLimit(req, limitMomentCreate, RATE_LIMIT_MAX);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // TODO: Implement with Prisma
    // const moments = await prisma.moment.findMany({
    //   where: { isPublic: true },
    //   orderBy: { createdAt: 'desc' },
    // });

    const moments = []; // Placeholder

    return NextResponse.json({ moments });
  } catch (error) {
    console.error('[API] Failed to list moments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/moments
 * Create a new moment (Council only)
 * 
 * Security:
 * - Requires Council role
 * - Rate limited (5 per minute)
 * - Input validated
 * - Action audited
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Apply rate limiting
    const rateLimitResult = applyRateLimit(req, limitMomentCreate, RATE_LIMIT_MAX);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Step 2: Authenticate and require Council role
    const authResult = await requireCouncil(req);
    if (authResult) {
      return authResult; // Returns 401 or 403 response
    }

    // Get user from request (attached by requireCouncil)
    const user = (req as unknown as Record<string, unknown>).user as {
      type: 'authenticated';
      userId: string;
      role: Role;
    };

    // Step 3: Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validationResult = createMomentSchema.safeParse(body);
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

    // Step 4: Create moment (TODO: Implement with Prisma)
    // const moment = await prisma.moment.create({
    //   data: {
    //     title: validatedData.title,
    //     description: validatedData.description,
    //     slug: validatedData.slug,
    //     maxParticipants: validatedData.maxParticipants,
    //     duration: validatedData.duration,
    //     isPublic: validatedData.isPublic,
    //     metadata: validatedData.metadata,
    //     isActive: false, // Must be activated separately
    //   },
    // });

    const moment = {
      id: 'placeholder-id',
      ...validatedData,
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    // Step 5: Log governance action
    const clientIp = getClientIp(req);
    logGovernanceAction(
      'moment.create',
      user.userId,
      AuditActorRole.COUNCIL,
      moment.id,
      {
        title: validatedData.title,
        slug: validatedData.slug,
        maxParticipants: validatedData.maxParticipants,
      },
      { ip: clientIp }
    );

    // Step 6: Return response
    return NextResponse.json(
      { moment },
      { status: 201 }
    );

  } catch (error) {
    console.error('[API] Failed to create moment:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
