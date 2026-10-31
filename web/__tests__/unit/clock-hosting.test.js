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

  it('links the clock styles by absolute path', () => {
    const html = readFileSync(resolve(clockDir, 'index.html'), 'utf8');
    expect(html).toContain('<link rel="stylesheet" href="/clock/clock.css" />');
  });

  describe('the ringing flash', () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    const tokens = readFileSync(resolve(clockDir, 'tokens.css'), 'utf8');
    const rule = (selector) => {
      const match = new RegExp(`${selector.replace(/[.-]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
      return match ? match[1] : '';
    };

    it('flashes fewer than 3 times a second (WCAG 2.3.1)', () => {
      const animation = /animation:\s*clock-ring-pulse\s+var\(--flash-period\)\s+steps\(1/
        .exec(rule('.clock-ringing--flash .clock-ring-flash'));
      expect(animation).not.toBeNull();
      const period = /--flash-period:\s*([\d.]+)(m?s)/.exec(tokens);
      const seconds = Number(period[1]) / (period[2] === 'ms' ? 1000 : 1);
      // One flash per animation cycle.
      expect(1 / seconds).toBeLessThan(3);
    });

    it('is a steady highlight under reduced motion, not a flash', () => {
      expect(rule('.clock-ring-flash')).not.toMatch(/animation/);
      const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
      expect(reduced).toMatch(/\.clock-ringing--flash \.clock-ring-flash\s*\{[^}]*animation:\s*none/);
    });

    it('is more than a colour change: it also draws a thick frame', () => {
      expect(rule('.clock-ring-flash')).toMatch(/box-shadow:\s*inset 0 0 0 var\(--ring-width, 14px\)/);
    });
  });

  it('keeps the page background in fullscreen', () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    // Without a background a fullscreen element shows the black backdrop through it.
    expect(css).toMatch(/#clockApp:fullscreen\s*\{[^}]*background:\s*var\(--bg\)/);
  });

  it('styles the page from the design tokens, loaded before the components, with the default theme on <html>', () => {
    const html = readFileSync(resolve(clockDir, 'index.html'), 'utf8');
    const tokens = html.indexOf('<link rel="stylesheet" href="/clock/tokens.css" />');
    expect(tokens).toBeGreaterThan(-1);
    expect(tokens).toBeLessThan(html.indexOf('/clock/clock.css'));
    expect(html).toMatch(/<html lang="en" data-mode="dark">/);
    const css = readFileSync(resolve(clockDir, 'tokens.css'), 'utf8');
    expect(css).toContain('--bg: #1e2836;');
    // The components name no colour of their own: every colour is a token.
    for (const sheet of ['clock.css', 'settings-drawer.css', 'alarm-editor.css']) {
      const components = readFileSync(resolve(clockDir, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(components).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      expect(html.indexOf(`/clock/${sheet}`)).toBeGreaterThan(tokens);
    }
  });

  it('ships no audio files: every sound is generated in the browser', () => {
    const audio = readdirSync(clockDir).filter((f) => /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(f));
    expect(audio).toEqual([]);
    const sources = readdirSync(clockDir).filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(resolve(clockDir, f), 'utf8'));
    expect(sources.filter((src) => /new Audio\(|\.mp3|\.wav|decodeAudioData/.test(src))).toEqual([]);
  });

  it('imports no Firebase or database module', () => {
    const imports = readdirSync(clockDir)
      .filter((f) => f.endsWith('.js'))
      .flatMap((f) => [...readFileSync(resolve(clockDir, f), 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]));
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.filter((path) => /firebase|database|date-utils/i.test(path))).toEqual([]);
  });
});
