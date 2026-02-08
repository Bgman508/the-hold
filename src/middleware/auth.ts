/**
 * Authentication & RBAC Middleware for THE HOLD
 * 
 * Security Features:
 * - JWT verification with secure algorithms only
 * - Role-based access control
 * - Anonymous session token generation/validation
 * - No PII storage or exposure
 * - Defense in depth with multiple validation layers
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { randomBytes, createHash } from 'crypto';
import {
  Role,
  Permission,
  User,
  AnonymousSession,
  AuthenticatedUser,
  JWTPayload,
  RBACError,
  RBACErrorCode,
  hasPermission,
  hasAnyPermission,
  hasRoleLevel,
  PERMISSION_MATRIX,
} from '@/types/rbac';

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Convert secret to Uint8Array for jose
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

// Token configuration
const TOKEN_CONFIG = {
  algorithm: 'HS256' as const, // Secure algorithm only
  issuer: 'the-hold',
  audience: 'the-hold-api',
};

// Session durations
const SESSION_DURATION = {
  anonymous: 4 * 60 * 60, // 4 hours for anonymous sessions
  authenticated: 24 * 60 * 60, // 24 hours for authenticated sessions
};

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure anonymous session ID
 * No link to any real identity
 */
export function generateAnonymousSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a secure session token for anonymous users
 * No PII stored - only session metadata
 */
export async function generateAnonymousToken(
  momentId: string | null = null
): Promise<{ token: string; session: AnonymousSession }> {
  const sessionId = generateAnonymousSessionId();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + SESSION_DURATION.anonymous) * 1000);

  const session: AnonymousSession = {
    type: 'anonymous',
    sessionId,
    momentId,
    enteredAt: new Date(),
    expiresAt,
  };

  const payload: JWTPayload = {
    sub: sessionId,
    role: Role.ANONYMOUS,
    permissions: PERMISSION_MATRIX[Role.ANONYMOUS],
    iat: now,
    exp: now + SESSION_DURATION.anonymous,
    type: 'anonymous',
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: TOKEN_CONFIG.algorithm })
    .setIssuer(TOKEN_CONFIG.issuer)
    .setAudience(TOKEN_CONFIG.audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET_BYTES);

  return { token, session };
}

/**
 * Generate an authenticated token for Council/Architect/Community
 * No PII in token - only role and permissions
 */
export async function generateAuthenticatedToken(
  userId: string,
  role: Role
): Promise<{ token: string; user: AuthenticatedUser }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + SESSION_DURATION.authenticated) * 1000);

  const user: AuthenticatedUser = {
    type: 'authenticated',
    userId,
    role,
    permissions: PERMISSION_MATRIX[role],
    sessionExpiresAt: expiresAt,
  };

  const payload: JWTPayload = {
    sub: userId,
    role,
    permissions: PERMISSION_MATRIX[role],
    iat: now,
    exp: now + SESSION_DURATION.authenticated,
    type: 'authenticated',
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: TOKEN_CONFIG.algorithm })
    .setIssuer(TOKEN_CONFIG.issuer)
    .setAudience(TOKEN_CONFIG.audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET_BYTES);

  return { token, user };
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify and decode a JWT token
 * @throws RBACError if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES, {
      issuer: TOKEN_CONFIG.issuer,
      audience: TOKEN_CONFIG.audience,
      algorithms: [TOKEN_CONFIG.algorithm],
    });

    // Validate payload structure
    if (!isValidJWTPayload(payload)) {
      throw new RBACError(
        RBACErrorCode.INVALID_TOKEN,
        'Invalid token payload structure'
      );
    }

    return payload as JWTPayload;
  } catch (error) {
    if (error instanceof RBACError) throw error;
    
    // Handle jose errors
    if (error instanceof Error) {
      if (error.message.includes('exp')) {
        throw new RBACError(
          RBACErrorCode.EXPIRED_TOKEN,
          'Token has expired'
        );
      }
      throw new RBACError(
        RBACErrorCode.INVALID_TOKEN,
        'Invalid token'
      );
    }
    
    throw error;
  }
}

/**
 * Type guard for JWT payload validation
 */
function isValidJWTPayload(payload: unknown): payload is JWTPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  
  const p = payload as Record<string, unknown>;
  
  return (
    typeof p.sub === 'string' &&
    typeof p.role === 'string' &&
    Object.values(Role).includes(p.role as Role) &&
    Array.isArray(p.permissions) &&
    p.permissions.every((perm: unknown) => 
      typeof perm === 'string' && Object.values(Permission).includes(perm as Permission)
    ) &&
    typeof p.iat === 'number' &&
    typeof p.exp === 'number' &&
    (p.type === 'anonymous' || p.type === 'authenticated')
  );
}

/**
 * Convert JWT payload to User object
 */
export function payloadToUser(payload: JWTPayload): User {
  if (payload.type === 'anonymous') {
    return {
      type: 'anonymous',
      sessionId: payload.sub,
      momentId: null,
      enteredAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
    };
  }

  return {
    type: 'authenticated',
    userId: payload.sub,
    role: payload.role,
    permissions: payload.permissions,
    sessionExpiresAt: new Date(payload.exp * 1000),
  };
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Extract token from request headers or cookies
 */
export function extractToken(req: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const tokenCookie = req.cookies.get('hold_session');
  if (tokenCookie?.value) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Middleware to authenticate requests
 * Attaches user to request context
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: User | null; error: RBACError | null }> {
  const token = extractToken(req);

  if (!token) {
    return {
      user: null,
      error: new RBACError(
        RBACErrorCode.UNAUTHORIZED,
        'No authentication token provided'
      ),
    };
  }

  try {
    const payload = await verifyToken(token);
    const user = payloadToUser(payload);
    return { user, error: null };
  } catch (error) {
    if (error instanceof RBACError) {
      return { user: null, error };
    }
    return {
      user: null,
      error: new RBACError(
        RBACErrorCode.UNAUTHORIZED,
        'Authentication failed'
      ),
    };
  }
}

/**
 * Middleware to require specific permission(s)
 */
export function requirePermission(...permissions: Permission[]) {
  return async (req: NextRequest) => {
    const { user, error } = await authenticateRequest(req);

    if (error || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: error?.code || RBACErrorCode.UNAUTHORIZED 
        },
        { status: 401 }
      );
    }

    if (!hasAnyPermission(user, permissions)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: RBACErrorCode.INSUFFICIENT_PERMISSIONS,
          required: permissions,
        },
        { status: 403 }
      );
    }

    // Attach user to request for downstream use
    (req as unknown as Record<string, unknown>).user = user;
    
    return null; // Continue to next middleware/handler
  };
}

/**
 * Middleware to require minimum role level
 */
export function requireRole(minRole: Role) {
  return async (req: NextRequest) => {
    const { user, error } = await authenticateRequest(req);

    if (error || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: error?.code || RBACErrorCode.UNAUTHORIZED 
        },
        { status: 401 }
      );
    }

    if (!hasRoleLevel(user, minRole)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: RBACErrorCode.ROLE_REQUIRED,
          requiredRole: minRole,
        },
        { status: 403 }
      );
    }

    (req as unknown as Record<string, unknown>).user = user;
    
    return null;
  };
}

/**
 * Middleware for Council-only endpoints
 */
export async function requireCouncil(req: NextRequest) {
  const { user, error } = await authenticateRequest(req);

  if (error || !user) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        code: error?.code || RBACErrorCode.UNAUTHORIZED 
      },
      { status: 401 }
    );
  }

  if (user.type !== 'authenticated' || user.role !== Role.COUNCIL) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        code: RBACErrorCode.INSUFFICIENT_PERMISSIONS,
        message: 'Council access required',
      },
      { status: 403 }
    );
  }

  (req as unknown as Record<string, unknown>).user = user;
  
  return null;
}

/**
 * Optional authentication - allows anonymous access
 * but attaches user if token is present
 */
export async function optionalAuth(
  req: NextRequest
): Promise<User | null> {
  const token = extractToken(req);
  
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token);
    return payloadToUser(payload);
  } catch {
    return null;
  }
}

// ============================================================================
// WEBSOCKET AUTHENTICATION
// ============================================================================

/**
 * Validate WebSocket connection token
 * Used for initial WebSocket handshake
 */
export async function validateWebSocketToken(
  token: string
): Promise<{ valid: boolean; user: User | null; error?: string }> {
  try {
    const payload = await verifyToken(token);
    const user = payloadToUser(payload);
    return { valid: true, user };
  } catch (error) {
    if (error instanceof RBACError) {
      return { valid: false, user: null, error: error.message };
    }
    return { valid: false, user: null, error: 'Invalid token' };
  }
}

/**
 * Generate a short-lived WebSocket connection token
 * Used for upgrading HTTP to WebSocket
 */
export async function generateWebSocketToken(
  user: User
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 60; // 1 minute for WebSocket handshake

  const payload: JWTPayload = {
    sub: user.type === 'anonymous' ? user.sessionId : user.userId,
    role: user.type === 'anonymous' ? Role.ANONYMOUS : user.role,
    permissions: user.type === 'anonymous' 
      ? PERMISSION_MATRIX[Role.ANONYMOUS] 
      : user.permissions,
    iat: now,
    exp: now + expiresIn,
    type: user.type,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: TOKEN_CONFIG.algorithm })
    .setIssuer(TOKEN_CONFIG.issuer)
    .setAudience('the-hold-ws')
    .setIssuedAt()
    .setExpirationTime(now + expiresIn)
    .sign(JWT_SECRET_BYTES);
}

// ============================================================================
// IP HASHING (for rate limiting, no PII)
// ============================================================================

/**
 * Hash IP address for rate limiting
 * One-way hash - cannot be reversed to get original IP
 */
export function hashIpAddress(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'the-hold-default-salt';
  return createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Get client IP from request
 */
export function getClientIp(req: NextRequest): string {
  // Check for forwarded IP (behind proxy)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Check for real IP header
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback (may not be accurate in all deployments)
  return 'unknown';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateAnonymousToken,
  generateAuthenticatedToken,
  generateWebSocketToken,
  verifyToken,
  payloadToUser,
  authenticateRequest,
  optionalAuth,
  requirePermission,
  requireRole,
  requireCouncil,
  validateWebSocketToken,
  hashIpAddress,
  getClientIp,
};
