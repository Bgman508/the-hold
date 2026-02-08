/**
 * Audit Logging for THE HOLD
 * 
 * Security Principles:
 * - Log all governance actions
 * - No PII in logs (hashed IPs only)
 * - Immutable audit trail
 * - Structured logging for analysis
 * - Anonymous-first design
 */

import { hashIpAddress } from '@/middleware/auth';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Audit action types
 * All actions that should be logged
 */
export enum AuditAction {
  // Moment governance
  MOMENT_CREATE = 'moment.create',
  MOMENT_UPDATE = 'moment.update',
  MOMENT_ACTIVATE = 'moment.activate',
  MOMENT_DEACTIVATE = 'moment.deactivate',
  MOMENT_DELETE = 'moment.delete',
  
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_SESSION_CREATED = 'auth.session_created',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',
  AUTH_FAILED = 'auth.failed',
  
  // Access
  ACCESS_MOMENT_ENTER = 'access.moment_enter',
  ACCESS_MOMENT_LEAVE = 'access.moment_leave',
  
  // System
  SYSTEM_CONFIG_UPDATE = 'system.config_update',
  SYSTEM_RATE_LIMIT_TRIGGERED = 'system.rate_limit_triggered',
  SYSTEM_ABUSE_DETECTED = 'system.abuse_detected',
  
  // Council governance
  COUNCIL_GRANT_ROLE = 'council.grant_role',
  COUNCIL_REVOKE_ROLE = 'council.revoke_role',
  COUNCIL_VIEW_AUDIT = 'council.view_audit',
}

/**
 * Actor role types
 */
export enum AuditActorRole {
  COUNCIL = 'council',
  ARCHITECT = 'architect',
  COMMUNITY = 'community',
  ANONYMOUS = 'anonymous',
  SYSTEM = 'system',
}

/**
 * Resource types
 */
export enum AuditResourceType {
  MOMENT = 'moment',
  USER = 'user',
  SYSTEM = 'system',
  SESSION = 'session',
  CONFIG = 'config',
}

/**
 * Audit log entry structure
 * NO PII - only hashed identifiers
 */
export interface AuditLogEntry {
  // Unique entry ID
  id: string;
  
  // Action performed
  action: AuditAction;
  
  // Actor information (no PII)
  actor: {
    id: string; // Hashed or internal ID
    role: AuditActorRole;
    type: 'authenticated' | 'anonymous' | 'system';
  };
  
  // Resource affected
  resource: {
    type: AuditResourceType;
    id?: string; // Resource ID (moment ID, etc.)
  };
  
  // Action metadata (structured, no PII)
  metadata: Record<string, unknown>;
  
  // Client information (hashed, no PII)
  client?: {
    ipHash: string; // SHA-256 hash of IP
    userAgentHash?: string; // Hash of user agent string
  };
  
  // Timing
  timestamp: Date;
  processedAt?: Date;
  
  // Integrity
  hash?: string; // For tamper detection (future implementation)
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
  actions?: AuditAction[];
  actorRoles?: AuditActorRole[];
  resourceTypes?: AuditResourceType[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Audit configuration
 */
const AUDIT_CONFIG = {
  // Log levels
  console: process.env.NODE_ENV === 'development',
  database: true,
  
  // Retention (days)
  retentionDays: 365,
  
  // Batch settings
  batchSize: 100,
  flushIntervalMs: 5000,
  
  // Sensitive actions that require immediate persistence
  immediateActions: [
    AuditAction.MOMENT_CREATE,
    AuditAction.MOMENT_ACTIVATE,
    AuditAction.MOMENT_DEACTIVATE,
    AuditAction.MOMENT_DELETE,
    AuditAction.COUNCIL_GRANT_ROLE,
    AuditAction.COUNCIL_REVOKE_ROLE,
    AuditAction.SYSTEM_ABUSE_DETECTED,
  ],
};

// ============================================================================
// IN-MEMORY BUFFER (Production: Use persistent store)
// ============================================================================

/**
 * Audit log buffer for batching
 * Production: Replace with Redis queue or message broker
 */
class AuditBuffer {
  private buffer: AuditLogEntry[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  add(entry: AuditLogEntry): void {
    this.buffer.push(entry);

    // Immediate flush for sensitive actions
    if (AUDIT_CONFIG.immediateActions.includes(entry.action)) {
      this.flush();
      return;
    }

    // Schedule batch flush
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        this.flush();
      }, AUDIT_CONFIG.flushIntervalMs);
    }

    // Flush if buffer is full
    if (this.buffer.length >= AUDIT_CONFIG.batchSize) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Persist entries
    persistEntries(entries);
  }

  getPendingCount(): number {
    return this.buffer.length;
  }
}

const auditBuffer = new AuditBuffer();

// ============================================================================
// PERSISTENCE (Production: Replace with database)
// ============================================================================

/**
 * Persist audit entries
 * Production: Implement with database (Prisma)
 */
async function persistEntries(entries: AuditLogEntry[]): Promise<void> {
  // Console logging for development
  if (AUDIT_CONFIG.console) {
    entries.forEach(entry => {
      console.log('[AUDIT]', JSON.stringify(entry, null, 2));
    });
  }

  // Database persistence (production)
  if (AUDIT_CONFIG.database) {
    try {
      // TODO: Implement with Prisma
      // await prisma.auditLog.createMany({ data: entries });
      
      // Mark as processed
      entries.forEach(entry => {
        entry.processedAt = new Date();
      });
    } catch (error) {
      console.error('[AUDIT] Failed to persist entries:', error);
      // TODO: Implement retry logic or dead letter queue
    }
  }
}

// ============================================================================
// ENTRY GENERATION
// ============================================================================

/**
 * Generate unique audit entry ID
 */
function generateEntryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `audit_${timestamp}_${random}`;
}

/**
 * Create audit log entry
 * All parameters must be PII-free
 */
export function createAuditEntry(
  action: AuditAction,
  actor: {
    id: string;
    role: AuditActorRole;
    type: 'authenticated' | 'anonymous' | 'system';
  },
  resource: {
    type: AuditResourceType;
    id?: string;
  },
  metadata: Record<string, unknown> = {},
  clientInfo?: {
    ip?: string;
    userAgent?: string;
  }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateEntryId(),
    action,
    actor,
    resource,
    metadata: sanitizeMetadata(metadata),
    timestamp: new Date(),
  };

  // Add hashed client info if provided
  if (clientInfo) {
    entry.client = {
      ipHash: clientInfo.ip ? hashIpAddress(clientInfo.ip) : 'unknown',
    };
    
    if (clientInfo.userAgent) {
      // Hash user agent - only store hash, not actual string
      const crypto = require('crypto');
      entry.client.userAgentHash = crypto
        .createHash('sha256')
        .update(clientInfo.userAgent)
        .digest('hex')
        .substring(0, 16);
    }
  }

  return entry;
}

/**
 * Sanitize metadata to ensure no PII
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Skip potential PII fields
    if (isPiiField(key)) {
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if field name indicates PII
 */
function isPiiField(key: string): boolean {
  const piiPatterns = [
    /email/i,
    /phone/i,
    /name/i,
    /address/i,
    /ssn/i,
    /password/i,
    /token/i,
    /secret/i,
    /credit/i,
    /card/i,
    /ip/i,
    /location/i,
    /coordinate/i,
    /geo/i,
  ];
  
  return piiPatterns.some(pattern => pattern.test(key));
}

/**
 * Sanitize string for audit log
 */
function sanitizeString(input: string): string {
  // Limit length
  const maxLength = 1000;
  let sanitized = input.substring(0, maxLength);
  
  // Remove potential PII patterns
  // Email patterns
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  
  // Phone patterns (basic)
  sanitized = sanitized.replace(/\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
  
  return sanitized;
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Log a governance action
 */
export function logGovernanceAction(
  action: AuditAction.MOMENT_CREATE | AuditAction.MOMENT_ACTIVATE | 
          AuditAction.MOMENT_DEACTIVATE | AuditAction.MOMENT_DELETE |
          AuditAction.MOMENT_UPDATE,
  actorId: string,
  actorRole: AuditActorRole,
  momentId: string,
  metadata: Record<string, unknown> = {},
  clientInfo?: { ip?: string; userAgent?: string }
): void {
  const entry = createAuditEntry(
    action,
    {
      id: actorId,
      role: actorRole,
      type: actorRole === AuditActorRole.ANONYMOUS ? 'anonymous' : 'authenticated',
    },
    {
      type: AuditResourceType.MOMENT,
      id: momentId,
    },
    metadata,
    clientInfo
  );

  auditBuffer.add(entry);
}

/**
 * Log authentication action
 */
export function logAuthAction(
  action: AuditAction.AUTH_LOGIN | AuditAction.AUTH_LOGOUT | 
          AuditAction.AUTH_SESSION_CREATED | AuditAction.AUTH_FAILED,
  actorId: string,
  actorRole: AuditActorRole,
  metadata: Record<string, unknown> = {},
  clientInfo?: { ip?: string; userAgent?: string }
): void {
  const entry = createAuditEntry(
    action,
    {
      id: actorId,
      role: actorRole,
      type: actorRole === AuditActorRole.ANONYMOUS ? 'anonymous' : 'authenticated',
    },
    {
      type: AuditResourceType.SESSION,
    },
    metadata,
    clientInfo
  );

  auditBuffer.add(entry);
}

/**
 * Log moment access
 */
export function logMomentAccess(
  action: AuditAction.ACCESS_MOMENT_ENTER | AuditAction.ACCESS_MOMENT_LEAVE,
  sessionId: string,
  momentId: string,
  metadata: Record<string, unknown> = {},
  clientInfo?: { ip?: string; userAgent?: string }
): void {
  const entry = createAuditEntry(
    action,
    {
      id: sessionId,
      role: AuditActorRole.ANONYMOUS,
      type: 'anonymous',
    },
    {
      type: AuditResourceType.MOMENT,
      id: momentId,
    },
    metadata,
    clientInfo
  );

  auditBuffer.add(entry);
}

/**
 * Log system event
 */
export function logSystemEvent(
  action: AuditAction.SYSTEM_CONFIG_UPDATE | 
          AuditAction.SYSTEM_RATE_LIMIT_TRIGGERED |
          AuditAction.SYSTEM_ABUSE_DETECTED,
  metadata: Record<string, unknown> = {},
  clientInfo?: { ip?: string; userAgent?: string }
): void {
  const entry = createAuditEntry(
    action,
    {
      id: 'system',
      role: AuditActorRole.SYSTEM,
      type: 'system',
    },
    {
      type: AuditResourceType.SYSTEM,
    },
    metadata,
    clientInfo
  );

  auditBuffer.add(entry);
}

/**
 * Log council action
 */
export function logCouncilAction(
  action: AuditAction.COUNCIL_GRANT_ROLE | AuditAction.COUNCIL_REVOKE_ROLE |
          AuditAction.COUNCIL_VIEW_AUDIT,
  councilMemberId: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
  clientInfo?: { ip?: string; userAgent?: string }
): void {
  const entry = createAuditEntry(
    action,
    {
      id: councilMemberId,
      role: AuditActorRole.COUNCIL,
      type: 'authenticated',
    },
    {
      type: AuditResourceType.USER,
      id: targetId,
    },
    metadata,
    clientInfo
  );

  auditBuffer.add(entry);
}

// ============================================================================
// QUERY FUNCTIONS (Council only)
// ============================================================================

/**
 * Query audit logs (Council only)
 * Production: Implement with database query
 */
export async function queryAuditLogs(
  filter: AuditLogFilter
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  // TODO: Implement with Prisma
  // const where: Prisma.AuditLogWhereInput = {};
  
  // if (filter.actions) {
  //   where.action = { in: filter.actions };
  // }
  
  // if (filter.actorRoles) {
  //   where.actorRole = { in: filter.actorRoles };
  // }
  
  // if (filter.startDate || filter.endDate) {
  //   where.timestamp = {};
  //   if (filter.startDate) where.timestamp.gte = filter.startDate;
  //   if (filter.endDate) where.timestamp.lte = filter.endDate;
  // }
  
  // const [entries, total] = await Promise.all([
  //   prisma.auditLog.findMany({
  //     where,
  //     take: filter.limit || 100,
  //     skip: filter.offset || 0,
  //     orderBy: { timestamp: 'desc' },
  //   }),
  //   prisma.auditLog.count({ where }),
  // ]);
  
  // return { entries, total };
  
  // Placeholder for development
  return { entries: [], total: 0 };
}

/**
 * Get audit statistics (Council only)
 */
export async function getAuditStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEntries: number;
  actionCounts: Record<AuditAction, number>;
}> {
  // TODO: Implement with Prisma aggregation
  
  return {
    totalEntries: 0,
    actionCounts: {} as Record<AuditAction, number>,
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old audit logs
 * Should be run periodically (daily)
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - AUDIT_CONFIG.retentionDays);
  
  // TODO: Implement with Prisma
  // const result = await prisma.auditLog.deleteMany({
  //   where: {
  //     timestamp: {
  //       lt: cutoffDate,
  //     },
  //   },
  // });
  
  // return result.count;
  
  return 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  AuditAction,
  AuditActorRole,
  AuditResourceType,
  createAuditEntry,
  logGovernanceAction,
  logAuthAction,
  logMomentAccess,
  logSystemEvent,
  logCouncilAction,
  queryAuditLogs,
  getAuditStats,
  cleanupOldAuditLogs,
};
