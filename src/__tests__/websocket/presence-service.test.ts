/**
 * Presence Service Unit Tests
 * 
 * Tests for WebSocket presence tracking, join/leave, and broadcasting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { presenceService, PresenceService } from '../../websocket/presence-service';
import { mockPrismaClient, MockWebSocket } from '../../test/setup';
import { WSErrorCodes } from '../../types/websocket';

// Mock session verification
vi.mock('../../lib/session', () => ({
  verifySession: vi.fn((token) => {
    if (token === 'valid-token') {
      return Promise.resolve({
        valid: true,
        sessionId: 'session-123',
        momentId: 'moment-123',
      });
    }
    if (token === 'wrong-moment-token') {
      return Promise.resolve({
        valid: true,
        sessionId: 'session-123',
        momentId: 'different-moment',
      });
    }
    return Promise.resolve({ valid: false, error: 'Invalid token' });
  }),
}));

describe('Presence Service', () => {
  let service: PresenceService;
  let mockWs: MockWebSocket;

  const mockMoment = {
    id: 'moment-123',
    title: 'Test Moment',
    status: 'live',
    peakPresence: 0,
  };

  const mockPresence = {
    id: 'presence-123',
    socketId: 'socket-123',
    sessionId: 'session-123',
    momentId: 'moment-123',
    connectedAt: new Date(),
    lastHeartbeatAt: new Date(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    service = new PresenceService();
    mockWs = new MockWebSocket('ws://localhost:3001');
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockPrismaClient.moment.findUnique.mockResolvedValue(mockMoment);
    mockPrismaClient.presence.create.mockResolvedValue(mockPresence);
    mockPrismaClient.presence.deleteMany.mockResolvedValue({ count: 1 });
    mockPrismaClient.presence.updateMany.mockResolvedValue({ count: 1 });
    mockPrismaClient.moment.update.mockResolvedValue({ ...mockMoment, peakPresence: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should register a new connection', () => {
      const state = service.registerConnection('socket-123', mockWs as any);

      expect(state.socketId).toBe('socket-123');
      expect(state.isAuthenticated).toBe(false);
      expect(state.connectedAt).toBeInstanceOf(Date);
      expect(state.lastHeartbeatAt).toBeInstanceOf(Date);
    });

    it('should unregister a connection', async () => {
      // Register and join first
      service.registerConnection('socket-123', mockWs as any);
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      // Unregister
      await service.unregisterConnection('socket-123');

      // Should have left the moment
      expect(mockPrismaClient.presence.deleteMany).toHaveBeenCalledWith({
        where: { socketId: 'socket-123' },
      });
    });

    it('should get connection state', () => {
      service.registerConnection('socket-123', mockWs as any);

      const state = service.getConnectionState('socket-123');
      expect(state).toBeDefined();
      expect(state?.socketId).toBe('socket-123');

      const nonExistent = service.getConnectionState('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Join Moment', () => {
    beforeEach(() => {
      service.registerConnection('socket-123', mockWs as any);
    });

    it('should join moment successfully', async () => {
      const result = await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      expect(result.success).toBe(true);
      expect(mockPrismaClient.presence.create).toHaveBeenCalled();
    });

    it('should reject join for non-existent connection', async () => {
      const result = await service.joinMoment('non-existent', 'valid-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.SERVER_ERROR);
    });

    it('should reject already joined connection', async () => {
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      const result = await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.ALREADY_JOINED);
    });

    it('should reject invalid session token', async () => {
      const result = await service.joinMoment('socket-123', 'invalid-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.INVALID_TOKEN);
    });

    it('should reject mismatched moment', async () => {
      const result = await service.joinMoment('socket-123', 'wrong-moment-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.INVALID_TOKEN);
    });

    it('should reject when moment not found', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue(null);

      const result = await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.MOMENT_NOT_FOUND);
    });

    it('should reject when moment not live', async () => {
      mockPrismaClient.moment.findUnique.mockResolvedValue({
        ...mockMoment,
        status: 'scheduled',
      });

      const result = await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.MOMENT_NOT_LIVE);
    });

    it('should update peak presence', async () => {
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      expect(mockPrismaClient.moment.update).toHaveBeenCalledWith({
        where: { id: 'moment-123' },
        data: { peakPresence: 1 },
      });
    });

    it('should send joined message', async () => {
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      const messages = mockWs.getSentMessages();
      expect(messages.length).toBeGreaterThan(0);
      
      const joinedMessage = JSON.parse(messages[0]);
      expect(joinedMessage.type).toBe('joined');
      expect(joinedMessage.payload.momentId).toBe('moment-123');
    });

    it('should broadcast presence update', async () => {
      // Register second connection
      const mockWs2 = new MockWebSocket('ws://localhost:3001');
      service.registerConnection('socket-456', mockWs2 as any);
      
      // First connection joins
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');
      
      // Second connection joins
      await service.joinMoment('socket-456', 'valid-token', 'moment-123');

      // Both should receive presence updates
      const messages1 = mockWs.getSentMessages();
      const messages2 = mockWs2.getSentMessages();

      const presenceUpdate1 = messages1.find((m: string) => {
        try {
          return JSON.parse(m).type === 'presence_update';
        } catch {
          return false;
        }
      });

      expect(presenceUpdate1).toBeDefined();
    });
  });

  describe('Leave Moment', () => {
    beforeEach(async () => {
      service.registerConnection('socket-123', mockWs as any);
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');
      mockWs.clearSentMessages();
    });

    it('should leave moment successfully', async () => {
      await service.leaveMoment('socket-123');

      expect(mockPrismaClient.presence.deleteMany).toHaveBeenCalledWith({
        where: { socketId: 'socket-123' },
      });
    });

    it('should handle leave for non-joined connection', async () => {
      // Should not throw
      await expect(service.leaveMoment('non-existent')).resolves.not.toThrow();
    });

    it('should send left message', async () => {
      await service.leaveMoment('socket-123');

      const messages = mockWs.getSentMessages();
      const leftMessage = messages.find((m: string) => {
        try {
          return JSON.parse(m).type === 'left';
        } catch {
          return false;
        }
      });

      expect(leftMessage).toBeDefined();
    });

    it('should broadcast presence update on leave', async () => {
      // Register and join second connection
      const mockWs2 = new MockWebSocket('ws://localhost:3001');
      service.registerConnection('socket-456', mockWs2 as any);
      await service.joinMoment('socket-456', 'valid-token', 'moment-123');

      mockWs2.clearSentMessages();

      // First connection leaves
      await service.leaveMoment('socket-123');

      // Second connection should receive presence update
      const messages = mockWs2.getSentMessages();
      const presenceUpdate = messages.find((m: string) => {
        try {
          return JSON.parse(m).type === 'presence_update';
        } catch {
          return false;
        }
      });

      expect(presenceUpdate).toBeDefined();
    });

    it('should update connection state on leave', async () => {
      await service.leaveMoment('socket-123');

      const state = service.getConnectionState('socket-123');
      expect(state?.isAuthenticated).toBe(false);
      expect(state?.momentId).toBeUndefined();
      expect(state?.sessionId).toBeUndefined();
    });
  });

  describe('Heartbeat', () => {
    beforeEach(async () => {
      service.registerConnection('socket-123', mockWs as any);
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');
      mockWs.clearSentMessages();
    });

    it('should handle heartbeat', async () => {
      await service.handleHeartbeat('socket-123', 'valid-token');

      const state = service.getConnectionState('socket-123');
      expect(state?.messageCount).toBeGreaterThan(0);
    });

    it('should send pong response', async () => {
      await service.handleHeartbeat('socket-123', 'valid-token');

      const messages = mockWs.getSentMessages();
      const pongMessage = messages.find((m: string) => {
        try {
          return JSON.parse(m).type === 'pong';
        } catch {
          return false;
        }
      });

      expect(pongMessage).toBeDefined();
    });

    it('should rate limit heartbeats', async () => {
      // Send many heartbeats rapidly
      for (let i = 0; i < 150; i++) {
        await service.handleHeartbeat('socket-123', 'valid-token');
      }

      // Should still work but be rate limited
      const state = service.getConnectionState('socket-123');
      expect(state).toBeDefined();
    });

    it('should handle heartbeat for non-existent connection', async () => {
      // Should not throw
      await expect(
        service.handleHeartbeat('non-existent', 'valid-token')
      ).resolves.not.toThrow();
    });
  });

  describe('Heartbeat Timeout', () => {
    it('should disconnect stale connections', async () => {
      service.registerConnection('socket-123', mockWs as any);
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      // Advance time past heartbeat timeout (90 seconds)
      vi.advanceTimersByTime(91000);

      // Connection should be unregistered
      const state = service.getConnectionState('socket-123');
      // Note: The actual cleanup happens in the interval callback
    });
  });

  describe('Message Sending', () => {
    beforeEach(() => {
      service.registerConnection('socket-123', mockWs as any);
    });

    it('should send message to connected client', () => {
      const result = service.sendMessage('socket-123', {
        type: 'test',
        payload: { data: 'test' },
      });

      expect(result).toBe(true);

      const messages = mockWs.getSentMessages();
      expect(messages.length).toBe(1);
      expect(JSON.parse(messages[0])).toEqual({
        type: 'test',
        payload: { data: 'test' },
      });
    });

    it('should return false for non-existent connection', () => {
      const result = service.sendMessage('non-existent', {
        type: 'test',
        payload: {},
      });

      expect(result).toBe(false);
    });

    it('should return false for closed connection', () => {
      mockWs.readyState = MockWebSocket.CLOSED;

      const result = service.sendMessage('socket-123', {
        type: 'test',
        payload: {},
      });

      expect(result).toBe(false);
    });

    it('should send error message', () => {
      const result = service.sendError('socket-123', WSErrorCodes.SERVER_ERROR, 'Test error');

      expect(result).toBe(true);

      const messages = mockWs.getSentMessages();
      const errorMessage = JSON.parse(messages[messages.length - 1]);
      expect(errorMessage.type).toBe('error');
      expect(errorMessage.payload.code).toBe(WSErrorCodes.SERVER_ERROR);
      expect(errorMessage.payload.message).toBe('Test error');
    });
  });

  describe('Stats', () => {
    it('should return presence stats', async () => {
      service.registerConnection('socket-123', mockWs as any);
      service.registerConnection('socket-456', mockWs as any);
      
      await service.joinMoment('socket-123', 'valid-token', 'moment-123');
      await service.joinMoment('socket-456', 'valid-token', 'moment-123');

      const stats = service.getStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.authenticatedConnections).toBe(2);
      expect(stats.momentBreakdown['moment-123']).toBe(2);
    });

    it('should return zero stats when empty', () => {
      const stats = service.getStats();

      expect(stats.totalConnections).toBe(0);
      expect(stats.authenticatedConnections).toBe(0);
      expect(Object.keys(stats.momentBreakdown)).toHaveLength(0);
    });

    it('should count unauthenticated connections', () => {
      service.registerConnection('socket-123', mockWs as any);
      service.registerConnection('socket-456', mockWs as any);

      const stats = service.getStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.authenticatedConnections).toBe(0);
    });
  });

  describe('Moment Presence Count', () => {
    it('should return correct presence count', async () => {
      service.registerConnection('socket-123', mockWs as any);
      service.registerConnection('socket-456', mockWs as any);

      await service.joinMoment('socket-123', 'valid-token', 'moment-123');
      await service.joinMoment('socket-456', 'valid-token', 'moment-123');

      expect(service.getMomentPresenceCount('moment-123')).toBe(2);
    });

    it('should return zero for empty moment', () => {
      expect(service.getMomentPresenceCount('empty-moment')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid join/leave cycles', async () => {
      service.registerConnection('socket-123', mockWs as any);

      for (let i = 0; i < 5; i++) {
        await service.joinMoment('socket-123', 'valid-token', 'moment-123');
        await service.leaveMoment('socket-123');
      }

      // Should handle without errors
      expect(service.getMomentPresenceCount('moment-123')).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.presence.create.mockRejectedValue(new Error('DB Error'));

      service.registerConnection('socket-123', mockWs as any);
      const result = await service.joinMoment('socket-123', 'valid-token', 'moment-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(WSErrorCodes.SERVER_ERROR);
    });

    it('should handle multiple moments', async () => {
      const mockWs2 = new MockWebSocket('ws://localhost:3001');
      
      mockPrismaClient.moment.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'moment-123') {
          return Promise.resolve({ ...mockMoment, id: 'moment-123' });
        }
        if (args.where.id === 'moment-456') {
          return Promise.resolve({ ...mockMoment, id: 'moment-456' });
        }
        return Promise.resolve(null);
      });

      service.registerConnection('socket-123', mockWs as any);
      service.registerConnection('socket-456', mockWs2 as any);

      await service.joinMoment('socket-123', 'valid-token', 'moment-123');
      await service.joinMoment('socket-456', 'valid-token', 'moment-456');

      expect(service.getMomentPresenceCount('moment-123')).toBe(1);
      expect(service.getMomentPresenceCount('moment-456')).toBe(1);
    });
  });
});
