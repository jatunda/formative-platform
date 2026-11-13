import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname, relative } from 'path';

// Browsers can silently block confirm(), leaving a button looking dead, so the
// app asks through the in-app dialog (confirm-dialog.js) instead. This keeps
// any browser confirm() from creeping back into the app's own code.
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKIPPED_DIRS = new Set(['node_modules', '__tests__', 'coverage', 'dist', 'scripts']);

/** Every app .js file under `dir`, skipping tests, tooling and dependencies. */
function appSources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIPPED_DIRS.has(entry.name) || entry.name.startsWith('.') ? [] : appSources(resolve(dir, entry.name));
    }
    return entry.name.endsWith('.js') ? [resolve(dir, entry.name)] : [];
  });
}

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('browser confirm()', () => {
  it('is not called anywhere in the app', () => {
    const found = appSources(webDir).flatMap((file) =>
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .flatMap((line, i) => (/(^|[^\w.])confirm\(|window\.confirm\(/.test(line) ? [`${relative(webDir, file)}:${i + 1}: ${line.trim()}`] : [])));
    expect(found).toEqual([]);
  });
});
