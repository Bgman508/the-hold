/**
 * Presence Service for THE HOLD
 * 
 * Manages real-time presence tracking via WebSocket connections.
 * Handles join/leave/heartbeat operations and broadcasts presence updates.
 */

import { prisma } from '../lib/prisma';
import { verifySession } from '../lib/session';
import { wsRateLimiter, heartbeatRateLimiter } from '../lib/rate-limiter';
import type { WebSocket } from 'ws';
import type {
  WSConnectionState,
  PresenceData,
  WSServerMessage,
  WSErrorCode,
} from '../types/websocket';
import { WSErrorCodes } from '../types/websocket';

// ============================================
// Configuration
// ============================================

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 90000;  // 90 seconds (3 missed heartbeats)

// ============================================
// Presence Service Class
// ============================================

class PresenceService {
  // Map of socketId -> WebSocket connection
  private connections: Map<string, WebSocket> = new Map();
  
  // Map of socketId -> Connection state
  private connectionStates: Map<string, WSConnectionState> = new Map();
  
  // Map of socketId -> Presence data (only when joined)
  private presences: Map<string, PresenceData> = new Map();
  
  // Map of momentId -> Set of socketIds
  private momentPresences: Map<string, Set<string>> = new Map();

  constructor() {
    // Start heartbeat checker
    setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL);
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Register a new WebSocket connection
   */
  registerConnection(socketId: string, ws: WebSocket): WSConnectionState {
    const state: WSConnectionState = {
      socketId,
      connectedAt: new Date(),
      lastHeartbeatAt: new Date(),
      messageCount: 0,
      lastMessageAt: new Date(),
      isAuthenticated: false,
    };

    this.connections.set(socketId, ws);
    this.connectionStates.set(socketId, state);

    console.log(`[WS] Connection registered: ${socketId}`);
    return state;
  }

  /**
   * Unregister a WebSocket connection
   */
  async unregisterConnection(socketId: string): Promise<void> {
    // If joined to a moment, leave first
    if (this.presences.has(socketId)) {
      await this.leaveMoment(socketId);
    }

    this.connections.delete(socketId);
    this.connectionStates.delete(socketId);

    console.log(`[WS] Connection unregistered: ${socketId}`);
  }

  /**
   * Get connection state
   */
  getConnectionState(socketId: string): WSConnectionState | undefined {
    return this.connectionStates.get(socketId);
  }

  // ============================================
  // Join/Leave Operations
  // ============================================

  /**
   * Join a moment (authenticate and create presence)
   */
  async joinMoment(
    socketId: string,
    sessionToken: string,
    momentId: string
  ): Promise<{ success: boolean; error?: WSErrorCode; message?: string }> {
    const state = this.connectionStates.get(socketId);
    if (!state) {
      return { success: false, error: WSErrorCodes.SERVER_ERROR, message: 'Connection not found' };
    }

    // Check if already joined
    if (this.presences.has(socketId)) {
      return { success: false, error: WSErrorCodes.ALREADY_JOINED, message: 'Already joined to a moment' };
    }

    // Rate limit check
    const rateLimitCheck = wsRateLimiter.check(socketId);
    if (!rateLimitCheck.allowed) {
      this.sendMessage(socketId, {
        type: 'rate_limited',
        payload: {
          retryAfter: rateLimitCheck.retryAfter || 60,
          message: 'Rate limit exceeded. Please slow down.',
          timestamp: Date.now(),
        },
      });
      return { success: false, error: WSErrorCodes.RATE_LIMITED, message: 'Rate limited' };
    }

    // Verify session token
    const sessionVerify = await verifySession(sessionToken);
    if (!sessionVerify.valid) {
      return { success: false, error: WSErrorCodes.INVALID_TOKEN, message: sessionVerify.error };
    }

    // Verify moment matches
    if (sessionVerify.momentId !== momentId) {
      return { success: false, error: WSErrorCodes.INVALID_TOKEN, message: 'Session moment mismatch' };
    }

    try {
      // Verify moment is live
      const moment = await prisma.moment.findUnique({
        where: { id: momentId },
      });

      if (!moment) {
        return { success: false, error: WSErrorCodes.MOMENT_NOT_FOUND, message: 'Moment not found' };
      }

      if (moment.status !== 'live') {
        return { success: false, error: WSErrorCodes.MOMENT_NOT_LIVE, message: 'Moment is not live' };
      }

      // Create presence in database
      const presence = await prisma.presence.create({
        data: {
          socketId,
          sessionId: sessionVerify.sessionId!,
          momentId,
          connectedAt: new Date(),
          lastHeartbeatAt: new Date(),
        },
      });

      // Update connection state
      state.sessionId = sessionVerify.sessionId;
      state.momentId = momentId;
      state.isAuthenticated = true;
      state.lastHeartbeatAt = new Date();

      // Store presence data
      const presenceData: PresenceData = {
        socketId,
        sessionId: sessionVerify.sessionId!,
        momentId,
        connectedAt: presence.connectedAt,
        lastHeartbeatAt: presence.lastHeartbeatAt,
      };
      this.presences.set(socketId, presenceData);

      // Add to moment presences
      if (!this.momentPresences.has(momentId)) {
        this.momentPresences.set(momentId, new Set());
      }
      this.momentPresences.get(momentId)!.add(socketId);

      // Get updated count
      const presenceCount = this.momentPresences.get(momentId)!.size;

      // Update peak presence if needed
      if (presenceCount > moment.peakPresence) {
        await prisma.moment.update({
          where: { id: momentId },
          data: { peakPresence: presenceCount },
        });
      }

      // Send joined confirmation
      this.sendMessage(socketId, {
        type: 'joined',
        payload: {
          socketId,
          momentId,
          presenceCount,
          timestamp: Date.now(),
        },
      });

      // Broadcast presence update to all in moment
      this.broadcastPresenceUpdate(momentId);

      console.log(`[WS] ${socketId} joined moment ${momentId} (${presenceCount} present)`);
      return { success: true };
    } catch (error) {
      console.error('[WS] Join error:', error);
      return { success: false, error: WSErrorCodes.SERVER_ERROR, message: 'Failed to join moment' };
    }
  }

  /**
   * Leave a moment
   */
  async leaveMoment(socketId: string): Promise<void> {
    const presence = this.presences.get(socketId);
    if (!presence) return;

    const { momentId } = presence;

    try {
      // Delete presence from database
      await prisma.presence.deleteMany({
        where: { socketId },
      });

      // Remove from tracking
      this.presences.delete(socketId);
      this.momentPresences.get(momentId)?.delete(socketId);

      // Update connection state
      const state = this.connectionStates.get(socketId);
      if (state) {
        state.sessionId = undefined;
        state.momentId = undefined;
        state.isAuthenticated = false;
      }

      // Get updated count
      const presenceCount = this.momentPresences.get(momentId)?.size || 0;

      // Send left confirmation
      this.sendMessage(socketId, {
        type: 'left',
        payload: {
          socketId,
          momentId,
          presenceCount,
          timestamp: Date.now(),
        },
      });

      // Broadcast presence update
      this.broadcastPresenceUpdate(momentId);

      console.log(`[WS] ${socketId} left moment ${momentId} (${presenceCount} present)`);
    } catch (error) {
      console.error('[WS] Leave error:', error);
    }
  }

  // ============================================
  // Heartbeat
  // ============================================

  /**
   * Handle heartbeat from client
   */
  async handleHeartbeat(socketId: string, sessionToken: string): Promise<void> {
    const state = this.connectionStates.get(socketId);
    if (!state) return;

    // Rate limit heartbeats separately
    const rateLimitCheck = heartbeatRateLimiter.check(socketId);
    if (!rateLimitCheck.allowed) {
      return; // Silently drop excess heartbeats
    }

    state.lastHeartbeatAt = new Date();
    state.messageCount++;

    // Update presence in memory
    const presence = this.presences.get(socketId);
    if (presence) {
      presence.lastHeartbeatAt = new Date();
    }

    // Update in database (throttled - only every 60 seconds)
    if (presence && Date.now() - presence.lastHeartbeatAt.getTime() > 60000) {
      await prisma.presence.updateMany({
        where: { socketId },
        data: { lastHeartbeatAt: new Date() },
      });
    }

    // Send pong response
    this.sendMessage(socketId, {
      type: 'pong',
      payload: {
        timestamp: Date.now(),
        serverTime: Date.now(),
      },
    });
  }

  /**
   * Check for stale heartbeats and disconnect inactive clients
   */
  private async checkHeartbeats(): Promise<void> {
    const now = Date.now();
    const timeoutThreshold = now - HEARTBEAT_TIMEOUT;

    for (const [socketId, state] of this.connectionStates.entries()) {
      if (state.lastHeartbeatAt.getTime() < timeoutThreshold) {
        console.log(`[WS] Heartbeat timeout for ${socketId}`);
        
        // Close the connection
        const ws = this.connections.get(socketId);
        if (ws) {
          ws.close(1001, 'Heartbeat timeout');
        }

        // Cleanup will be handled by close event
        await this.unregisterConnection(socketId);
      }
    }
  }

  // ============================================
  // Broadcasting
  // ============================================

  /**
   * Broadcast presence update to all clients in a moment
   */
  private broadcastPresenceUpdate(momentId: string): void {
    const socketIds = this.momentPresences.get(momentId);
    if (!socketIds || socketIds.size === 0) return;

    const presenceCount = socketIds.size;

    // Get peak from database
    prisma.moment.findUnique({
      where: { id: momentId },
      select: { peakPresence: true },
    }).then((moment) => {
      const message: WSServerMessage = {
        type: 'presence_update',
        payload: {
          momentId,
          count: presenceCount,
          peakCount: moment?.peakPresence || presenceCount,
          timestamp: Date.now(),
        },
      };

      // Send to all connected clients in the moment
      for (const socketId of socketIds) {
        this.sendMessage(socketId, message);
      }
    });
  }

  /**
   * Send a message to a specific client
   */
  sendMessage(socketId: string, message: WSServerMessage): boolean {
    const ws = this.connections.get(socketId);
    if (!ws || ws.readyState !== 1) { // 1 = WebSocket.OPEN
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WS] Failed to send message to ${socketId}:`, error);
      return false;
    }
  }

  /**
   * Send error message to client
   */
  sendError(socketId: string, code: WSErrorCode, message: string): boolean {
    return this.sendMessage(socketId, {
      type: 'error',
      payload: {
        code,
        message,
        timestamp: Date.now(),
      },
    });
  }

  // ============================================
  // Stats & Monitoring
  // ============================================

  /**
   * Get current presence stats
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    momentBreakdown: Record<string, number>;
  } {
    let authenticatedConnections = 0;
    for (const state of this.connectionStates.values()) {
      if (state.isAuthenticated) authenticatedConnections++;
    }

    const momentBreakdown: Record<string, number> = {};
    for (const [momentId, socketIds] of this.momentPresences.entries()) {
      momentBreakdown[momentId] = socketIds.size;
    }

    return {
      totalConnections: this.connections.size,
      authenticatedConnections,
      momentBreakdown,
    };
  }

  /**
   * Get presence count for a moment
   */
  getMomentPresenceCount(momentId: string): number {
    return this.momentPresences.get(momentId)?.size || 0;
  }
}

// Export singleton instance
export const presenceService = new PresenceService();

export default presenceService;
