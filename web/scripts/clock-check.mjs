// Screenshots and checks the real /clock page in Chromium, across states and sizes.
//
//   npm run check:clock                       every default state at every checklist size
//   npm run check:clock -- --state passing    just one default state (repeatable)
//   npm run check:clock -- --state "chapel=?at=2026-11-18T10:30"   any ?at= / &speed= URL
//   npm run check:clock -- --size 390x844 --division MS --settings '{"showSeconds":false}'
//   npm run check:clock -- --layout countdown,clock,countup   Readouts to show, big one first
//   npm run check:clock -- --timer            with the first preset timer running
//   npm run check:clock -- --zoom 1366x768    that screen at every browser zoom, 67% to 200%
//                                             (the viewport it leaves: 2039x1146 … 683x384; repeatable)
//   npm run check:clock -- --no-shots         checks only, no PNGs
//
// For each state × size it saves a screenshot, runs axe, checks the page doesn't
// scroll, checks the timer's ring (when one shows) runs into nothing in the top
// bar or the side Readouts, and records page errors. Results go to .clock-check/ (gitignored):
// one PNG per render plus report.json. Exits 1 if anything failed.
//
// It starts its own Vite server on 127.0.0.1 (a free port) and always stops it
// and the browser on exit, including Ctrl-C, so nothing is left running.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const SETTINGS_KEY = 'school-clock-settings-v1';
const LAYOUT_KEY = 'school-clock-layout-v1';

// One moment per kind of state, on real 2026–27 dates (HS unless --division MS).
const DEFAULT_STATES = {
  period: '?at=2026-11-03T10:40',      // All Day, Period 3
  passing: '?at=2026-11-03T09:22',     // Period 1 → Period 2
  break: '?at=2026-11-03T10:15',       // Nutrition
  assembly: '?at=2026-11-18T10:30',    // HS Even Day, Chapel
  before: '?at=2026-11-03T08:00',
  after: '?at=2026-11-03T15:30',
  dayoff: '?at=2026-11-25T12:00',      // Thanksgiving Break
  weekend: '?at=2026-11-07T12:00',
  experience: '?at=2027-01-20T09:50',  // HS Experience Week
  summer: '?at=2027-07-01T12:00',
  unknown: '?at=2030-01-15T12:00',     // outside every School Year
};
const DEFAULT_SIZES = ['1920x1080', '1440x900', '1280x720', '480x320', '390x844'];
// Chrome's zoom steps from 67% to 200%: zooming to z leaves a viewport of size / z CSS pixels.
const ZOOMS = [0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

function parseArgs(argv) {
  const opts = { states: [], sizes: [], division: 'HS', settings: {}, layout: null, timer: false, shots: true, axe: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--state') opts.states.push(next());
    else if (arg === '--size') opts.sizes.push(next());
    else if (arg === '--zoom') {
      const [width, height] = next().split('x').map(Number);
      opts.sizes.push(...ZOOMS.map((z) => `${Math.round(width / z)}x${Math.round(height / z)}`));
    }
    else if (arg === '--division') opts.division = next();
    else if (arg === '--settings') opts.settings = JSON.parse(next());
    else if (arg === '--layout') opts.layout = { readouts: next().split(',').map((mode) => ({ mode })) };
    else if (arg === '--timer') opts.timer = true;
    else if (arg === '--no-shots') opts.shots = false;
    else if (arg === '--no-axe') opts.axe = false;
    else throw new Error(`Unknown option ${arg}`);
  }
  const states = opts.states.length ? opts.states : Object.keys(DEFAULT_STATES);
  opts.states = states.map((s) => {
    if (s.includes('=?')) {
      const [name, query] = [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)];
      return { name, query };
    }
    if (!(s in DEFAULT_STATES)) throw new Error(`Unknown state ${s}; use name=?at=... for a custom one`);
    return { name: s, query: DEFAULT_STATES[s] };
  });
  opts.sizes = (opts.sizes.length ? opts.sizes : DEFAULT_SIZES).map((s) => {
    const [width, height] = s.split('x').map(Number);
    return { label: s, width, height };
  });
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const outDir = resolve(webDir, '.clock-check');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let server;
let browser;
async function stop() {
  await browser?.close().catch(() => {});
  await server?.close().catch(() => {});
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { stop().finally(() => process.exit(130)); });
}

const results = [];
try {
  server = await createServer({ root: webDir, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const { port } = /** @type {import('net').AddressInfo} */ (server.httpServer.address());
  const base = `http://127.0.0.1:${port}/clock/`;
  browser = await chromium.launch();
  // Skip the first-visit prompts so each render shows the state itself.
  const seeded = JSON.stringify({ division: opts.division, themeHint: false, ...opts.settings });

  for (const size of opts.sizes) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [SETTINGS_KEY, seeded]);
    if (opts.layout) {
      await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [LAYOUT_KEY, JSON.stringify(opts.layout)]);
    }
    for (const state of opts.states) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base + state.query);
      if (opts.timer) {
        await page.getByRole('button', { name: 'Timer', exact: true }).click();
        await page.locator('.clock-preset').first().click();
      }
      await page.waitForTimeout(400);
      const scroll = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > innerWidth,
        y: document.documentElement.scrollHeight > innerHeight,
      }));
      // The ring's circle (its stroke's outer edge) against every box it must
      // stay clear of: the Day Label's text, the top bar's buttons, the side Readouts.
      const overlaps = await page.evaluate(() => {
        const ring = document.querySelector('.clock-ring');
        if (!ring || !ring.getClientRects().length) return [];
        const box = ring.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        // The circle fits the box's shorter side (a squeezed box stays round):
        // r=48 plus half the 2.4 stroke, on a 100 box.
        const r = (Math.min(box.width, box.height) / 2) * (49.2 / 50);
        const textBox = (node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect();
        };
        const targets = [
          ...[...document.querySelectorAll('.clock-top .clock-day')].map((n) => ['Day Label', textBox(n)]),
          ...[...document.querySelectorAll('.clock-top button')].map((n) => [`"${n.textContent.trim() || n.getAttribute('aria-label')}"`, n.getBoundingClientRect()]),
          ...[...document.querySelectorAll('.clock-readouts .clock-smalls .clock-readout')].map((n, i) => [`small Readout ${i + 1}`, n.getBoundingClientRect()]),
        ];
        return targets
          .filter(([, b]) => b.width && b.height)
          .filter(([, b]) => {
            const dx = cx - Math.max(b.left, Math.min(cx, b.right));
            const dy = cy - Math.max(b.top, Math.min(cy, b.bottom));
            return dx * dx + dy * dy < r * r;
          })
          .map(([name]) => name);
      });
      let violations = [];
      if (opts.axe) {
        await page.addScriptTag({ path: axeSource });
        violations = await page.evaluate(async () => {
          // @ts-ignore axe is injected above
          const { violations } = await window.axe.run(document);
          return violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`);
        });
      }
      const file = `${state.name}-${size.label}.png`;
      if (opts.shots) await page.screenshot({ path: resolve(outDir, file) });
      const ok = !scroll.x && !scroll.y && !overlaps.length && !errors.length && !violations.length;
      results.push({ state: state.name, size: size.label, url: base + state.query, ok, scroll, overlaps, errors, violations, shot: opts.shots ? file : null });
      await page.close();
    }
    await context.close();
  }
} finally {
  await stop();
}

writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
for (const r of failed) {
  const why = [r.scroll.x && 'scrolls sideways', r.scroll.y && 'scrolls down',
    r.overlaps.length && `ring overlaps ${r.overlaps.join(', ')}`, ...r.errors, ...r.violations].filter(Boolean);
  console.log(`✗ ${r.state} @ ${r.size}: ${why.join('; ')}`);
}
console.log(`${results.length - failed.length}/${results.length} renders passed. Screenshots and report.json in ${outDir}`);
process.exitCode = failed.length ? 1 : 0;
