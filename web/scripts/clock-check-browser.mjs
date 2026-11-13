// @ts-check
// Drives the real /clock page in Chromium for clock-check.mjs and
// clock-check-full.mjs: starts a Vite server on 127.0.0.1 (a free port) and
// the browsers, renders states at a size and checks each render (what the
// checks are is in clock-check.mjs's header). stop() closes the browsers and
// the server; it also runs on Ctrl-C, so nothing is left running.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { SETTINGS_KEY } from '../clock/clock-storage.js';
import { LAYOUT_KEY } from '../clock/readout-layout.js';
import { describeFailure, ringGapAt } from './clock-check-matrix.js';

const webDir =resolve(dirname(fileURLToPath(import.meta.url)), '..');
const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
/** ring-geometry.js as the page's server serves it, for the ring check inside the page. */
const RING_GEOMETRY_URL = '/clock/ring-geometry.js';

/** Where screenshots and report.json go (gitignored). */
export const outDir = resolve(webDir, '.clock-check');

/** Empties outDir for a new run, so it holds only this run's files. */
export function resetOutDir() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
}

/**
 * Writes every result to outDir/report.json and prints one ✗ line per failure.
 * @param {object[]} results @param {string[]} failures what failed, one line each
 */
export function report(results, failures) {
  writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(results, null, 2));
  for (const line of failures) console.log(`✗ ${line}`);
}

/**
 * @typedef {import('./clock-check-matrix.js').Config & { states: { name: string, query: string }[],
 *   division: string, settings: object, bars: number, axe: boolean, shots: boolean | 'failures' }} CheckOptions
 * The Config (e.g. layout 'countdown,clock') plus how to check it;
 * `shots: 'failures'` saves only failing renders.
 */

/** Starts the server; browsers launch on first use (sound-on needs its own). */
export async function startClockCheck() {
  /** @type {import('vite').ViteDevServer | undefined} */
  let server;
  /** @type {Map<boolean, Promise<import('playwright').Browser>>} */
  const browsers = new Map();
  async function stop() {
    for (const browser of browsers.values()) await (await browser.catch(() => null))?.close().catch(() => {});
    await server?.close().catch(() => {});
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { stop().finally(() => process.exit(130)); });
  }
  let port;
  try {
    server = await createServer({ root: webDir, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('The Vite server is not listening on a port');
    port = address.port;
  } catch (e) {
    await stop();
    throw e;
  }
  const base = `http://127.0.0.1:${port}/clock/`;
  /** @param {boolean} soundOn */
  function browserFor(soundOn) {
    if (!browsers.has(soundOn)) {
      browsers.set(soundOn, chromium.launch(soundOn ? { args: ['--autoplay-policy=no-user-gesture-required'] } : {}));
    }
    return /** @type {Promise<import('playwright').Browser>} */ (browsers.get(soundOn));
  }

  /**
   * Renders every state in `opts` at `size` and checks each.
   * @param {CheckOptions} opts @param {{ label: string, width: number, height: number }} size
   * @param {string} [prefix] what its screenshots' names (in outDir) start with
   */
  async function checkSize(opts, size, prefix = '') {
    const browser = await browserFor(opts.soundOn);
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    // Skip the first-visit prompts so each render shows the state itself.
    const seeded = JSON.stringify({ division: opts.division, themeHint: false, ...opts.settings });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [SETTINGS_KEY, seeded]);
    // A phone's browser bars shrink the initial containing block (what html's
    // height: 100% resolves against) but not 100vh, which stays the full screen.
    // Everything below the visible height is under the bars.
    if (opts.bars) {
      await context.addInitScript((bars) => {
        const shrink = () => document.documentElement.style.setProperty('height', `${innerHeight - bars}px`);
        if (document.documentElement) shrink();
        else new MutationObserver((_, observer) => { if (document.documentElement) { shrink(); observer.disconnect(); } }).observe(document, { childList: true });
      }, opts.bars);
    }
    if (opts.layout) {
      const layout = { readouts: opts.layout.split(',').map((mode) => ({ mode })) };
      await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [LAYOUT_KEY, JSON.stringify(layout)]);
    }
    const results = [];
    try {
      for (const state of opts.states) {
        const page = await context.newPage();
        const result = await checkPage(page, base + state.query, opts, ringGapAt(size.label));
        const file = `${prefix}${state.name}-${size.label}.png`;
        const shot = opts.shots === true || (opts.shots === 'failures' && !result.ok);
        if (shot) await page.screenshot({ path: resolve(outDir, file) });
        results.push({ state: state.name, size: size.label, url: base + state.query, ...result, shot: shot ? file : null });
        await page.close();
      }
    } finally {
      await context.close();
    }
    return results;
  }

  return { base, checkSize, stop };
}

/**
 * Opens `url` with the options' timer and edit mode, then checks the render.
 * @param {import('playwright').Page} page @param {string} url @param {CheckOptions} opts
 * @param {number} [ringGap] the ring's gap at this size, where it isn't ring-fit's (ringGapAt)
 */
async function checkPage(page, url, opts, ringGap) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  if (opts.timer) {
    await page.getByRole('button', { name: 'Timer', exact: true }).click();
    await page.locator('.clock-preset').first().click();
  }
  if (opts.editing) {
    // Time-only states (weekend, summer, ...) hide the Readouts button: nothing to edit there.
    const readouts = page.getByRole('button', { name: 'Readouts', exact: true });
    if (await readouts.isVisible()) await readouts.click();
  }
  await page.waitForTimeout(400);
  const scroll = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth > innerWidth,
    y: document.documentElement.scrollHeight > innerHeight,
  }));
  // The ring against everything ring-fit keeps it clear of (the top bar's
  // Day Label and buttons, the small Readouts' values), with the same circle
  // and gap: ring-geometry.js, imported from the served page, so the check and
  // the page can't drift apart. A size in RING_GAPS asks for its own gap.
  const overlaps = await page.evaluate(async ([geometryUrl, gap]) => {
    /** @type {typeof import('../clock/ring-geometry.js')} */
    const { ringObstacles, ringTouches } = await import(geometryUrl);
    const ring = document.querySelector('.clock-ring');
    if (!ring || !ring.getClientRects().length) return [];
    return ringTouches(ring.getBoundingClientRect(), ringObstacles(document), gap ?? undefined);
  }, /** @type {[string, number | null]} */ ([RING_GEOMETRY_URL, ringGap ?? null]));
  // The stage (the title, the Readouts, the cycle hint, the line) must stay
  // inside its own row: overflowing it runs into the top bar or hides the
  // line behind the sound prompt. Reports how far it spills above and below.
  const stage = await page.evaluate(() => {
    const box = document.querySelector('.clock-stage')?.getBoundingClientRect();
    if (!box || !box.height) return null;
    const parts = [...document.querySelectorAll('.clock-stage *')]
      .filter((n) => n.getClientRects().length)
      .map((n) => n.getBoundingClientRect())
      .filter((b) => b.width && b.height);
    if (!parts.length) return null;
    const above = Math.round(box.top - Math.min(...parts.map((b) => b.top)));
    const below = Math.round(Math.max(...parts.map((b) => b.bottom)) - box.bottom);
    return { fits: above <= 0 && below <= 0, above, below };
  });
  // The phone's agenda, scrolled to its end: its last row must sit wholly
  // on screen with nothing over it (the window button, the sound prompt).
  const agenda = await page.evaluate((bars) => {
    const list = document.querySelector('.clock-agenda');
    const last = list?.lastElementChild;
    if (!list || !list.getClientRects().length || !last) return null;
    list.scrollTop = list.scrollHeight;
    const row = last.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    const x = row.left + row.width / 2;
    const covered = [row.top + 2, row.bottom - 2].some((y) => {
      const hit = document.elementFromPoint(x, y);
      return !hit || !last.contains(hit);
    });
    const visible = innerHeight - bars;
    // The window button and the sound prompt under it must stay on screen
    // too, and clear of the row: an agenda taller than its row (it keeps
    // about three rows) runs under them, painted on top, so elementFromPoint
    // alone doesn't see it.
    /** Whether two boxes don't overlap (touching edges count as clear). @param {DOMRect} a @param {DOMRect} b */
    const clear = (a, b) => a.top >= b.bottom - 0.5 || a.bottom <= b.top + 0.5 || a.left >= b.right - 0.5 || a.right <= b.left + 0.5;
    const below = [...document.querySelectorAll('.clock-corner button, .clock-sound-prompt')]
      .filter((n) => n.getClientRects().length)
      .map((n) => n.getBoundingClientRect())
      .every((b) => b.bottom <= visible + 0.5 && clear(b, row));
    return { reachable: row.top >= box.top - 0.5 && row.bottom <= Math.min(box.bottom, visible) + 0.5 && !covered && below,
      listHeight: Math.round(box.height), rowBottom: row.bottom, listBottom: box.bottom, visible };
  }, opts.bars);
  /** @type {string[]} */
  let violations = [];
  if (opts.axe) {
    await page.addScriptTag({ path: axeSource });
    violations = await page.evaluate(async () => {
      // axe is the global the script tag above injects.
      const { axe } = /** @type {Window & { axe: typeof import('axe-core') }} */ (/** @type {unknown} */ (window));
      const { violations } = await axe.run(document);
      return violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`);
    });
  }
  const checked = { scroll, stage, agenda, overlaps, errors, violations };
  return { ok: describeFailure(checked).length === 0, ...checked };
}
