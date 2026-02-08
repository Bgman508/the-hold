/**
 * Input Validation for THE HOLD
 * 
 * Security Features:
 * - Zod schemas for all inputs
 * - SQL injection protection (via Prisma + validation)
 * - XSS prevention through sanitization
 * - No PII validation patterns
 * - Strict type enforcement
 */

import { z } from 'zod';

// ============================================================================
// SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script/event handlers
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Normalize whitespace
    .trim();
}

/**
 * Sanitize ID strings (UUIDs, slugs, etc.)
 */
export function sanitizeId(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .substring(0, 128);
}

/**
 * Check for SQL injection patterns
 * Note: Prisma provides protection, this is defense in depth
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION\s+SELECT/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /DROP\s+TABLE/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for NoSQL injection patterns
 */
export function containsNoSqlInjection(input: string): boolean {
  const nosqlPatterns = [
    /\$where/i,
    /\$regex/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$gte/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$or/i,
    /\$and/i,
  ];
  
  return nosqlPatterns.some(pattern => pattern.test(input));
}

// ============================================================================
// ZOD CUSTOM VALIDATORS
// ============================================================================

/**
 * Custom Zod string validator with sanitization
 */
const sanitizedString = (maxLength: number = 255) =>
  z.string()
    .transform(val => sanitizeString(val))
    .refine(val => !containsSqlInjection(val), {
      message: 'Invalid characters detected',
    })
    .refine(val => !containsNoSqlInjection(val), {
      message: 'Invalid characters detected',
    })
    .refine(val => val.length <= maxLength, {
      message: `Must be ${maxLength} characters or less`,
    });

/**
 * UUID validator
 */
const uuidSchema = z.string().uuid();

/**
 * Safe ID validator (alphanumeric, hyphens, underscores)
 */
const safeIdSchema = z.string()
  .regex(/^[a-zA-Z0-9-_]+$/, 'ID must be alphanumeric with hyphens/underscores only')
  .max(128);

/**
 * Timestamp validator
 */
const timestampSchema = z.number()
  .int()
  .min(0)
  .max(9999999999999); // Reasonable future timestamp

// ============================================================================
// MOMENT SCHEMAS
// ============================================================================

/**
 * Create moment schema (Council only)
 */
export const createMomentSchema = z.object({
  title: sanitizedString(100)
    .min(1, 'Title is required')
    .refine(val => val.length >= 2, {
      message: 'Title must be at least 2 characters',
    }),
  
  description: sanitizedString(500)
    .optional()
    .default(''),
  
  slug: safeIdSchema
    .min(1, 'Slug is required')
    .refine(val => /^[a-z0-9-]+$/.test(val), {
      message: 'Slug must be lowercase alphanumeric with hyphens only',
    }),
  
  maxParticipants: z.number()
    .int()
    .min(2, 'Minimum 2 participants')
    .max(1000, 'Maximum 1000 participants')
    .default(100),
  
  duration: z.number()
    .int()
    .min(60, 'Minimum 60 seconds')
    .max(86400, 'Maximum 24 hours')
    .default(3600), // 1 hour default
  
  isPublic: z.boolean().default(true),
  
  metadata: z.record(z.unknown())
    .optional()
    .default({})
    .refine(val => {
      // Prevent nested objects that could be abused
      const size = JSON.stringify(val).length;
      return size <= 4096; // 4KB limit
    }, {
      message: 'Metadata must be 4KB or less',
    }),
});

export type CreateMomentInput = z.infer<typeof createMomentSchema>;

/**
 * Update moment schema (Council only)
 */
export const updateMomentSchema = z.object({
  title: sanitizedString(100).optional(),
  description: sanitizedString(500).optional(),
  maxParticipants: z.number().int().min(2).max(1000).optional(),
  duration: z.number().int().min(60).max(86400).optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateMomentInput = z.infer<typeof updateMomentSchema>;

/**
 * Moment ID parameter schema
 */
export const momentIdSchema = z.object({
  id: uuidSchema,
});

/**
 * Moment slug parameter schema
 */
export const momentSlugSchema = z.object({
  slug: safeIdSchema,
});

/**
 * Activate moment schema (Council only)
 */
export const activateMomentSchema = z.object({
  momentId: uuidSchema,
  activateAt: timestampSchema.optional(), // Unix timestamp, optional (immediate if not provided)
});

export type ActivateMomentInput = z.infer<typeof activateMomentSchema>;

/**
 * Deactivate moment schema (Council only)
 */
export const deactivateMomentSchema = z.object({
  momentId: uuidSchema,
  reason: sanitizedString(200).optional(),
});

export type DeactivateMomentInput = z.infer<typeof deactivateMomentSchema>;

// ============================================================================
// USER/AUTH SCHEMAS
// ============================================================================

/**
 * Anonymous session creation schema
 */
export const createAnonymousSessionSchema = z.object({
  momentId: uuidSchema.nullable().optional(),
  clientInfo: z.object({
    // Only store non-identifying info
    screenSize: z.enum(['small', 'medium', 'large']).optional(),
    timezone: z.string().max(50).optional(),
  }).optional(),
});

export type CreateAnonymousSessionInput = z.infer<typeof createAnonymousSessionSchema>;

/**
 * Authenticated login schema (Council only for MVP)
 */
export const loginSchema = z.object({
  // No email - use secure token or key-based auth
  accessKey: z.string()
    .min(32, 'Invalid access key')
    .max(256, 'Invalid access key')
    .refine(val => !containsSqlInjection(val), {
      message: 'Invalid access key format',
    }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// WEBSOCKET SCHEMAS
// ============================================================================

/**
 * WebSocket connection request schema
 */
export const wsConnectionSchema = z.object({
  token: z.string().min(1, 'Token required'),
  momentId: uuidSchema.optional(),
});

export type WsConnectionInput = z.infer<typeof wsConnectionSchema>;

/**
 * WebSocket message schema (base)
 */
export const wsMessageSchema = z.object({
  type: z.enum([
    'join',
    'leave',
    'signal',
    'heartbeat',
    'status',
  ]),
  payload: z.unknown(),
  timestamp: timestampSchema.optional(),
});

export type WsMessageInput = z.infer<typeof wsMessageSchema>;

/**
 * WebRTC signal schema
 */
export const webrtcSignalSchema = z.object({
  type: z.enum(['offer', 'answer', 'ice-candidate']),
  targetSessionId: safeIdSchema,
  data: z.unknown(), // Validated separately based on signal type
});

export type WebrtcSignalInput = z.infer<typeof webrtcSignalSchema>;

// ============================================================================
// API QUERY SCHEMAS
// ============================================================================

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).default(1)),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100).default(20)),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * List moments query schema
 */
export const listMomentsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  sortBy: z.enum(['createdAt', 'title', 'participantCount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ListMomentsQueryInput = z.infer<typeof listMomentsQuerySchema>;

// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

/**
 * Audit log entry schema (internal validation)
 */
export const auditLogEntrySchema = z.object({
  action: z.enum([
    'moment.create',
    'moment.update',
    'moment.activate',
    'moment.deactivate',
    'moment.delete',
    'auth.login',
    'auth.logout',
    'auth.session_created',
    'system.config_update',
  ]),
  actorId: safeIdSchema,
  actorRole: z.enum(['council', 'architect', 'community', 'anonymous', 'system']),
  resourceType: z.enum(['moment', 'user', 'system', 'session']),
  resourceId: safeIdSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  ipHash: safeIdSchema.optional(), // Hashed IP, no PII
  timestamp: timestampSchema,
});

export type AuditLogEntryInput = z.infer<typeof auditLogEntrySchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate input against schema
 * Returns parsed data or throws validation error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation - returns result instead of throwing
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatValidationErrors(error: z.ZodError): Array<{
  path: string;
  message: string;
}> {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

// ============================================================================
// MIDDLEWARE VALIDATORS
// ============================================================================

/**
 * Create validation middleware for API routes
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: Request): Promise<T> => {
    try {
      const body = await req.json();
      return validate(schema, body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(formatValidationErrors(error));
      }
      throw new ValidationError([{ path: 'body', message: 'Invalid JSON' }]);
    }
  };
}

/**
 * Create validation middleware for query params
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request): T => {
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    try {
      return validate(schema, params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(formatValidationErrors(error));
      }
      throw error;
    }
  };
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(public errors: Array<{ path: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Sanitization
  sanitizeString,
  sanitizeId,
  containsSqlInjection,
  containsNoSqlInjection,
  
  // Validation functions
  validate,
  safeValidate,
  formatValidationErrors,
  validateBody,
  validateQuery,
  ValidationError,
  
  // Schemas
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
};
