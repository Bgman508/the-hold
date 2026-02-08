/**
 * RBAC (Role-Based Access Control) Unit Tests
 * 
 * Tests for permission checking, role hierarchy, and access control.
 */

import { describe, it, expect } from 'vitest';
import {
  Role,
  Permission,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRoleLevel,
  isCouncil,
  isArchitect,
  getPermissionsForRole,
  RBACError,
  RBACErrorCode,
  createPermissionGuard,
  createRoleGuard,
  AnonymousSession,
  AuthenticatedUser,
} from '../../types/rbac';

describe('RBAC (Role-Based Access Control)', () => {
  // ============================================
  // Test Data
  // ============================================

  const anonymousUser: AnonymousSession = {
    type: 'anonymous',
    sessionId: 'anon-session-123',
    momentId: 'moment-123',
    enteredAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
  };

  const councilUser: AuthenticatedUser = {
    type: 'authenticated',
    userId: 'council-user-123',
    role: Role.COUNCIL,
    permissions: PERMISSION_MATRIX[Role.COUNCIL],
    sessionExpiresAt: new Date(Date.now() + 86400000),
  };

  const architectUser: AuthenticatedUser = {
    type: 'authenticated',
    userId: 'architect-user-123',
    role: Role.ARCHITECT,
    permissions: PERMISSION_MATRIX[Role.ARCHITECT],
    sessionExpiresAt: new Date(Date.now() + 86400000),
  };

  const communityUser: AuthenticatedUser = {
    type: 'authenticated',
    userId: 'community-user-123',
    role: Role.COMMUNITY,
    permissions: PERMISSION_MATRIX[Role.COMMUNITY],
    sessionExpiresAt: new Date(Date.now() + 86400000),
  };

  // ============================================
  // Role Hierarchy Tests
  // ============================================

  describe('Role Hierarchy', () => {
    it('should have correct role hierarchy values', () => {
      expect(ROLE_HIERARCHY[Role.ANONYMOUS]).toBe(0);
      expect(ROLE_HIERARCHY[Role.COMMUNITY]).toBe(1);
      expect(ROLE_HIERARCHY[Role.ARCHITECT]).toBe(2);
      expect(ROLE_HIERARCHY[Role.COUNCIL]).toBe(3);
    });

    it('should have ascending hierarchy', () => {
      const values = Object.values(ROLE_HIERARCHY);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  // ============================================
  // Permission Matrix Tests
  // ============================================

  describe('Permission Matrix', () => {
    it('should define permissions for all roles', () => {
      Object.values(Role).forEach((role) => {
        expect(PERMISSION_MATRIX[role]).toBeDefined();
        expect(Array.isArray(PERMISSION_MATRIX[role])).toBe(true);
      });
    });

    it('should have Council with all permissions', () => {
      const councilPermissions = PERMISSION_MATRIX[Role.COUNCIL];
      
      // Council should have all moment permissions
      expect(councilPermissions).toContain(Permission.MOMENT_CREATE);
      expect(councilPermissions).toContain(Permission.MOMENT_READ);
      expect(councilPermissions).toContain(Permission.MOMENT_UPDATE);
      expect(councilPermissions).toContain(Permission.MOMENT_DELETE);
      expect(councilPermissions).toContain(Permission.MOMENT_ACTIVATE);
      expect(councilPermissions).toContain(Permission.MOMENT_DEACTIVATE);
      
      // Council should have governance permissions
      expect(councilPermissions).toContain(Permission.COUNCIL_MANAGE_ARCHITECTS);
      expect(councilPermissions).toContain(Permission.COUNCIL_VIEW_AUDIT_LOGS);
      expect(councilPermissions).toContain(Permission.COUNCIL_SYSTEM_CONFIG);
    });

    it('should have Architect with limited permissions', () => {
      const architectPermissions = PERMISSION_MATRIX[Role.ARCHITECT];
      
      expect(architectPermissions).toContain(Permission.MOMENT_CREATE);
      expect(architectPermissions).toContain(Permission.MOMENT_READ);
      expect(architectPermissions).toContain(Permission.MOMENT_UPDATE);
      
      // Architect should NOT have delete permission
      expect(architectPermissions).not.toContain(Permission.MOMENT_DELETE);
      
      // Architect should NOT have governance permissions
      expect(architectPermissions).not.toContain(Permission.COUNCIL_MANAGE_ARCHITECTS);
    });

    it('should have Community with basic permissions', () => {
      const communityPermissions = PERMISSION_MATRIX[Role.COMMUNITY];
      
      expect(communityPermissions).toContain(Permission.MOMENT_READ);
      expect(communityPermissions).toContain(Permission.ACCESS_MOMENT);
      
      // Community should NOT have create/update/delete
      expect(communityPermissions).not.toContain(Permission.MOMENT_CREATE);
      expect(communityPermissions).not.toContain(Permission.MOMENT_UPDATE);
      expect(communityPermissions).not.toContain(Permission.MOMENT_DELETE);
    });

    it('should have Anonymous with minimal permissions', () => {
      const anonymousPermissions = PERMISSION_MATRIX[Role.ANONYMOUS];
      
      expect(anonymousPermissions).toContain(Permission.ACCESS_MOMENT);
      expect(anonymousPermissions).toContain(Permission.ACCESS_PUBLIC_STATS);
      
      // Anonymous should NOT have any moment management permissions
      expect(anonymousPermissions).not.toContain(Permission.MOMENT_CREATE);
      expect(anonymousPermissions).not.toContain(Permission.MOMENT_READ);
      expect(anonymousPermissions).not.toContain(Permission.MOMENT_UPDATE);
    });

    it('should follow principle of least privilege', () => {
      // Higher roles should have more permissions
      const anonymousCount = PERMISSION_MATRIX[Role.ANONYMOUS].length;
      const communityCount = PERMISSION_MATRIX[Role.COMMUNITY].length;
      const architectCount = PERMISSION_MATRIX[Role.ARCHITECT].length;
      const councilCount = PERMISSION_MATRIX[Role.COUNCIL].length;

      expect(councilCount).toBeGreaterThan(architectCount);
      expect(architectCount).toBeGreaterThan(communityCount);
      expect(communityCount).toBeGreaterThanOrEqual(anonymousCount);
    });
  });

  // ============================================
  // hasPermission Tests
  // ============================================

  describe('hasPermission', () => {
    it('should return true for valid permission', () => {
      expect(hasPermission(councilUser, Permission.MOMENT_CREATE)).toBe(true);
      expect(hasPermission(architectUser, Permission.MOMENT_CREATE)).toBe(true);
      expect(hasPermission(communityUser, Permission.MOMENT_READ)).toBe(true);
    });

    it('should return false for invalid permission', () => {
      expect(hasPermission(anonymousUser, Permission.MOMENT_CREATE)).toBe(false);
      expect(hasPermission(communityUser, Permission.MOMENT_CREATE)).toBe(false);
      expect(hasPermission(architectUser, Permission.MOMENT_DELETE)).toBe(false);
    });

    it('should work for anonymous users', () => {
      expect(hasPermission(anonymousUser, Permission.ACCESS_MOMENT)).toBe(true);
      expect(hasPermission(anonymousUser, Permission.ACCESS_PUBLIC_STATS)).toBe(true);
      expect(hasPermission(anonymousUser, Permission.MOMENT_READ)).toBe(false);
    });

    it('should handle all permissions for Council', () => {
      const allPermissions = Object.values(Permission);
      allPermissions.forEach((permission) => {
        expect(hasPermission(councilUser, permission)).toBe(true);
      });
    });
  });

  // ============================================
  // hasAnyPermission Tests
  // ============================================

  describe('hasAnyPermission', () => {
    it('should return true if any permission is granted', () => {
      const permissions = [Permission.MOMENT_CREATE, Permission.MOMENT_DELETE];
      expect(hasAnyPermission(councilUser, permissions)).toBe(true);
    });

    it('should return false if no permissions are granted', () => {
      const permissions = [Permission.MOMENT_CREATE, Permission.MOMENT_DELETE];
      expect(hasAnyPermission(anonymousUser, permissions)).toBe(false);
    });

    it('should return true for single valid permission', () => {
      expect(hasAnyPermission(architectUser, [Permission.MOMENT_CREATE])).toBe(true);
    });

    it('should handle empty permission array', () => {
      expect(hasAnyPermission(councilUser, [])).toBe(false);
    });

    it('should work with mixed permissions', () => {
      const permissions = [
        Permission.MOMENT_DELETE, // Council only
        Permission.ACCESS_MOMENT, // All have
      ];
      expect(hasAnyPermission(anonymousUser, permissions)).toBe(true);
    });
  });

  // ============================================
  // hasAllPermissions Tests
  // ============================================

  describe('hasAllPermissions', () => {
    it('should return true if all permissions are granted', () => {
      const permissions = [Permission.MOMENT_CREATE, Permission.MOMENT_READ];
      expect(hasAllPermissions(councilUser, permissions)).toBe(true);
    });

    it('should return false if any permission is missing', () => {
      const permissions = [Permission.MOMENT_CREATE, Permission.MOMENT_DELETE];
      expect(hasAllPermissions(architectUser, permissions)).toBe(false);
    });

    it('should return true for single valid permission', () => {
      expect(hasAllPermissions(communityUser, [Permission.MOMENT_READ])).toBe(true);
    });

    it('should handle empty permission array', () => {
      expect(hasAllPermissions(councilUser, [])).toBe(true);
    });

    it('should require all permissions for anonymous', () => {
      const permissions = [Permission.ACCESS_MOMENT, Permission.ACCESS_PUBLIC_STATS];
      expect(hasAllPermissions(anonymousUser, permissions)).toBe(true);

      const extendedPermissions = [...permissions, Permission.MOMENT_READ];
      expect(hasAllPermissions(anonymousUser, extendedPermissions)).toBe(false);
    });
  });

  // ============================================
  // hasRoleLevel Tests
  // ============================================

  describe('hasRoleLevel', () => {
    it('should return true for exact role match', () => {
      expect(hasRoleLevel(councilUser, Role.COUNCIL)).toBe(true);
      expect(hasRoleLevel(architectUser, Role.ARCHITECT)).toBe(true);
    });

    it('should return true for higher role', () => {
      expect(hasRoleLevel(councilUser, Role.ARCHITECT)).toBe(true);
      expect(hasRoleLevel(councilUser, Role.COMMUNITY)).toBe(true);
      expect(hasRoleLevel(architectUser, Role.COMMUNITY)).toBe(true);
    });

    it('should return false for lower role requirement', () => {
      expect(hasRoleLevel(architectUser, Role.COUNCIL)).toBe(false);
      expect(hasRoleLevel(communityUser, Role.ARCHITECT)).toBe(false);
    });

    it('should handle anonymous user correctly', () => {
      expect(hasRoleLevel(anonymousUser, Role.ANONYMOUS)).toBe(true);
      expect(hasRoleLevel(anonymousUser, Role.COMMUNITY)).toBe(false);
    });
  });

  // ============================================
  // Role Check Functions Tests
  // ============================================

  describe('isCouncil', () => {
    it('should return true for Council user', () => {
      expect(isCouncil(councilUser)).toBe(true);
    });

    it('should return false for non-Council users', () => {
      expect(isCouncil(architectUser)).toBe(false);
      expect(isCouncil(communityUser)).toBe(false);
      expect(isCouncil(anonymousUser)).toBe(false);
    });
  });

  describe('isArchitect', () => {
    it('should return true for Architect user', () => {
      expect(isArchitect(architectUser)).toBe(true);
    });

    it('should return false for non-Architect users', () => {
      expect(isArchitect(councilUser)).toBe(false);
      expect(isArchitect(communityUser)).toBe(false);
      expect(isArchitect(anonymousUser)).toBe(false);
    });
  });

  // ============================================
  // getPermissionsForRole Tests
  // ============================================

  describe('getPermissionsForRole', () => {
    it('should return permissions for each role', () => {
      expect(getPermissionsForRole(Role.COUNCIL)).toEqual(PERMISSION_MATRIX[Role.COUNCIL]);
      expect(getPermissionsForRole(Role.ARCHITECT)).toEqual(PERMISSION_MATRIX[Role.ARCHITECT]);
      expect(getPermissionsForRole(Role.COMMUNITY)).toEqual(PERMISSION_MATRIX[Role.COMMUNITY]);
      expect(getPermissionsForRole(Role.ANONYMOUS)).toEqual(PERMISSION_MATRIX[Role.ANONYMOUS]);
    });

    it('should return a copy of permissions array', () => {
      const permissions = getPermissionsForRole(Role.COUNCIL);
      permissions.push('new-permission' as Permission);
      
      // Original should not be modified
      expect(PERMISSION_MATRIX[Role.COUNCIL]).not.toContain('new-permission');
    });
  });

  // ============================================
  // RBACError Tests
  // ============================================

  describe('RBACError', () => {
    it('should create error with code and message', () => {
      const error = new RBACError(
        RBACErrorCode.UNAUTHORIZED,
        'User is not authorized'
      );

      expect(error.code).toBe(RBACErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('User is not authorized');
      expect(error.name).toBe('RBACError');
    });

    it('should include optional permission and role', () => {
      const error = new RBACError(
        RBACErrorCode.INSUFFICIENT_PERMISSIONS,
        'Permission denied',
        Permission.MOMENT_DELETE,
        Role.ARCHITECT
      );

      expect(error.requiredPermission).toBe(Permission.MOMENT_DELETE);
      expect(error.userRole).toBe(Role.ARCHITECT);
    });

    it('should have all error codes defined', () => {
      expect(RBACErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(RBACErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(RBACErrorCode.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(RBACErrorCode.EXPIRED_TOKEN).toBe('EXPIRED_TOKEN');
      expect(RBACErrorCode.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS');
      expect(RBACErrorCode.ROLE_REQUIRED).toBe('ROLE_REQUIRED');
    });
  });

  // ============================================
  // Guard Functions Tests
  // ============================================

  describe('createPermissionGuard', () => {
    it('should create guard that checks permission', () => {
      const guard = createPermissionGuard(Permission.MOMENT_CREATE);

      expect(guard(councilUser)).toBe(true);
      expect(guard(architectUser)).toBe(true);
      expect(guard(communityUser)).toBe(false);
      expect(guard(anonymousUser)).toBe(false);
    });

    it('should create guard for multiple permissions', () => {
      const guard = createPermissionGuard(
        Permission.MOMENT_CREATE,
        Permission.MOMENT_DELETE
      );

      expect(guard(councilUser)).toBe(true); // Has both
      expect(guard(architectUser)).toBe(true); // Has create
      expect(guard(communityUser)).toBe(false); // Has neither
    });

    it('should work with anonymous user', () => {
      const guard = createPermissionGuard(Permission.ACCESS_MOMENT);

      expect(guard(anonymousUser)).toBe(true);
    });
  });

  describe('createRoleGuard', () => {
    it('should create guard that checks minimum role', () => {
      const guard = createRoleGuard(Role.ARCHITECT);

      expect(guard(councilUser)).toBe(true);
      expect(guard(architectUser)).toBe(true);
      expect(guard(communityUser)).toBe(false);
      expect(guard(anonymousUser)).toBe(false);
    });

    it('should create guard for Council only', () => {
      const guard = createRoleGuard(Role.COUNCIL);

      expect(guard(councilUser)).toBe(true);
      expect(guard(architectUser)).toBe(false);
    });

    it('should allow all authenticated for Community guard', () => {
      const guard = createRoleGuard(Role.COMMUNITY);

      expect(guard(councilUser)).toBe(true);
      expect(guard(architectUser)).toBe(true);
      expect(guard(communityUser)).toBe(true);
      expect(guard(anonymousUser)).toBe(false);
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================

  describe('Edge Cases', () => {
    it('should handle user with no permissions', () => {
      const userWithNoPermissions: AuthenticatedUser = {
        type: 'authenticated',
        userId: 'no-perms-user',
        role: Role.COMMUNITY,
        permissions: [],
        sessionExpiresAt: new Date(Date.now() + 86400000),
      };

      expect(hasPermission(userWithNoPermissions, Permission.MOMENT_READ)).toBe(false);
    });

    it('should handle user with custom permissions', () => {
      const customUser: AuthenticatedUser = {
        type: 'authenticated',
        userId: 'custom-user',
        role: Role.COMMUNITY,
        permissions: [Permission.MOMENT_CREATE, Permission.MOMENT_DELETE],
        sessionExpiresAt: new Date(Date.now() + 86400000),
      };

      expect(hasPermission(customUser, Permission.MOMENT_CREATE)).toBe(true);
      expect(hasPermission(customUser, Permission.MOMENT_DELETE)).toBe(true);
      expect(hasPermission(customUser, Permission.MOMENT_READ)).toBe(false);
    });

    it('should handle expired session', () => {
      const expiredUser: AuthenticatedUser = {
        type: 'authenticated',
        userId: 'expired-user',
        role: Role.COUNCIL,
        permissions: PERMISSION_MATRIX[Role.COUNCIL],
        sessionExpiresAt: new Date(Date.now() - 1000), // Expired
      };

      // Permission check should still work (expiration handled separately)
      expect(hasPermission(expiredUser, Permission.MOMENT_CREATE)).toBe(true);
    });
  });
});
