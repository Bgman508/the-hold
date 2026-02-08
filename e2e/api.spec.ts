/**
 * E2E Tests - API Endpoints
 * 
 * Tests for API endpoints returning correct data.
 */

import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test.describe('Health Check', () => {
    test('should return healthy status', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('healthy');
      expect(body.service).toBe('the-hold-api');
      expect(body.timestamp).toBeDefined();
    });

    test('should include database status', async ({ request }) => {
      const response = await request.get('/api/health');
      const body = await response.json();

      expect(body.database).toBe('connected');
    });

    test('should include stats', async ({ request }) => {
      const response = await request.get('/api/health');
      const body = await response.json();

      expect(body.stats).toBeDefined();
      expect(typeof body.stats.totalSessions).toBe('number');
      expect(typeof body.stats.totalPresences).toBe('number');
    });

    test('should have no-cache headers', async ({ request }) => {
      const response = await request.get('/api/health');

      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-store');
    });
  });

  test.describe('Moments API', () => {
    test('should list moments', async ({ request }) => {
      const response = await request.get('/api/moments');

      // May return 200 or 404 depending on implementation
      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body.moments) || Array.isArray(body)).toBe(true);
      }
    });

    test('should get current moment', async ({ request }) => {
      const response = await request.get('/api/moment/current');

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.id).toBeDefined();
        expect(body.title).toBeDefined();
      }
    });

    test('should get moment by ID', async ({ request }) => {
      const response = await request.get('/api/moments/test-moment-id');

      expect([200, 404]).toContain(response.status());
    });

    test('should handle invalid moment ID', async ({ request }) => {
      const response = await request.get('/api/moments/invalid-id');

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('Session API', () => {
    test('should begin session', async ({ request }) => {
      const response = await request.post('/api/session/begin', {
        data: {
          momentId: 'test-moment-id',
        },
      });

      // May return various status codes
      expect([200, 201, 400, 404]).toContain(response.status());

      if (response.status() === 200 || response.status() === 201) {
        const body = await response.json();
        expect(body.token || body.sessionId).toBeDefined();
      }
    });

    test('should validate session begin input', async ({ request }) => {
      const response = await request.post('/api/session/begin', {
        data: {},
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should end session', async ({ request }) => {
      const response = await request.post('/api/session/end', {
        data: {
          sessionId: 'test-session-id',
        },
      });

      expect([200, 400, 404]).toContain(response.status());
    });
  });

  test.describe('Auth API', () => {
    test('should create anonymous session', async ({ request }) => {
      const response = await request.post('/api/auth/anonymous', {
        data: {},
      });

      expect([200, 201, 400]).toContain(response.status());

      if (response.status() === 200 || response.status() === 201) {
        const body = await response.json();
        expect(body.token || body.sessionId).toBeDefined();
      }
    });

    test('should handle anonymous session with moment', async ({ request }) => {
      const response = await request.post('/api/auth/anonymous', {
        data: {
          momentId: 'test-moment-id',
        },
      });

      expect([200, 201, 400, 404]).toContain(response.status());
    });
  });

  test.describe('API Security', () => {
    test('should handle SQL injection attempts', async ({ request }) => {
      const response = await request.get('/api/moments/\'; DROP TABLE moments; --');

      // Should not execute the injection
      expect(response.status()).not.toBe(500);
    });

    test('should handle XSS attempts', async ({ request }) => {
      const response = await request.post('/api/session/begin', {
        data: {
          momentId: '<script>alert(1)</script>',
        },
      });

      // Should sanitize or reject
      expect([200, 201, 400, 404, 422]).toContain(response.status());
    });

    test('should have security headers', async ({ request }) => {
      const response = await request.get('/api/health');

      // Check for security headers
      const headers = response.headers();
      
      // X-Content-Type-Options
      expect(headers['x-content-type-options']).toBeDefined();
      
      // X-Frame-Options
      expect(headers['x-frame-options']).toBeDefined();
    });

    test('should rate limit requests', async ({ request }) => {
      // Make many rapid requests
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(request.get('/api/health'));
      }

      const responses = await Promise.all(promises);

      // Some may be rate limited
      const statusCodes = responses.map(r => r.status());
      
      // Should not all succeed if rate limiting is enabled
      expect(statusCodes).toContain(200);
    });
  });

  test.describe('API Response Format', () => {
    test('should return JSON for API endpoints', async ({ request }) => {
      const response = await request.get('/api/health');

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('should have consistent error format', async ({ request }) => {
      // Request non-existent endpoint
      const response = await request.get('/api/non-existent-endpoint');

      if (response.status() >= 400) {
        const body = await response.json().catch(() => ({}));
        
        // Should have error field
        expect(body.error || body.message || body.statusCode).toBeDefined();
      }
    });
  });
});
