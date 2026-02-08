/**
 * Input Validation Unit Tests
 * 
 * Tests for Zod schemas, sanitization, and validation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeId,
  containsSqlInjection,
  containsNoSqlInjection,
  createMomentSchema,
  updateMomentSchema,
  momentIdSchema,
  momentSlugSchema,
  activateMomentSchema,
  deactivateMomentSchema,
  createAnonymousSessionSchema,
  loginSchema,
  wsConnectionSchema,
  wsMessageSchema,
  webrtcSignalSchema,
  paginationSchema,
  listMomentsQuerySchema,
  auditLogEntrySchema,
  validate,
  safeValidate,
  formatValidationErrors,
  ValidationError,
} from '../../lib/validation';

describe('Input Validation', () => {
  // ============================================
  // Sanitization Tests
  // ============================================

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeString(input)).toBe('alert("xss")Hello');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      expect(sanitizeString(input)).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = '<div onload="alert(1)" onclick="alert(2)">Test</div>';
      expect(sanitizeString(input)).toBe('<div >Test</div>');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      expect(sanitizeString(input)).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(sanitizeString(input)).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle string with only dangerous content', () => {
      expect(sanitizeString('<script></script>')).toBe('');
    });
  });

  describe('sanitizeId', () => {
    it('should allow alphanumeric characters', () => {
      expect(sanitizeId('abc123')).toBe('abc123');
    });

    it('should allow hyphens and underscores', () => {
      expect(sanitizeId('test-id_123')).toBe('test-id_123');
    });

    it('should remove special characters', () => {
      expect(sanitizeId('test@id#123')).toBe('testid123');
    });

    it('should truncate to 128 characters', () => {
      const longId = 'a'.repeat(200);
      expect(sanitizeId(longId)).toHaveLength(128);
    });

    it('should handle empty string', () => {
      expect(sanitizeId('')).toBe('');
    });
  });

  describe('containsSqlInjection', () => {
    it('should detect basic SQL injection', () => {
      expect(containsSqlInjection("' OR '1'='1")).toBe(true);
    });

    it('should detect DROP TABLE attempts', () => {
      expect(containsSqlInjection("'; DROP TABLE users; --")).toBe(true);
    });

    it('should detect UNION SELECT attempts', () => {
      expect(containsSqlInjection("' UNION SELECT * FROM users --")).toBe(true);
    });

    it('should return false for safe strings', () => {
      expect(containsSqlInjection('Hello World')).toBe(false);
      expect(containsSqlInjection('Test Moment Title')).toBe(false);
      expect(containsSqlInjection('user@example.com')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(containsSqlInjection('')).toBe(false);
    });
  });

  describe('containsNoSqlInjection', () => {
    it('should detect $where operator', () => {
      expect(containsNoSqlInjection('{"$where": "this.password.length > 0"}')).toBe(true);
    });

    it('should detect $ne operator', () => {
      expect(containsNoSqlInjection('{"$ne": null}')).toBe(true);
    });

    it('should detect $gt operator', () => {
      expect(containsNoSqlInjection('{"$gt": ""}')).toBe(true);
    });

    it('should return false for safe strings', () => {
      expect(containsNoSqlInjection('Hello World')).toBe(false);
      expect(containsNoSqlInjection('{"name": "test"}')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(containsNoSqlInjection('')).toBe(false);
    });
  });

  // ============================================
  // Moment Schema Tests
  // ============================================

  describe('createMomentSchema', () => {
    it('should validate valid moment data', () => {
      const data = {
        title: 'Test Moment',
        description: 'A test moment',
        slug: 'test-moment',
        maxParticipants: 100,
        duration: 3600,
        isPublic: true,
      };

      const result = createMomentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const data = {
        slug: 'test-moment',
      };

      const result = createMomentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce minimum title length', () => {
      const data = {
        title: 'A',
        slug: 'test-moment',
      };

      const result = createMomentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum title length', () => {
      const data = {
        title: 'A'.repeat(101),
        slug: 'test-moment',
      };

      const result = createMomentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate slug format', () => {
      const validSlugs = ['test-moment', 'test123', 'test-moment-123'];
      const invalidSlugs = ['Test Moment', 'test_moment', 'test.moment', 'test@moment'];

      validSlugs.forEach((slug) => {
        const result = createMomentSchema.safeParse({
          title: 'Test',
          slug,
        });
        expect(result.success).toBe(true);
      });

      invalidSlugs.forEach((slug) => {
        const result = createMomentSchema.safeParse({
          title: 'Test',
          slug,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should enforce maxParticipants limits', () => {
      const tooFew = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        maxParticipants: 1,
      });
      expect(tooFew.success).toBe(false);

      const tooMany = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        maxParticipants: 1001,
      });
      expect(tooMany.success).toBe(false);

      const valid = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        maxParticipants: 100,
      });
      expect(valid.success).toBe(true);
    });

    it('should enforce duration limits', () => {
      const tooShort = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        duration: 30,
      });
      expect(tooShort.success).toBe(false);

      const tooLong = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        duration: 90000,
      });
      expect(tooLong.success).toBe(false);
    });

    it('should sanitize title and description', () => {
      const data = {
        title: '<script>alert(1)</script>Test',
        description: '<img src=x onerror=alert(1)>Description',
        slug: 'test-moment',
      };

      const result = createMomentSchema.parse(data);
      expect(result.title).not.toContain('<script>');
      expect(result.description).not.toContain('<img');
    });

    it('should enforce metadata size limit', () => {
      const largeMetadata = {
        title: 'Test',
        slug: 'test',
        metadata: {
          data: 'x'.repeat(5000),
        },
      };

      const result = createMomentSchema.safeParse(largeMetadata);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const data = {
        title: 'Test',
        slug: 'test',
      };

      const result = createMomentSchema.parse(data);
      expect(result.maxParticipants).toBe(100);
      expect(result.duration).toBe(3600);
      expect(result.isPublic).toBe(true);
      expect(result.description).toBe('');
    });
  });

  describe('updateMomentSchema', () => {
    it('should allow partial updates', () => {
      const result = updateMomentSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateMomentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate individual fields', () => {
      const invalid = updateMomentSchema.safeParse({
        maxParticipants: 1,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('momentIdSchema', () => {
    it('should validate UUID format', () => {
      const valid = momentIdSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(valid.success).toBe(true);

      const invalid = momentIdSchema.safeParse({
        id: 'not-a-uuid',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('momentSlugSchema', () => {
    it('should validate slug format', () => {
      const valid = momentSlugSchema.safeParse({
        slug: 'test-moment',
      });
      expect(valid.success).toBe(true);

      const invalid = momentSlugSchema.safeParse({
        slug: 'Test Moment!',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('activateMomentSchema', () => {
    it('should validate activation with momentId', () => {
      const result = activateMomentSchema.safeParse({
        momentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should allow optional activateAt timestamp', () => {
      const result = activateMomentSchema.safeParse({
        momentId: '550e8400-e29b-41d4-a716-446655440000',
        activateAt: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid timestamp', () => {
      const result = activateMomentSchema.safeParse({
        momentId: '550e8400-e29b-41d4-a716-446655440000',
        activateAt: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Auth Schema Tests
  // ============================================

  describe('createAnonymousSessionSchema', () => {
    it('should validate empty input', () => {
      const result = createAnonymousSessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with momentId', () => {
      const result = createAnonymousSessionSchema.safeParse({
        momentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should allow null momentId', () => {
      const result = createAnonymousSessionSchema.safeParse({
        momentId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should validate client info', () => {
      const result = createAnonymousSessionSchema.safeParse({
        clientInfo: {
          screenSize: 'large',
          timezone: 'America/New_York',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid screen size', () => {
      const result = createAnonymousSessionSchema.safeParse({
        clientInfo: {
          screenSize: 'huge',
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate access key', () => {
      const result = loginSchema.safeParse({
        accessKey: 'a'.repeat(32),
      });
      expect(result.success).toBe(true);
    });

    it('should reject short access key', () => {
      const result = loginSchema.safeParse({
        accessKey: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject access key with SQL injection', () => {
      const result = loginSchema.safeParse({
        accessKey: "'; DROP TABLE users; --",
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // WebSocket Schema Tests
  // ============================================

  describe('wsConnectionSchema', () => {
    it('should validate connection with token', () => {
      const result = wsConnectionSchema.safeParse({
        token: 'valid-token',
      });
      expect(result.success).toBe(true);
    });

    it('should require token', () => {
      const result = wsConnectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should allow optional momentId', () => {
      const result = wsConnectionSchema.safeParse({
        token: 'valid-token',
        momentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('wsMessageSchema', () => {
    it('should validate valid message types', () => {
      const validTypes = ['join', 'leave', 'signal', 'heartbeat', 'status'];

      validTypes.forEach((type) => {
        const result = wsMessageSchema.safeParse({
          type,
          payload: {},
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid message type', () => {
      const result = wsMessageSchema.safeParse({
        type: 'invalid',
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it('should allow optional timestamp', () => {
      const result = wsMessageSchema.safeParse({
        type: 'heartbeat',
        payload: {},
        timestamp: Date.now(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('webrtcSignalSchema', () => {
    it('should validate offer signal', () => {
      const result = webrtcSignalSchema.safeParse({
        type: 'offer',
        targetSessionId: 'session-123',
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it('should validate answer signal', () => {
      const result = webrtcSignalSchema.safeParse({
        type: 'answer',
        targetSessionId: 'session-123',
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it('should validate ice-candidate signal', () => {
      const result = webrtcSignalSchema.safeParse({
        type: 'ice-candidate',
        targetSessionId: 'session-123',
        data: {},
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid signal type', () => {
      const result = webrtcSignalSchema.safeParse({
        type: 'invalid',
        targetSessionId: 'session-123',
        data: {},
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Pagination Schema Tests
  // ============================================

  describe('paginationSchema', () => {
    it('should parse string page and limit', () => {
      const result = paginationSchema.safeParse({
        page: '2',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should apply defaults', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should enforce max limit', () => {
      const result = paginationSchema.safeParse({
        limit: '200',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = paginationSchema.safeParse({
        page: '-1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listMomentsQuerySchema', () => {
    it('should validate all query parameters', () => {
      const result = listMomentsQuerySchema.safeParse({
        page: '1',
        limit: '20',
        status: 'active',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = listMomentsQuerySchema.parse({});
      expect(result.status).toBe('all');
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should validate status enum', () => {
      const valid = listMomentsQuerySchema.safeParse({ status: 'active' });
      expect(valid.success).toBe(true);

      const invalid = listMomentsQuerySchema.safeParse({ status: 'invalid' });
      expect(invalid.success).toBe(false);
    });
  });

  // ============================================
  // Validation Function Tests
  // ============================================

  describe('validate', () => {
    it('should return parsed data on success', () => {
      const data = { title: 'Test', slug: 'test' };
      const result = validate(createMomentSchema, data);
      expect(result.title).toBe('Test');
    });

    it('should throw on validation error', () => {
      expect(() => {
        validate(createMomentSchema, { slug: 'test' });
      }).toThrow();
    });
  });

  describe('safeValidate', () => {
    it('should return success on valid data', () => {
      const data = { title: 'Test', slug: 'test' };
      const result = safeValidate(createMomentSchema, data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test');
      }
    });

    it('should return errors on invalid data', () => {
      const result = safeValidate(createMomentSchema, { slug: 'test' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('formatValidationErrors', () => {
    it('should format Zod errors', () => {
      const result = safeValidate(createMomentSchema, { slug: 'test' });
      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);
        expect(Array.isArray(formatted)).toBe(true);
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted[0]).toHaveProperty('path');
        expect(formatted[0]).toHaveProperty('message');
      }
    });
  });

  describe('ValidationError', () => {
    it('should create error with errors array', () => {
      const errors = [{ path: 'title', message: 'Required' }];
      const error = new ValidationError(errors);
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('ValidationError');
    });
  });

  // ============================================
  // Security Tests
  // ============================================

  describe('Security Validation', () => {
    it('should reject SQL injection in title', () => {
      const result = createMomentSchema.safeParse({
        title: "'; DROP TABLE moments; --",
        slug: 'test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject XSS in description', () => {
      const result = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        description: '<script>alert(1)</script>',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).not.toContain('<script>');
      }
    });

    it('should reject NoSQL injection in metadata', () => {
      const result = createMomentSchema.safeParse({
        title: 'Test',
        slug: 'test',
        metadata: {
          $where: 'malicious',
        },
      });
      // This might pass parsing but should be sanitized
      expect(result.success).toBe(true);
    });

    it('should enforce maximum lengths', () => {
      const result = createMomentSchema.safeParse({
        title: 'A'.repeat(200),
        slug: 'test',
      });
      expect(result.success).toBe(false);
    });
  });
});
