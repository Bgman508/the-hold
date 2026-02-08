/**
 * Vitest Test Setup
 * 
 * Global test configuration, mocks, and utilities.
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// ============================================
// Environment Setup
// ============================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.IP_HASH_SECRET = 'test-ip-hash-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'file:./test.db';

// ============================================
// Mock Prisma Client
// ============================================

const mockPrismaClient = {
  moment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  presence: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $transaction: vi.fn((callback) => callback(mockPrismaClient)),
  $disconnect: vi.fn(),
  $connect: vi.fn(),
};

// Mock the prisma module
vi.mock('../lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Export for use in tests
export { mockPrismaClient };

// ============================================
// Mock WebSocket
// ============================================

export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private sentMessages: any[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { code, reason }));
    }, 0);
  }

  // Test helper methods
  getSentMessages(): any[] {
    return this.sentMessages;
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }

  simulateMessage(data: any): void {
    const messageEvent = new MessageEvent('message', {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    });
    this.onmessage?.(messageEvent);
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any;

// ============================================
// Mock AudioContext
// ============================================

export class MockAudioContext {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  currentTime = 0;
  destination = {
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    maxChannelCount: 2,
    numberOfInputs: 1,
    numberOfOutputs: 0,
  };

  onstatechange: ((this: AudioContext, ev: Event) => any) | null = null;

  constructor() {
    // Simulate time progression
    setInterval(() => {
      this.currentTime += 0.1;
    }, 100);
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    this.onstatechange?.(new Event('statechange'));
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.state = 'running';
    this.onstatechange?.(new Event('statechange'));
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    this.onstatechange?.(new Event('statechange'));
    return Promise.resolve();
  }

  createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode(this);
  }

  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode(this);
  }

  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ): AudioBuffer {
    return {
      length,
      duration: length / sampleRate,
      sampleRate,
      numberOfChannels,
      getChannelData: () => new Float32Array(length),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as AudioBuffer;
  }

  decodeAudioData(
    arrayBuffer: ArrayBuffer,
    successCallback?: (decodedData: AudioBuffer) => void,
    errorCallback?: ((err: DOMException) => void) | null
  ): Promise<AudioBuffer> {
    const buffer = this.createBuffer(2, 44100, 44100);
    successCallback?.(buffer);
    return Promise.resolve(buffer);
  }
}

export class MockOscillatorNode {
  context: MockAudioContext;
  type: OscillatorType = 'sine';
  frequency = { value: 440, setValueAtTime: vi.fn() };
  detune = { value: 0, setValueAtTime: vi.fn() };
  
  onended: ((this: AudioScheduledSourceNode, ev: Event) => any) | null = null;

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect(destination: any): any {
    return destination;
  }

  disconnect(): void {}

  start(when?: number): void {}

  stop(when?: number): void {
    setTimeout(() => {
      this.onended?.(new Event('ended'));
    }, 0);
  }
}

export class MockGainNode {
  context: MockAudioContext;
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect(destination: any): any {
    return destination;
  }

  disconnect(): void {}
}

export class MockAudioBufferSourceNode {
  context: MockAudioContext;
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1, setValueAtTime: vi.fn() };
  
  onended: ((this: AudioScheduledSourceNode, ev: Event) => any) | null = null;

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect(destination: any): any {
    return destination;
  }

  disconnect(): void {}

  start(when?: number, offset?: number, duration?: number): void {}

  stop(when?: number): void {
    setTimeout(() => {
      this.onended?.(new Event('ended'));
    }, 0);
  }
}

// Mock AudioContext globally
global.AudioContext = MockAudioContext as any;
global.OfflineAudioContext = MockAudioContext as any;

// ============================================
// Mock fetch
// ============================================

global.fetch = vi.fn();

// ============================================
// Mock localStorage
// ============================================

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ============================================
// Mock sessionStorage
// ============================================

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// ============================================
// Mock navigator
// ============================================

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Environment)',
    onLine: true,
    connection: {
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  },
  writable: true,
});

// ============================================
// Mock window
// ============================================

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    location: {
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    history: {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
    },
    matchMedia: vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    cancelAnimationFrame: vi.fn((id) => clearTimeout(id)),
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
  },
  writable: true,
});

// ============================================
// Mock document
// ============================================

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tag) => ({
      tagName: tag.toUpperCase(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn(),
      },
      style: {},
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      click: vi.fn(),
    })),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    getElementById: vi.fn(),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// ============================================
// Console Suppression in Tests
// ============================================

// Suppress console methods during tests (optional)
const originalConsole = { ...console };

beforeAll(() => {
  // You can uncomment these to suppress console output during tests
  // console.log = vi.fn();
  // console.info = vi.fn();
  // console.warn = vi.fn();
  // console.error = vi.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// ============================================
// Global Test Hooks
// ============================================

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset mock implementations
  mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  
  // Reset fetch mock
  (global.fetch as any).mockReset();
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllTimers();
});

// ============================================
// Test Utilities
// ============================================

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock JWT token
 */
export function createMockJWT(payload: object, secret: string = 'test-secret'): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa(`${header}.${body}.${secret}`);
  return `${header}.${body}.${signature}`;
}

/**
 * Create a mock moment object
 */
export function createMockMoment(overrides: Partial<any> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Moment',
    description: 'A test moment for testing',
    slug: 'test-moment',
    status: 'live',
    maxParticipants: 100,
    duration: 3600,
    isPublic: true,
    totalSessions: 0,
    totalMinutesPresent: 0,
    peakPresence: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock session object
 */
export function createMockSession(overrides: Partial<any> = {}) {
  return {
    id: '660e8400-e29b-41d4-a716-446655440001',
    momentId: '550e8400-e29b-41d4-a716-446655440000',
    token: 'mock-session-token',
    userAgent: 'Test User Agent',
    ipHash: 'mock-ip-hash',
    startedAt: new Date(),
    endedAt: null,
    durationSeconds: 0,
    ...overrides,
  };
}

/**
 * Create a mock presence object
 */
export function createMockPresence(overrides: Partial<any> = {}) {
  return {
    id: '770e8400-e29b-41d4-a716-446655440002',
    socketId: 'socket-123',
    sessionId: '660e8400-e29b-41d4-a716-446655440001',
    momentId: '550e8400-e29b-41d4-a716-446655440000',
    connectedAt: new Date(),
    lastHeartbeatAt: new Date(),
    ...overrides,
  };
}

// ============================================
// Export Vitest utilities
// ============================================

export { vi, expect, describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
