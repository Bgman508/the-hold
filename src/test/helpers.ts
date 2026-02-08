/**
 * Test Helpers for THE HOLD
 * 
 * Utility functions for testing common scenarios.
 */

import { vi } from 'vitest';

// ============================================
// Mock Data Generators
// ============================================

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a mock IP address
 */
export function generateMockIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(
    Math.random() * 256
  )}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

// ============================================
// Time Utilities
// ============================================

/**
 * Advance time by a specified duration
 */
export async function advanceTime(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await Promise.resolve();
}

/**
 * Wait for next tick
 */
export async function nextTick(): Promise<void> {
  return new Promise((resolve) => process.nextTick(resolve));
}

/**
 * Wait for all promises to resolve
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ============================================
// Mock Response Builders
// ============================================

/**
 * Create a mock NextResponse
 */
export function createMockNextResponse(data: any, status: number = 200) {
  return {
    status,
    json: async () => data,
    headers: new Map(),
  };
}

/**
 * Create a mock Request object
 */
export function createMockRequest(
  url: string = 'http://localhost:3000',
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Request {
  const { method = 'GET', headers = {}, body } = options;
  
  return {
    url,
    method,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone: () => createMockRequest(url, options),
  } as Request;
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that a function throws an error
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw but it did not');
  } catch (error: any) {
    if (expectedError) {
      if (expectedError instanceof RegExp) {
        expect(error.message).toMatch(expectedError);
      } else {
        expect(error.message).toContain(expectedError);
      }
    }
    return error;
  }
}

/**
 * Assert that a promise rejects with an error
 */
export async function expectToReject(
  promise: Promise<any>,
  expectedError?: string | RegExp
): Promise<Error> {
  try {
    await promise;
    throw new Error('Expected promise to reject but it did not');
  } catch (error: any) {
    if (expectedError) {
      if (expectedError instanceof RegExp) {
        expect(error.message).toMatch(expectedError);
      } else {
        expect(error.message).toContain(expectedError);
      }
    }
    return error;
  }
}

// ============================================
// Database Mock Helpers
// ============================================

/**
 * Setup mock database responses
 */
export function setupMockDbResponses(mockPrisma: any, responses: Record<string, any>) {
  Object.entries(responses).forEach(([method, response]) => {
    const [model, action] = method.split('.');
    if (mockPrisma[model] && mockPrisma[model][action]) {
      mockPrisma[model][action].mockResolvedValue(response);
    }
  });
}

/**
 * Clear all mock database calls
 */
export function clearMockDbCalls(mockPrisma: any) {
  Object.values(mockPrisma).forEach((model: any) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method: any) => {
        if (typeof method === 'function' && 'mockClear' in method) {
          method.mockClear();
        }
      });
    }
  });
}

// ============================================
// WebSocket Test Helpers
// ============================================

/**
 * Wait for WebSocket connection
 */
export async function waitForWSConnection(
  ws: WebSocket,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, timeout);

    if (ws.readyState === WebSocket.OPEN) {
      clearTimeout(timer);
      resolve();
      return;
    }

    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };

    ws.onerror = (error) => {
      clearTimeout(timer);
      reject(error);
    };
  });
}

/**
 * Wait for WebSocket message
 */
export async function waitForWSMessage(
  ws: WebSocket,
  timeout: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket message timeout'));
    }, timeout);

    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event) => {
      clearTimeout(timer);
      if (originalOnMessage) {
        originalOnMessage.call(ws, event);
      }
      try {
        resolve(JSON.parse(event.data));
      } catch {
        resolve(event.data);
      }
    };
  });
}

// ============================================
// Audio Test Helpers
// ============================================

/**
 * Wait for audio context to be ready
 */
export async function waitForAudioContext(
  audioContext: AudioContext,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AudioContext ready timeout'));
    }, timeout);

    if (audioContext.state === 'running') {
      clearTimeout(timer);
      resolve();
      return;
    }

    const checkState = () => {
      if (audioContext.state === 'running') {
        clearTimeout(timer);
        audioContext.onstatechange = null;
        resolve();
      }
    };

    audioContext.onstatechange = checkState;
  });
}

// ============================================
// Performance Test Helpers
// ============================================

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Run a load test
 */
export async function runLoadTest<T>(
  fn: () => Promise<T>,
  iterations: number,
  concurrency: number = 1
): Promise<{ results: T[]; avgDuration: number; minDuration: number; maxDuration: number }> {
  const results: T[] = [];
  const durations: number[] = [];

  const runBatch = async () => {
    const batchPromises: Promise<void>[] = [];
    
    for (let i = 0; i < concurrency; i++) {
      batchPromises.push(
        (async () => {
          for (let j = 0; j < iterations / concurrency; j++) {
            const { result, duration } = await measureExecutionTime(fn);
            results.push(result);
            durations.push(duration);
          }
        })()
      );
    }
    
    await Promise.all(batchPromises);
  };

  await runBatch();

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  return { results, avgDuration, minDuration, maxDuration };
}

// ============================================
// Security Test Helpers
// ============================================

/**
 * Generate SQL injection payloads
 */
export function getSqlInjectionPayloads(): string[] {
  return [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "1; DROP TABLE users--",
    "1 OR 1=1",
    "1' AND 1=(SELECT COUNT(*) FROM tablenames); --",
    "' OR '1'='1' /*",
    "') OR ('1'='1",
    "1'; EXEC sp_configure 'show advanced options', 1; --",
  ];
}

/**
 * Generate XSS payloads
 */
export function getXssPayloads(): string[] {
  return [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    "'-alert(1)-'",
    '<body onload=alert("xss")>',
  ];
}

/**
 * Generate NoSQL injection payloads
 */
export function getNoSqlInjectionPayloads(): string[] {
  return [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$regex": ".*"}',
    '{"$where": "this.password.length > 0"}',
    '{"$or": [{}, {"password": {"$gt": ""}}]}',
  ];
}

// ============================================
// Export all helpers
// ============================================

export default {
  generateUUID,
  generateRandomString,
  generateMockIP,
  advanceTime,
  nextTick,
  flushPromises,
  createMockNextResponse,
  createMockRequest,
  expectToThrow,
  expectToReject,
  setupMockDbResponses,
  clearMockDbCalls,
  waitForWSConnection,
  waitForWSMessage,
  waitForAudioContext,
  measureExecutionTime,
  runLoadTest,
  getSqlInjectionPayloads,
  getXssPayloads,
  getNoSqlInjectionPayloads,
};
