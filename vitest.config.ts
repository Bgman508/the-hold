/**
 * Vitest Configuration for THE HOLD
 * 
 * Configures test environment, coverage, and setup for unit and integration tests.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node', // Default environment
    
    // Global test configuration
    globals: true,
    
    // Setup files to run before tests
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        'prisma/',
        'e2e/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    
    // Test file patterns
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.spec.ts',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'e2e/',
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Enable type checking in tests
    typecheck: {
      enabled: true,
      checker: 'tsc',
    },
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Fail fast on first failure in CI
    bail: process.env.CI ? 1 : 0,
  },
  
  // Resolve aliases to match Next.js config
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@types': path.resolve(__dirname, './src/types'),
      '@app': path.resolve(__dirname, './src/app'),
      '@websocket': path.resolve(__dirname, './src/websocket'),
    },
  },
  
  // ESBuild configuration
  esbuild: {
    target: 'node18',
  },
});
