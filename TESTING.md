# THE HOLD - Test Suite Documentation

## Overview

This document describes the comprehensive test suite for THE HOLD MVP, including unit tests, integration tests, and E2E tests.

## Test Structure

```
├── src/__tests__/           # Unit and integration tests
│   ├── lib/                 # Library unit tests
│   │   ├── session.test.ts
│   │   ├── rate-limiter.test.ts
│   │   └── validation.test.ts
│   ├── types/               # Type definition tests
│   │   └── rbac.test.ts
│   ├── websocket/           # WebSocket tests
│   │   └── presence-service.test.ts
│   └── integration/         # Integration tests
│       └── api.test.ts
├── e2e/                     # E2E tests
│   ├── home.spec.ts
│   ├── moment.spec.ts
│   ├── audio.spec.ts
│   ├── websocket.spec.ts
│   ├── error-handling.spec.ts
│   ├── api.spec.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
├── src/test/                # Test utilities
│   ├── setup.ts
│   ├── setup-integration.ts
│   └── helpers.ts
├── vitest.config.ts         # Vitest configuration
├── vitest.integration.config.ts
├── playwright.config.ts     # Playwright configuration
└── .github/workflows/ci.yml # CI/CD workflow
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with watch mode
npm run test:unit:watch

# Run with coverage
npm run test:unit:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests

```bash
# Install Playwright browsers
npm run playwright:install

# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/home.spec.ts
```

### All Tests

```bash
# Run all tests (unit + e2e)
npm test
```

## Test Coverage

### Unit Test Coverage

- **Session Management**: Session creation, validation, ending, cleanup
- **Rate Limiting**: Sliding window, blocking, abuse detection
- **RBAC**: Permission checking, role hierarchy, guards
- **Validation**: Zod schemas, sanitization, security
- **Presence Service**: Join/leave, heartbeat, broadcasting

### E2E Test Coverage

- **Home Page**: Loading, responsiveness, console errors
- **Moment Entry**: Navigation, presence count, leaving
- **Multi-Tab Presence**: Real-time updates across tabs
- **Audio**: Playback, controls, state management
- **WebSocket**: Connection, reconnection, offline handling
- **Error Handling**: 404, 500, JS errors, network errors
- **API Endpoints**: Health check, moments, sessions

## CI/CD Pipeline

The CI pipeline runs on every push to `main` or `develop` branches and on pull requests:

1. **Lint & Type Check**: ESLint and TypeScript validation
2. **Unit Tests**: Vitest with coverage reporting
3. **Integration Tests**: Database-backed integration tests
4. **E2E Tests**: Playwright across multiple browsers
5. **Security Audit**: npm audit and Snyk scan
6. **Build Check**: Production build verification

### Pipeline Jobs

| Job | Description | Dependencies |
|-----|-------------|--------------|
| lint-and-typecheck | ESLint + TypeScript | - |
| unit-tests | Vitest unit tests | lint-and-typecheck |
| integration-tests | Database integration | unit-tests |
| e2e-tests | Playwright E2E | integration-tests |
| security-audit | npm audit + Snyk | lint-and-typecheck |
| build-check | Production build | lint-and-typecheck, unit-tests |
| performance-tests | Lighthouse CI | build-check |
| deploy-preview | Vercel preview | build-check, e2e-tests |

## Test Utilities

### Mock Objects

- `MockWebSocket`: Simulates WebSocket connections
- `MockAudioContext`: Simulates Web Audio API
- `mockPrismaClient`: Mock database client

### Helper Functions

- `createMockMoment()`: Generate mock moment data
- `createMockSession()`: Generate mock session data
- `createMockPresence()`: Generate mock presence data
- `waitForWSConnection()`: Wait for WebSocket connection
- `waitForWSMessage()`: Wait for WebSocket message
- `getSqlInjectionPayloads()`: SQL injection test payloads
- `getXssPayloads()`: XSS test payloads

## Environment Variables

### Test Environment

```bash
NODE_ENV=test
DATABASE_URL=file:./test.db
JWT_SECRET=test-jwt-secret
IP_HASH_SECRET=test-ip-hash-secret
```

### CI Environment

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/the_hold_test
JWT_SECRET=test-jwt-secret-for-ci
IP_HASH_SECRET=test-ip-hash-secret-for-ci
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-module';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe('expected');
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should load page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/THE HOLD/i);
});
```

## Debugging Tests

### Unit Tests

```bash
# Debug specific test
npx vitest run --reporter=verbose src/__tests__/lib/session.test.ts

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run
```

### E2E Tests

```bash
# Debug mode
npm run test:e2e:debug

# UI mode
npm run test:e2e:ui

# Generate test code
npm run playwright:codegen
```

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure DATABASE_URL is set correctly
2. **Playwright browser not found**: Run `npm run playwright:install`
3. **Port already in use**: Kill processes on port 3000 or change port
4. **Coverage not generating**: Ensure @vitest/coverage-v8 is installed

### Getting Help

- Check test logs for detailed error messages
- Review screenshots in `test-results/` for E2E failures
- Check coverage report in `coverage/` directory

## Best Practices

1. **Write tests first**: Follow TDD when possible
2. **Test behavior, not implementation**: Focus on what, not how
3. **Use descriptive test names**: Clear intent in test descriptions
4. **Keep tests independent**: No shared state between tests
5. **Mock external dependencies**: Use mocks for database, APIs, etc.
6. **Test edge cases**: Empty inputs, errors, boundaries
7. **Maintain test coverage**: Aim for 70%+ coverage on critical paths
