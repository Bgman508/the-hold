/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring and load balancers.
 * Returns service status and basic statistics.
 */

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Get basic stats
    const [liveMoment, totalSessions, totalPresences] = await Promise.all([
      prisma.moment.findFirst({
        where: { status: 'live' },
        select: { id: true, title: true },
      }),
      prisma.session.count(),
      prisma.presence.count(),
    ]);

    return NextResponse.json({
      status: 'healthy',
      service: 'the-hold-api',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV,
      database: 'connected',
      stats: {
        liveMoment: liveMoment ? { id: liveMoment.id, title: liveMoment.title } : null,
        totalSessions,
        totalPresences,
      },
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Health] Check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      service: 'the-hold-api',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
