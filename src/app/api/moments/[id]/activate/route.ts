/**
 * Moment Activation API Route
 * 
 * Demonstrates:
 * - Council-only activation
 * - Rate limiting
 * - Audit logging
 * - RBAC enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCouncil, getClientIp } from '@/middleware/auth';
import { limitMomentActivate, applyRateLimit } from '@/lib/rate-limit';
import { activateMomentSchema, formatValidationErrors } from '@/lib/validation';
import { logGovernanceAction, AuditActorRole } from '@/lib/audit';
import { Role } from '@/types/rbac';

// Rate limit configuration for this endpoint
const RATE_LIMIT_MAX = 10;

/**
 * POST /api/moments/[id]/activate
 * Activate a moment (Council only)
 * 
 * Security:
 * - Requires Council role
 * - Rate limited (10 per minute)
 * - Input validated
 * - Action audited
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Apply rate limiting
    const rateLimitResult = applyRateLimit(req, limitMomentActivate, RATE_LIMIT_MAX);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Step 2: Authenticate and require Council role
    const authResult = await requireCouncil(req);
    if (authResult) {
      return authResult;
    }

    // Get user from request
    const user = (req as unknown as Record<string, unknown>).user as {
      type: 'authenticated';
      userId: string;
      role: Role;
    };

    // Step 3: Validate moment ID from params
    const momentId = params.id;
    if (!momentId) {
      return NextResponse.json(
        { error: 'Moment ID is required' },
        { status: 400 }
      );
    }

    // Step 4: Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {}; // Empty body is allowed (immediate activation)
    }

    const validationResult = activateMomentSchema.safeParse({
      momentId,
      ...body,
    });

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

    // Step 5: Check if moment exists and is not already active
    // TODO: Implement with Prisma
    // const moment = await prisma.moment.findUnique({
    //   where: { id: validatedData.momentId },
    // });
    //
    // if (!moment) {
    //   return NextResponse.json(
    //     { error: 'Moment not found' },
    //     { status: 404 }
    //   );
    // }
    //
    // if (moment.isActive) {
    //   return NextResponse.json(
    //     { error: 'Moment is already active' },
    //     { status: 409 }
    //   );
    // }

    // Step 6: Activate moment
    const activateAt = validatedData.activateAt 
      ? new Date(validatedData.activateAt * 1000) 
      : new Date();

    // TODO: Implement with Prisma
    // const updatedMoment = await prisma.moment.update({
    //   where: { id: validatedData.momentId },
    //   data: {
    //     isActive: true,
    //     activatedAt: activateAt,
    //     activatedBy: user.userId,
    //   },
    // });

    const updatedMoment = {
      id: momentId,
      isActive: true,
      activatedAt: activateAt.toISOString(),
      activatedBy: user.userId,
    };

    // Step 7: Log governance action
    const clientIp = getClientIp(req);
    logGovernanceAction(
      'moment.activate',
      user.userId,
      AuditActorRole.COUNCIL,
      momentId,
      {
        activatedAt: activateAt.toISOString(),
        scheduled: !!validatedData.activateAt,
      },
      { ip: clientIp }
    );

    // Step 8: Return response
    return NextResponse.json({
      moment: updatedMoment,
      message: validatedData.activateAt 
        ? 'Moment scheduled for activation' 
        : 'Moment activated successfully',
    });

  } catch (error) {
    console.error('[API] Failed to activate moment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
