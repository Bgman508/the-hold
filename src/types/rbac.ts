/**
 * RBAC Type Definitions for THE HOLD
 * 
 * Security Principles:
 * - Anonymous-first design
 * - Principle of least privilege
 * - No PII storage
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

/**
 * User roles in THE HOLD governance model
 * - Council: Full governance control (MVP active)
 * - Architect: Moment creators (future)
 * - Community: Basic access (future)
 * - Anonymous: No stored identity (default for all moment entry)
 */
export enum Role {
  COUNCIL = 'council',
  ARCHITECT = 'architect',
  COMMUNITY = 'community',
  ANONYMOUS = 'anonymous',
}

/**
 * Role hierarchy for permission inheritance
 * Higher index = more permissions
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ANONYMOUS]: 0,
  [Role.COMMUNITY]: 1,
  [Role.ARCHITECT]: 2,
  [Role.COUNCIL]: 3,
};

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

/**
 * Granular permissions for THE HOLD
 * Each permission represents a specific action that can be performed
 */
export enum Permission {
  // Moment Management (MVP Active)
  MOMENT_CREATE = 'moment:create',
  MOMENT_READ = 'moment:read',
  MOMENT_UPDATE = 'moment:update',
  MOMENT_DELETE = 'moment:delete',
  MOMENT_ACTIVATE = 'moment:activate',
  MOMENT_DEACTIVATE = 'moment:deactivate',
  
  // Moment Stats (Future)
  MOMENT_VIEW_STATS = 'moment:view_stats',
  MOMENT_VIEW_OWN_STATS = 'moment:view_own_stats',
  
  // Governance (Council Only)
  COUNCIL_MANAGE_ARCHITECTS = 'council:manage_architects',
  COUNCIL_VIEW_AUDIT_LOGS = 'council:view_audit_logs',
  COUNCIL_SYSTEM_CONFIG = 'council:system_config',
  
  // Access (All Roles)
  ACCESS_MOMENT = 'access:moment',
  ACCESS_PUBLIC_STATS = 'access:public_stats',
}

/**
 * Permission matrix mapping roles to their allowed permissions
 * Implements principle of least privilege
 */
export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  [Role.COUNCIL]: [
    // Full moment control
    Permission.MOMENT_CREATE,
    Permission.MOMENT_READ,
    Permission.MOMENT_UPDATE,
    Permission.MOMENT_DELETE,
    Permission.MOMENT_ACTIVATE,
    Permission.MOMENT_DEACTIVATE,
    Permission.MOMENT_VIEW_STATS,
    // Governance
    Permission.COUNCIL_MANAGE_ARCHITECTS,
    Permission.COUNCIL_VIEW_AUDIT_LOGS,
    Permission.COUNCIL_SYSTEM_CONFIG,
    // Access
    Permission.ACCESS_MOMENT,
    Permission.ACCESS_PUBLIC_STATS,
  ],
  [Role.ARCHITECT]: [
    // Own moment management (future)
    Permission.MOMENT_CREATE,
    Permission.MOMENT_READ,
    Permission.MOMENT_UPDATE,
    Permission.MOMENT_VIEW_OWN_STATS,
    // Access
    Permission.ACCESS_MOMENT,
    Permission.ACCESS_PUBLIC_STATS,
  ],
  [Role.COMMUNITY]: [
    // Basic access (future features)
    Permission.MOMENT_READ,
    Permission.ACCESS_MOMENT,
    Permission.ACCESS_PUBLIC_STATS,
  ],
  [Role.ANONYMOUS]: [
    // Minimal access - can only enter moments
    Permission.ACCESS_MOMENT,
    Permission.ACCESS_PUBLIC_STATS,
  ],
};

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * Anonymous session - no PII stored
 * Used for all users entering moments
 */
export interface AnonymousSession {
  type: 'anonymous';
  sessionId: string; // Cryptographically random, not linked to identity
  momentId: string | null;
  enteredAt: Date;
  expiresAt: Date;
}

/**
 * Authenticated user base (for Council/Architect/Community)
 * No PII - only role and permissions
 */
export interface AuthenticatedUser {
  type: 'authenticated';
  userId: string; // Internal UUID, not linked to external identity
  role: Role;
  permissions: Permission[];
  sessionExpiresAt: Date;
}

/**
 * Union type for all user sessions
 */
export type User = AnonymousSession | AuthenticatedUser;

/**
 * JWT payload structure - minimal, no PII
 */
export interface JWTPayload {
  sub: string; // userId or sessionId
  role: Role;
  permissions: Permission[];
  iat: number;
  exp: number;
  type: 'anonymous' | 'authenticated';
}

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a user has a specific permission
 * @param user - The user to check
 * @param permission - The permission to verify
 * @returns boolean indicating if permission is granted
 */
export function hasPermission(user: User, permission: Permission): boolean {
  if (user.type === 'anonymous') {
    return PERMISSION_MATRIX[Role.ANONYMOUS].includes(permission);
  }
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 * @param user - The user to check
 * @param permissions - Array of permissions, any one grants access
 * @returns boolean indicating if any permission is granted
 */
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all specified permissions
 * @param user - The user to check
 * @param permissions - Array of permissions, all required
 * @returns boolean indicating if all permissions are granted
 */
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user has required role level or higher
 * @param user - The user to check
 * @param minRole - Minimum required role
 * @returns boolean indicating if user meets role requirement
 */
export function hasRoleLevel(user: User, minRole: Role): boolean {
  if (user.type === 'anonymous') {
    return ROLE_HIERARCHY[Role.ANONYMOUS] >= ROLE_HIERARCHY[minRole];
  }
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check if user is Council (highest authority)
 * @param user - The user to check
 * @returns boolean indicating if user is Council
 */
export function isCouncil(user: User): boolean {
  return user.type === 'authenticated' && user.role === Role.COUNCIL;
}

/**
 * Check if user is Architect
 * @param user - The user to check
 * @returns boolean indicating if user is Architect
 */
export function isArchitect(user: User): boolean {
  return user.type === 'authenticated' && user.role === Role.ARCHITECT;
}

/**
 * Get all permissions for a role
 * @param role - The role to get permissions for
 * @returns Array of permissions
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return [...PERMISSION_MATRIX[role]];
}

// ============================================================================
// RBAC ERROR TYPES
// ============================================================================

/**
 * RBAC-specific error codes
 */
export enum RBACErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED = 'ROLE_REQUIRED',
}

/**
 * RBAC error class
 */
export class RBACError extends Error {
  constructor(
    public code: RBACErrorCode,
    message: string,
    public requiredPermission?: Permission,
    public userRole?: Role
  ) {
    super(message);
    this.name = 'RBACError';
  }
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Create a permission guard for middleware
 * @param requiredPermissions - Permissions required to pass
 * @returns Guard function for middleware
 */
export function createPermissionGuard(...requiredPermissions: Permission[]) {
  return (user: User): boolean => {
    return hasAnyPermission(user, requiredPermissions);
  };
}

/**
 * Create a role guard for middleware
 * @param minRole - Minimum role required
 * @returns Guard function for middleware
 */
export function createRoleGuard(minRole: Role) {
  return (user: User): boolean => {
    return hasRoleLevel(user, minRole);
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Role,
  Permission,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  RBACErrorCode,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRoleLevel,
  isCouncil,
  isArchitect,
  getPermissionsForRole,
  createPermissionGuard,
  createRoleGuard,
};
