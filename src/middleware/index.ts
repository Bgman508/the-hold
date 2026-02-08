/**
 * Middleware Index for THE HOLD
 * 
 * Central export for all middleware functions
 */

// Authentication & RBAC
export {
  // Token generation
  generateAnonymousToken,
  generateAuthenticatedToken,
  generateWebSocketToken,
  
  // Token verification
  verifyToken,
  payloadToUser,
  
  // Request authentication
  authenticateRequest,
  optionalAuth,
  
  // RBAC guards
  requirePermission,
  requireRole,
  requireCouncil,
  
  // WebSocket auth
  validateWebSocketToken,
  
  // Utilities
  hashIpAddress,
  getClientIp,
  extractToken,
} from './auth';

// Re-export types
export type {
  // These types are defined in @/types/rbac
} from '@/types/rbac';
