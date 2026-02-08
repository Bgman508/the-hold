/**
 * WebSocket Types for THE HOLD
 * 
 * Defines all message types and interfaces for WebSocket communication
 */

// ============================================
// Client -> Server Messages
// ============================================

export interface WSJoinMessage {
  type: 'join';
  payload: {
    sessionToken: string;
    momentId: string;
  };
}

export interface WSLeaveMessage {
  type: 'leave';
  payload: {
    sessionToken: string;
  };
}

export interface WSHeartbeatMessage {
  type: 'heartbeat';
  payload: {
    sessionToken: string;
    timestamp: number;
  };
}

export interface WSPingMessage {
  type: 'ping';
  payload: {
    timestamp: number;
  };
}

// Union type for all client messages
export type WSClientMessage =
  | WSJoinMessage
  | WSLeaveMessage
  | WSHeartbeatMessage
  | WSPingMessage;

// ============================================
// Server -> Client Messages
// ============================================

export interface WSPresenceUpdateMessage {
  type: 'presence_update';
  payload: {
    momentId: string;
    count: number;
    peakCount: number;
    timestamp: number;
  };
}

export interface WSJoinedMessage {
  type: 'joined';
  payload: {
    socketId: string;
    momentId: string;
    presenceCount: number;
    timestamp: number;
  };
}

export interface WSLeftMessage {
  type: 'left';
  payload: {
    socketId: string;
    momentId: string;
    presenceCount: number;
    timestamp: number;
  };
}

export interface WSPongMessage {
  type: 'pong';
  payload: {
    timestamp: number;
    serverTime: number;
  };
}

export interface WSErrorMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    timestamp: number;
  };
}

export interface WSRateLimitMessage {
  type: 'rate_limited';
  payload: {
    retryAfter: number;
    message: string;
    timestamp: number;
  };
}

// Union type for all server messages
export type WSServerMessage =
  | WSPresenceUpdateMessage
  | WSJoinedMessage
  | WSLeftMessage
  | WSPongMessage
  | WSErrorMessage
  | WSRateLimitMessage;

// ============================================
// WebSocket Error Codes
// ============================================

export const WSErrorCodes = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  MOMENT_NOT_FOUND: 'MOMENT_NOT_FOUND',
  MOMENT_NOT_LIVE: 'MOMENT_NOT_LIVE',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  SERVER_ERROR: 'SERVER_ERROR',
  ALREADY_JOINED: 'ALREADY_JOINED',
  NOT_JOINED: 'NOT_JOINED',
} as const;

export type WSErrorCode = typeof WSErrorCodes[keyof typeof WSErrorCodes];

// ============================================
// Connection State
// ============================================

export interface WSConnectionState {
  socketId: string;
  sessionId?: string;
  momentId?: string;
  connectedAt: Date;
  lastHeartbeatAt: Date;
  messageCount: number;
  lastMessageAt: Date;
  isAuthenticated: boolean;
}

// ============================================
// Presence Data (for internal tracking)
// ============================================

export interface PresenceData {
  socketId: string;
  sessionId: string;
  momentId: string;
  connectedAt: Date;
  lastHeartbeatAt: Date;
}

// ============================================
// Rate Limiting
// ============================================

export interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil?: number;
}
