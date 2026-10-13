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
    },
  },
  {
    files: ['__tests__/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
