import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js':
        resolve(__dirname, '__tests__/helpers/mock-firebase-module.js'),
      'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js':
        resolve(__dirname, '__tests__/helpers/mock-firebase-module.js'),
    },
  },
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',
    // Glob patterns for test files
    include: ['**/__tests__/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**', '**/__tests__/helpers/**'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/__tests__/**',
        '**/*.config.js',
        '**/*.config.mjs',
        '**/firebase-config.js',
        '**/ai-config.js',
        '**/ai-config.template.js',
      ],
      // A ratcheting floor, not an aspirational target: set just under
      // today's actual coverage (~89.7%), so this catches regressions
      // without leaving CI permanently red. Raise these numbers as real
      // coverage work lands.
      thresholds: {
        lines: 86,
        functions: 84,
        branches: 89,
        statements: 86,
      },
    },
    // Setup files
    setupFiles: ['__tests__/helpers/setup.js'],
    // Global test timeout
    testTimeout: 10000,
  },
});

