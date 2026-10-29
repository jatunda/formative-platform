import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

// jsdom's URL isn't Node's, so derive the folder from the file path instead.
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const clockDir = resolve(webDir, 'clock');
const firebase = JSON.parse(readFileSync(resolve(webDir, '../firebase.json'), 'utf8'));
const rewrites = firebase.hosting.rewrites;

describe('School Clock hosting', () => {
  it.each(['/clock', '/clock/'])('serves %s from a static page via a rewrite above the catch-all', (source) => {
    const index = rewrites.findIndex((r) => r.source === source);
    const catchAll = rewrites.findIndex((r) => r.source === '**');

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(catchAll);
    expect(rewrites[index]).toEqual({ source, destination: '/clock/index.html' });
    expect(existsSync(resolve(webDir, 'clock/index.html'))).toBe(true);
  });

  it('loads its script and styles by absolute path, so /clock with no trailing slash works', () => {
    const html = readFileSync(resolve(clockDir, 'index.html'), 'utf8');
    expect(html).toContain('<div id="clockApp"></div>');
    expect(html).toContain('<script type="module" src="/clock/clock.js"></script>');
    const relative = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((url) => !url.startsWith('/') && !url.startsWith('https://'));
    expect(relative).toEqual([]);
  });

  it('imports no Firebase or database module', () => {
    const imports = readdirSync(clockDir)
      .filter((f) => f.endsWith('.js'))
      .flatMap((f) => [...readFileSync(resolve(clockDir, f), 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]));
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.filter((path) => /firebase|database|date-utils/i.test(path))).toEqual([]);
  });
});
