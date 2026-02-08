/**
 * WebSocket Server for THE HOLD
 * 
 * Standalone WebSocket server that runs alongside Next.js.
 * Recommended deployment: Docker with both services.
 * 
 * Architecture:
 * - ws-server.ts: WebSocket server (port 3001)
 * - Next.js: HTTP API server (port 3000)
 * - Both share the same SQLite database via Prisma
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import crypto from 'crypto';
import { presenceService } from './presence-service';
import { wsRateLimiter } from '../lib/rate-limiter';
import type { WSClientMessage, WSServerMessage } from '../types/websocket';
import { WSErrorCodes } from '../types/websocket';

// ============================================
// Configuration
// ============================================

const WS_PORT = parseInt(process.env.WS_PORT || '3001');
const WS_PATH = '/ws';
const HEARTBEAT_INTERVAL = 30000;

// ============================================
// WebSocket Server
// ============================================

class HoldWebSocketServer {
  private wss: WebSocketServer;
  private httpServer: ReturnType<typeof createServer>;

  constructor() {
    // Create HTTP server for WebSocket upgrade handling
    this.httpServer = createServer((req, res) => {
      // Health check endpoint
      if (req.url === '/health') {
        const stats = presenceService.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'the-hold-websocket',
          timestamp: new Date().toISOString(),
          connections: stats,
        }));
        return;
      }

      // Default response
      res.writeHead(404);
      res.end('WebSocket server - use /ws endpoint');
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: WS_PATH,
      // Verify client origin (configure for production)
      verifyClient: (info, cb) => {
        // Allow all origins in development
        if (process.env.NODE_ENV !== 'production') {
          cb(true);
          return;
        }

        // In production, verify against allowed origins
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
        const origin = info.origin || info.req.headers.origin;
        
        if (!origin || allowedOrigins.includes(origin)) {
          cb(true);
        } else {
          console.warn(`[WS] Rejected connection from origin: ${origin}`);
          cb(false, 403, 'Origin not allowed');
        }
      },
    });

    this.setupEventHandlers();
  }

  // ============================================
  // Event Handlers
  // ============================================

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      // Generate unique socket ID
      const socketId = this.generateSocketId();
      
      // Get client IP for rate limiting
      const clientIp = this.getClientIp(req);
      const ipHash = wsRateLimiter.constructor.name; // We'll use socketId for rate limiting

      console.log(`[WS] New connection: ${socketId} from ${clientIp}`);

      // Register connection with presence service
      presenceService.registerConnection(socketId, ws);

      // Send welcome message
      this.send(ws, {
        type: 'pong',
        payload: {
          timestamp: Date.now(),
          serverTime: Date.now(),
        },
      });

      // Setup message handler
      ws.on('message', async (data: Buffer) => {
        try {
          const message: WSClientMessage = JSON.parse(data.toString());
          await this.handleMessage(socketId, ws, message);
        } catch (error) {
          console.error(`[WS] Invalid message from ${socketId}:`, error);
          this.sendError(ws, WSErrorCodes.INVALID_MESSAGE, 'Invalid message format');
        }
      });

      // Setup close handler
      ws.on('close', async (code: number, reason: Buffer) => {
        console.log(`[WS] Connection closed: ${socketId} (code: ${code}, reason: ${reason.toString()})`);
        await presenceService.unregisterConnection(socketId);
      });

      // Setup error handler
      ws.on('error', (error: Error) => {
        console.error(`[WS] Error on ${socketId}:`, error);
      });

      // Setup ping/pong for connection health
      ws.on('pong', () => {
        // Connection is alive
        const state = presenceService.getConnectionState(socketId);
        if (state) {
          state.lastHeartbeatAt = new Date();
        }
      });
    });

    // Server-level error handling
    this.wss.on('error', (error) => {
      console.error('[WS] Server error:', error);
    });

    // Start heartbeat interval
    setInterval(() => this.checkConnections(), HEARTBEAT_INTERVAL);
  }

  // ============================================
  // Message Handling
  // ============================================

  private async handleMessage(
    socketId: string,
    ws: WebSocket,
    message: WSClientMessage
  ): Promise<void> {
    // Rate limit check for all messages
    const rateLimitCheck = wsRateLimiter.check(socketId);
    if (!rateLimitCheck.allowed) {
      this.send(ws, {
        type: 'rate_limited',
        payload: {
          retryAfter: rateLimitCheck.retryAfter || 60,
          message: 'Rate limit exceeded. Please slow down.',
          timestamp: Date.now(),
        },
      });
      return;
    }

    switch (message.type) {
      case 'join':
        await this.handleJoin(socketId, ws, message.payload);
        break;

      case 'leave':
        await this.handleLeave(socketId, ws);
        break;

      case 'heartbeat':
        await this.handleHeartbeat(socketId, ws, message.payload);
        break;

      case 'ping':
        this.handlePing(ws, message.payload);
        break;

      default:
        this.sendError(ws, WSErrorCodes.INVALID_MESSAGE, `Unknown message type`);
    }
  }

  private async handleJoin(
    socketId: string,
    ws: WebSocket,
    payload: { sessionToken: string; momentId: string }
  ): Promise<void> {
    if (!payload.sessionToken || !payload.momentId) {
      this.sendError(ws, WSErrorCodes.INVALID_MESSAGE, 'Missing sessionToken or momentId');
      return;
    }

    const result = await presenceService.joinMoment(
      socketId,
      payload.sessionToken,
      payload.momentId
    );

    if (!result.success) {
      this.sendError(ws, result.error || WSErrorCodes.SERVER_ERROR, result.message || 'Join failed');
    }
  }

  private async handleLeave(socketId: string, ws: WebSocket): Promise<void> {
    await presenceService.leaveMoment(socketId);
  }

  private async handleHeartbeat(
    socketId: string,
    ws: WebSocket,
    payload: { sessionToken: string; timestamp: number }
  ): Promise<void> {
    if (!payload.sessionToken) {
      this.sendError(ws, WSErrorCodes.INVALID_MESSAGE, 'Missing sessionToken');
      return;
    }

    await presenceService.handleHeartbeat(socketId, payload.sessionToken);
  }

  private handlePing(ws: WebSocket, payload: { timestamp: number }): void {
    this.send(ws, {
      type: 'pong',
      payload: {
        timestamp: payload.timestamp,
        serverTime: Date.now(),
      },
    });
  }

  // ============================================
  // Utilities
  // ============================================

  private generateSocketId(): string {
    return `ws_${crypto.randomBytes(16).toString('hex')}`;
  }

  private getClientIp(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  private send(ws: WebSocket, message: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    this.send(ws, {
      type: 'error',
      payload: {
        code,
        message,
        timestamp: Date.now(),
      },
    });
  }

  // ============================================
  // Connection Health
  // ============================================

  private checkConnections(): void {
    this.wss.clients.forEach((ws) => {
      // Send ping to check if connection is alive
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }

  // ============================================
  // Server Control
  // ============================================

  start(): void {
    this.httpServer.listen(WS_PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🕯️  THE HOLD WebSocket Server                             ║
║                                                            ║
║   Listening on port: ${WS_PORT.toString().padEnd(36)}║
║   WebSocket path: ${WS_PATH.padEnd(39)}║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(42)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  }

  stop(): void {
    console.log('[WS] Shutting down WebSocket server...');
    
    // Close all connections gracefully
    this.wss.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });

    // Close server
    this.httpServer.close(() => {
      console.log('[WS] Server stopped');
    });
  }
}

// ============================================
// Start Server
// ============================================

const server = new HoldWebSocketServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  server.stop();
  process.exit(0);
});

// Start the server
server.start();

export default HoldWebSocketServer;
