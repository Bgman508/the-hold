// ============================================================================
// THE HOLD - TypeScript Type Definitions
// ============================================================================

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionBeginResponse {
  sessionId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionEndResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Moment Types
// ============================================================================

export interface Moment {
  id: string;
  title: string;
  description?: string;
  audioUrl?: string;
  isLive: boolean;
  startedAt?: string;
  endedAt?: string;
  presenceCount?: number;
}

export interface MomentCurrentResponse {
  moment: Moment | null;
  presenceCount: number;
}

// ============================================================================
// Presence Types
// ============================================================================

export interface PresenceUpdate {
  type: 'presence' | 'user_joined' | 'user_left';
  count: number;
  timestamp: string;
}

export interface WebSocketMessage {
  type: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface AnonymousUser {
  id: string;
  token: string;
  createdAt: string;
  lastSeenAt: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps {
  message?: string;
  size?: 'small' | 'default' | 'large';
}

export interface ErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onAction?: () => void;
}

// ============================================================================
// Audio Types
// ============================================================================

export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioConfig {
  src: string;
  volume?: number;
  loop?: boolean;
  autoPlay?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  ease?: number[];
}

export type EasingFunction = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | [number, number, number, number];

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Environment Types
// ============================================================================

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_WS_PORT?: string;
      DATABASE_URL?: string;
      JWT_SECRET?: string;
    }
  }
}

// Export empty object to make this a module
export {};
