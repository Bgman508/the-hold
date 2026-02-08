/**
 * Vitest Integration Test Configuration
 * 
 * Separate configuration for integration tests that require database.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use node environment for integration tests
    environment: 'node',
    
    // Global test configuration
    globals: true,
    
    // Setup files
    setupFiles: ['./src/test/setup-integration.ts'],
    
    // Test file patterns for integration tests
    include: [
      'src/__tests__/integration/**/*.test.ts',
      'src/__tests__/integration/**/*.spec.ts',
    ],
    
    // Exclude unit tests
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'e2e/',
      'src/__tests__/lib/',
      'src/__tests__/types/',
      'src/__tests__/websocket/',
    ],
    
    // Test timeout (longer for integration tests)
    testTimeout: 30000,
    
    // Hook timeout
    hookTimeout: 30000,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Fail fast
    bail: 1,
    
    // Run tests sequentially (for database safety)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  
  // Resolve aliases
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
