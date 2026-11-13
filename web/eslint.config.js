import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      // Unused parameters are mostly stubs and callbacks matching a signature;
      // rest siblings drop a key on purpose (e.g. a state saved before it existed).
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
      // Browsers can silently block confirm(), leaving a button looking dead:
      // ask through the in-app dialog (confirm-dialog.js) instead.
      'no-restricted-globals': ['error', { name: 'confirm', message: 'Use showConfirm from confirm-dialog.js.' }],
      'no-restricted-properties': ['error', { object: 'window', property: 'confirm', message: 'Use showConfirm from confirm-dialog.js.' }],
      // Database writes go through the database modules (*database-utils.js,
      // realtime-store.js), so each path has one writer with its error handling.
      'no-restricted-imports': ['error', {
        // Any Firebase version, so an upgrade can't quietly switch this off.
        patterns: [{
          regex: 'firebasejs/[^/]+/firebase-database\\.js$',
          importNames: ['set', 'update', 'push', 'remove', 'runTransaction'],
          message: 'Write through a *database-utils.js helper (or add one there).',
        }],
      }],
    },
  },
  {
    files: ['*database-utils.js', 'realtime-store.js'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['__tests__/**', '*.config.js', 'scripts/**'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tests stub the browser's confirm to prove the app never calls it.
    files: ['__tests__/**'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
];
