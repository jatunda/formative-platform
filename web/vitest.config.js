import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ai-config.js holds a real API key, so it's gitignored and absent from CI
// and fresh worktrees. Tests only need its shape: fall back to the template.
const aiConfigFallback = existsSync(resolve(__dirname, 'ai-config.js'))
  ? []
  : [{ find: /^(\.{1,2}\/)+ai-config\.js$/, replacement: resolve(__dirname, 'ai-config.template.js') }];

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js',
        replacement: resolve(__dirname, '__tests__/helpers/mock-firebase-module.js'),
      },
      {
        find: 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js',
        replacement: resolve(__dirname, '__tests__/helpers/mock-firebase-module.js'),
      },
      ...aiConfigFallback,
    ],
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
      // Wide enough that long file names aren't cut to "...name.js", so a
      // search for a file name finds its row.
      reporter: [['text', { maxCols: 200 }], 'json', 'html'],
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

