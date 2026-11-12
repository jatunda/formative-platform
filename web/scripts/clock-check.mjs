// Screenshots and checks the real /clock page in Chromium, across states and sizes.
//
//   npm run check:clock                       every default state at every checklist size
//   npm run check:clock -- --state passing    just one default state (repeatable)
//   npm run check:clock -- --state "chapel=?at=2026-11-18T10:30"   any ?at= / &speed= URL
//   npm run check:clock -- --size 390x844 --division MS --settings '{"showSeconds":false}'
//   npm run check:clock -- --layout countdown,clock,countup   Readouts to show, big one first
//   npm run check:clock -- --timer            with the first preset timer running
//   npm run check:clock -- --editing          in the Readouts' edit mode
//   npm run check:clock -- --zoom 1366x768    that screen at every browser zoom, 67% to 200%
//                                             (the viewport it leaves: 2039x1146 … 683x384; repeatable)
//   npm run check:clock -- --size 375x667 --bars 100   a phone with its browser bars showing:
//                                             html's 100% drops by 100px while 100vh stays the full
//                                             screen (what a phone's browser does). Desktop Chromium
//                                             can't shrink svh with it, so to see an svh-sized layout
//                                             as that phone shows it, use --size 375x567 instead
//   npm run check:clock -- --sound-on         sound already allowed, so no sound prompt
//   npm run check:clock -- --no-shots         checks only, no PNGs
//
// For each state × size it saves a screenshot, runs axe, checks the page doesn't
// scroll, checks the stage stays inside its row (clear of the top bar and the
// bottom row), checks the phone's agenda (when it shows) scrolls until its last row is
// fully on screen and uncovered, with the window button and sound prompt on screen
// below it (the screenshot is taken scrolled to the end), checks the timer's ring
// (when one shows) runs into nothing in the top bar or the side Readouts, and
// records page errors. Results go to .clock-check/ (gitignored):
// one PNG per render plus report.json. Exits 1 if anything failed.
//
// It starts its own Vite server on 127.0.0.1 (a free port) and always stops it
// and the browser on exit, including Ctrl-C, so nothing is left running.
//
// For the whole layout matrix (Readouts × edit mode × timer × sound prompt ×
// sizes, with ticketed failures known), run `npm run check:clock:full`
// (scripts/clock-check-full.mjs).
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { startClockCheck, webDir } from './clock-check-browser.mjs';
import { DEFAULT_STATES, DEFAULT_SIZES, describeFailure } from './clock-check-matrix.js';

// Chrome's zoom steps from 67% to 200%: zooming to z leaves a viewport of size / z CSS pixels.
const ZOOMS = [0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

function parseArgs(argv) {
  const opts = { states: [], sizes: [], division: 'HS', settings: {}, layout: null, timer: false, shots: true, axe: true, editing: false, bars: 0, soundOn: false };
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
    else if (arg === '--layout') opts.layout = next();
    else if (arg === '--timer') opts.timer = true;
    else if (arg === '--editing') opts.editing = true;
    else if (arg === '--sound-on') opts.soundOn = true;
    else if (arg === '--bars') opts.bars = Number(next());
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

const results = [];
const check = await startClockCheck();
try {
  for (const size of opts.sizes) results.push(...await check.checkSize(opts, size, { outDir }));
} finally {
  await check.stop();
}

writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
for (const r of failed) console.log(`✗ ${r.state} @ ${r.size}: ${describeFailure(r).join('; ')}`);
console.log(`${results.length - failed.length}/${results.length} renders passed. Screenshots and report.json in ${outDir}`);
process.exitCode = failed.length ? 1 : 0;
