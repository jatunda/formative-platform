import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname, relative } from 'path';

// `!important` wins by force rather than by a custom property the base rule
// reads (CODING_STANDARDS.md, "A state sets a custom property the base rule
// reads"). Like the coverage thresholds, these counts are a ratcheting floor:
// lower one when you remove an `!important`, never raise one to fit a new one.
const MAX_IMPORTANT = {
  'clock/clock.css': 1,
  'clock/mini-player.css': 1,
  'style.css': 73,
};

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SKIPPED_DIRS = new Set(['node_modules', '__tests__', 'coverage', 'dist']);

/** Every .css file under `dir`, relative to web/, skipping build output and dependencies. */
function stylesheets(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIPPED_DIRS.has(entry.name) || entry.name.startsWith('.') ? [] : stylesheets(resolve(dir, entry.name));
    }
    return entry.name.endsWith('.css') ? [relative(webDir, resolve(dir, entry.name)).replaceAll('\\', '/')] : [];
  });
}

const countImportant = (file) =>
  (readFileSync(resolve(webDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').match(/!important/g) || []).length;

describe('!important in stylesheets', () => {
  it.each(stylesheets(webDir))('%s does not add any', (file) => {
    expect(countImportant(file)).toBeLessThanOrEqual(MAX_IMPORTANT[file] ?? 0);
  });
});
