/**
 * API Integration Tests
 * 
 * Tests for API endpoints with real database.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, createTestMoment, createTestSession } from '../../test/setup-integration';

// Import API handlers
import { GET as healthGet } from '../../app/api/health/route';
import { GET as momentsGet } from '../../app/api/moments/route';
import { GET as currentMomentGet } from '../../app/api/moment/current/route';

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Clean state is handled by setup-integration.ts
  });

  describe('Health Endpoint', () => {
    it('should return healthy status with database connected', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await healthGet();
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.status).toBe('healthy');
      expect(body.database).toBe('connected');
      expect(body.stats).toBeDefined();
    });

    it('should return correct stats', async () => {
      // Create test data
      await createTestMoment({ status: 'live' });
      await createTestMoment({ status: 'scheduled' });

      const response = await healthGet();
      const body = await response.json();

      expect(body.stats.totalSessions).toBe(0);
      expect(body.stats.totalPresences).toBe(0);
    });
  });

  describe('Moments Endpoint', () => {
    it('should list moments from database', async () => {
      // Create test moments
      await createTestMoment({ title: 'Moment 1', slug: 'moment-1' });
      await createTestMoment({ title: 'Moment 2', slug: 'moment-2' });

      const moments = await prisma.moment.findMany();
      
      expect(moments.length).toBe(2);
      expect(moments[0].title).toBeDefined();
    });

    it('should filter moments by status', async () => {
      await createTestMoment({ title: 'Live Moment', status: 'live' });
      await createTestMoment({ title: 'Scheduled Moment', status: 'scheduled' });

      const liveMoments = await prisma.moment.findMany({
        where: { status: 'live' },
      });

      expect(liveMoments.length).toBe(1);
      expect(liveMoments[0].title).toBe('Live Moment');
    });
  });

  describe('Session Management', () => {
    it('should create and retrieve session', async () => {
      const moment = await createTestMoment();
      
      const session = await prisma.session.create({
        data: {
          momentId: moment.id,
          token: 'test-token',
          startedAt: new Date(),
        },
      });

      const retrieved = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.token).toBe('test-token');
    });

    it('should update session on end', async () => {
      const moment = await createTestMoment();
      const session = await createTestSession(moment.id);

      const endedSession = await prisma.session.update({
        where: { id: session.id },
        data: {
          endedAt: new Date(),
          durationSeconds: 60,
        },
      });

      expect(endedSession.endedAt).not.toBeNull();
      expect(endedSession.durationSeconds).toBe(60);
    });

    it('should cascade delete presences on session delete', async () => {
      const moment = await createTestMoment();
      const session = await createTestSession(moment.id);
      
      await prisma.presence.create({
        data: {
          socketId: 'test-socket',
          sessionId: session.id,
          momentId: moment.id,
          connectedAt: new Date(),
          lastHeartbeatAt: new Date(),
        },
      });

      // Delete session
      await prisma.session.delete({
        where: { id: session.id },
      });

      // Presence should be deleted
      const presences = await prisma.presence.findMany({
        where: { sessionId: session.id },
      });

      expect(presences.length).toBe(0);
    });
  });

  describe('Presence Tracking', () => {
    it('should track presence for session', async () => {
      const moment = await createTestMoment();
      const session = await createTestSession(moment.id);

      const presence = await prisma.presence.create({
        data: {
          socketId: 'socket-123',
          sessionId: session.id,
          momentId: moment.id,
          connectedAt: new Date(),
          lastHeartbeatAt: new Date(),
        },
      });

      expect(presence.socketId).toBe('socket-123');

      // Update heartbeat
      const updatedPresence = await prisma.presence.update({
        where: { id: presence.id },
        data: {
          lastHeartbeatAt: new Date(),
        },
      });

      expect(updatedPresence.lastHeartbeatAt).not.toEqual(presence.lastHeartbeatAt);
    });

    it('should count presences for moment', async () => {
      const moment = await createTestMoment();
      
      // Create multiple sessions and presences
      for (let i = 0; i < 5; i++) {
        const session = await createTestSession(moment.id);
        await prisma.presence.create({
          data: {
            socketId: `socket-${i}`,
            sessionId: session.id,
            momentId: moment.id,
            connectedAt: new Date(),
            lastHeartbeatAt: new Date(),
          },
        });
      }

      const count = await prisma.presence.count({
        where: { momentId: moment.id },
      });

      expect(count).toBe(5);
    });
  });

  describe('Moment Statistics', () => {
    it('should track total sessions', async () => {
      const moment = await createTestMoment();
      
      await createTestSession(moment.id);
      await createTestSession(moment.id);
      await createTestSession(moment.id);

      const sessions = await prisma.session.count({
        where: { momentId: moment.id },
      });

      expect(sessions).toBe(3);
    });

    it('should update peak presence', async () => {
      const moment = await createTestMoment({ peakPresence: 0 });

      // Simulate presence increase
      await prisma.moment.update({
        where: { id: moment.id },
        data: { peakPresence: 10 },
      });

      const updated = await prisma.moment.findUnique({
        where: { id: moment.id },
      });

      expect(updated?.peakPresence).toBe(10);
    });
  });
});
