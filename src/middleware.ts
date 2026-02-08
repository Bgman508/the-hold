/**
 * Next.js Middleware Configuration
 * 
 * Global middleware for THE HOLD
 * Handles authentication, rate limiting, and security headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateRequest } from '@/middleware/auth';
import { applyRateLimit, limitApiRequest } from '@/lib/rate-limit';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/_next/',
  '/api/auth/anonymous',
  '/api/moments', // GET only - list moments
];

// Paths that are always public (static assets)
const STATIC_PATHS = [
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Check if path is public (no auth required)
 */
function isPublicPath(pathname: string, method: string): boolean {
  // Static assets are always public
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return true;
  }

  // Check explicit public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  // GET /api/moments is public
  if (pathname === '/api/moments' && method === 'GET') {
    return true;
  }

  return false;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip middleware for public paths
  if (isPublicPath(pathname, method)) {
    return NextResponse.next();
  }

  // Apply rate limiting to all API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = applyRateLimit(request, limitApiRequest, 60);
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  // Authenticate request (optional for most routes)
  const { user, error } = await authenticateRequest(request);

  // Attach user info to headers for downstream use
  const requestHeaders = new Headers(request.headers);
  
  if (user) {
    requestHeaders.set('x-user-id', user.type === 'anonymous' ? user.sessionId : user.userId);
    requestHeaders.set('x-user-type', user.type);
    if (user.type === 'authenticated') {
      requestHeaders.set('x-user-role', user.role);
    }
  }

  // Continue to route handler
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    // Apply to all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
