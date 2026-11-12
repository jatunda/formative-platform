import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

// jsdom's URL isn't Node's, so derive the folder from the file path instead.
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const clockDir = resolve(webDir, 'clock');
const firebase = JSON.parse(readFileSync(resolve(webDir, '../firebase.json'), 'utf8'));
const rewrites = firebase.hosting.rewrites;

/** The short layout's block (laptop corner, landscape phone) in a stylesheet. */
function shortLayout(css) {
  const start = css.indexOf('@media (max-height: 520px) {');
  return css.slice(start, css.slice(start).search(/\n\}\r?\n/) + start);
}

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

  it('eases the timer ring between ticks, but steps it under reduced motion', () => {
    const css = readFileSync(resolve(clockDir, 'timer.css'), 'utf8');
    expect(css).toMatch(/\.clock-ring__arc\s*\{[^}]*transition:\s*stroke-dasharray var\(--ring-tick\) linear/);
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)') + 1);
    expect(reduced).toMatch(/^[^@]*\.clock-ring__arc\s*\{[^}]*transition:\s*none/);
  });

  it('hides an Off-Hours line the Day Bar heading repeats, except in the short layout, which hides the bar', () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    // Hidden at the top level; shown again only in the short layout's block.
    expect(css).toMatch(/(^|\n)\.clock-line--in-bar\s*\{\s*display:\s*none;/);
    const short = shortLayout(css);
    expect(short).toMatch(/\n {2}\.clock-line--in-bar\s*\{\s*display:\s*block;/);
    expect(css.match(/\.clock-line--in-bar/g)).toHaveLength(2);
  });

  it("fits the screen to the visible height, so a phone's browser bars never hide the agenda's end", () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    // html, body and #clockApp are 100% (the visible height, with the bars);
    // 100vh is the height without them, so a screen that tall runs under them.
    expect(css).toMatch(/(^|\n)html,\s*body\s*\{[^}]*height:\s*100%;/);
    expect(css).toMatch(/(^|\n)#clockApp\s*\{[^}]*height:\s*100%;/);
    expect(css).toMatch(/(^|\n)\.clock-screen\s*\{[^}]*height:\s*100%;/);
    // On a phone, while the agenda and the sound prompt both show, the digits
    // also fit the visible height (svh), not the bars-hidden one (vh).
    expect(css).toMatch(/\.clock-screen:has\(\.clock-bar--day:not\(\[hidden\]\)\):has\(> \.clock-bottom > \.clock-sound-prompt:not\(\[hidden\]\)\)\s*\{\s*--type-digits:\s*\d+svh;/);
    // Nor may a panel's height reach for 100vh.
    for (const sheet of ['clock.css', 'settings-drawer.css', 'timer.css', 'look-sheet.css', 'alarm-editor.css']) {
      const rules = readFileSync(resolve(clockDir, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(rules, sheet).not.toMatch(/\b100vh\b/);
    }
  });

  it("shrinks the short layout's digits by the room the cycle hint and the simulated-time banner take, so the stage stays clear of the top bar and the line clear of the sound prompt", () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    const short = shortLayout(css);
    // Both the short layout's digit sizes (with and without the sound prompt) give the room back.
    const sizes = [...short.matchAll(/--type-digits:\s*([^;]+);/g)].map((m) => m[1]);
    expect(sizes).toHaveLength(2);
    expect(sizes.filter((size) => /var\(--hint-room\)/.test(size) && /var\(--banner-room\)/.test(size))).toHaveLength(2);
    // The rooms are set only while the hint or the banner is there.
    expect(short).toMatch(/\.clock-screen:has\(\.clock-readout > \.clock-cycle-hint:not\(\[hidden\]\)\)\s*\{\s*--hint-room:\s*\d+px;/);
    expect(short).toMatch(/\.clock-screen\.is-simulated\s*\{\s*--banner-room:\s*\d+px;/);
  });

  it('steps the Readouts down further in edit mode through room and cap properties the digit sizes read, so no edit rule has to outrank them', () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Edit mode never sets --type-digits itself: every layout's size stays the one rule for it.
    const selectorsOf = (property) => [...rules.matchAll(new RegExp(`([^{}]+)[{][^}]*${property}:`, 'g'))].map((m) => m[1].trim());
    expect(selectorsOf('--type-digits').filter((selector) => selector.includes('is-editing'))).toEqual([]);
    // The big Readout is capped by edit mode's --edit-cap, when one is set.
    expect(css).toMatch(/\.clock-readout--big \.clock-readout__value\s*\{\s*font-size:\s*min\(var\(--type-digits\),\s*var\(--edit-cap,\s*var\(--type-digits\)\)/);
    // Edit mode only sets the room and the cap, and never repeats the sound prompt's condition to do it.
    const editRules = [...selectorsOf('--edit-cap'), ...selectorsOf('--edit-room')].filter((selector) => selector.includes('is-editing'));
    expect(editRules.length).toBeGreaterThan(0);
    expect(editRules.filter((selector) => selector.includes('clock-sound-prompt'))).toEqual([]);

    const short = shortLayout(css);
    // Short layout: both digit sizes (with and without the sound prompt) give back edit mode's room.
    const sizes = [...short.matchAll(/--type-digits:\s*([^;]+);/g)].map((m) => m[1]);
    expect(sizes.every((size) => /var\(--edit-room\)/.test(size))).toBe(true);
    expect(short).toMatch(/\.clock-screen\s*\{[^}]*--edit-room:\s*0px;/);
    expect(short).toMatch(/\.clock-screen\.is-editing\s*\{[^}]*--edit-room:\s*\d+vh;/);
    // The Remove buttons are as tall as the short layout's other buttons.
    expect(short).toMatch(/\.clock-readout__remove\s*\{[^}]*min-height:\s*32px;/);
    // Beside layout: the column of small Readouts steps down too.
    expect(css).toMatch(/\.is-editing \.clock-readouts\.has-smalls \.clock-readout--small \.clock-readout__value\s*\{\s*font-size:/);
    // Phone: one cap in edit mode, a smaller one with the agenda, whether the sound prompt shows or not.
    expect(css).toMatch(/\.clock-screen\.is-editing:has\(\.clock-bar--day:not\(\[hidden\]\)\)\s*\{\s*--edit-cap:/);
    // Short layout with the timer: the other Readouts wrap in rows beside the ring, not one tall column.
    const timer = shortLayout(readFileSync(resolve(clockDir, 'timer.css'), 'utf8'));
    expect(timer).toMatch(/\.is-editing \.clock-readouts\.has-timer \.clock-smalls\s*\{[^}]*flex-direction:\s*row;[^}]*flex-wrap:\s*wrap;/);
  });

  it("draws the small Readouts' dividers only between Readouts, so no layout's divider rule reaches the Add slot's dashed outline", () => {
    for (const sheet of ['clock.css', 'timer.css']) {
      const rules = readFileSync(resolve(clockDir, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      // A rule on any later child of the row (`* + *`) also styles the Add slot that follows the Readouts.
      expect(rules, sheet).not.toMatch(/\.clock-smalls\s*>\s*\*\s*\+\s*\*/);
      // And the Add slot needs no rule of its own to put its outline's left side back.
      expect(rules, sheet).not.toMatch(/\.clock-smalls\s*>\s*\.clock-readout-add/);
    }
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    expect(css).toMatch(/(^|\n)\.clock-smalls > \.clock-readout \+ \.clock-readout\s*\{\s*border-left:\s*1px solid var\(--line-soft\);/);
  });

  it("lets the short layout's line use the full width while the sound prompt holds the window buttons in its row", () => {
    const css = readFileSync(resolve(clockDir, 'clock.css'), 'utf8');
    const short = shortLayout(css);
    expect(short).toMatch(/\.clock-screen:has\(> \.clock-bottom > \.clock-sound-prompt:not\(\[hidden\]\)\) :is\(\.clock-next, \.clock-line\)\s*\{\s*max-width:\s*none;/);
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
    const themes = html.indexOf('<link rel="stylesheet" href="/clock/themes.css" />');
    expect(themes).toBeGreaterThan(tokens);
    for (const sheet of ['clock.css', 'settings-drawer.css', 'timer.css', 'look-sheet.css', 'alarm-editor.css']) {
      const components = readFileSync(resolve(clockDir, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(components).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
      expect(html.indexOf(`/clock/${sheet}`)).toBeGreaterThan(themes);
    }
  });

  it('downloads no font: every theme uses system font stacks, and nothing loads from another server', () => {
    const html = readFileSync(resolve(clockDir, 'index.html'), 'utf8');
    expect(html).not.toMatch(/https?:\/\//);
    const files = readdirSync(clockDir);
    expect(files.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f))).toEqual([]);
    for (const sheet of files.filter((f) => f.endsWith('.css'))) {
      expect(readFileSync(resolve(clockDir, sheet), 'utf8')).not.toMatch(/@font-face|@import|url\(/i);
    }
  });

  it("styles the mini player's window from the same tokens, with stylesheets that exist and name no colour", () => {
    const source = readFileSync(resolve(clockDir, 'mini-player.js'), 'utf8');
    const sheets = [...source.matchAll(/'\/clock\/([\w-]+\.css)'/g)].map((m) => m[1]);
    expect(sheets).toEqual(['tokens.css', 'themes.css', 'clock.css', 'mini-player.css']);
    for (const sheet of sheets) expect(existsSync(resolve(clockDir, sheet))).toBe(true);
    const css = readFileSync(resolve(clockDir, 'mini-player.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
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
