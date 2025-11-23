import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js': 
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
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    // Setup files
    setupFiles: [],
    // Global test timeout
    testTimeout: 10000,
  },
});

