// Screenshots + automated checks for the School Clock mockups.
//
//   node .scratch/school-clock/mockups/shoot.mjs            # all directions
//   node .scratch/school-clock/mockups/shoot.mjs a c        # just A and C
//
// Writes PNGs to ./shots/ (gitignored), contact sheets to ./shots/contact/,
// and a machine-readable ./shots/report.json. Prints a summary of:
//   - axe-core violations (if axe-core can be found, see AXE below),
//   - big-Readout digit height as a share of viewport height,
//   - anything clipped outside the viewport, overlapping text on the main
//     screen, touch targets under 44x44 on the phone, and the ringing flash rate.
//
// Playwright is resolved from the main checkout's web/node_modules (override
// with PLAYWRIGHT=...). axe-core is read from AXE=... or the temp tools dir.

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/eric/Code/formative-platform/web/node_modules/playwright');
const AXE = process.env.AXE || 'C:/Users/eric/AppData/Local/Temp/school-clock-tools/node_modules/axe-core/axe.min.js';
const axeSource = fs.existsSync(AXE) ? fs.readFileSync(AXE, 'utf8') : null;

const ALL = ['a', 'b', 'c'];
const dirs = process.argv.slice(2).filter((d) => ALL.includes(d));
const DIRECTIONS = dirs.length ? dirs : ALL;

// State ids must match shared/data.js.
const MAIN = ['period', 'readouts', 'passing', 'break', 'assembly', 'before', 'after', 'dayoff', 'experience', 'summer', 'ringing', 'sound', 'timer', 'picker', 'settings', 'alarm', 'first'];
const MINI = ['mini', 'mini-passing', 'mini-ringing'];
const BOTH = ['dark', 'light'];

// [width, height, states, themes]
const PLAN = [
  [1920, 1080, MAIN, BOTH],
  [1440, 900, MAIN, BOTH],
  [1280, 720, ['period', 'passing', 'readouts'], BOTH],
  [480, 320, ['period', 'passing', 'readouts', 'ringing', 'timer', 'sound'], BOTH],
  [390, 844, MAIN, ['dark']],
  [390, 844, ['period', 'passing'], ['light']],
  [320, 180, MINI, BOTH],
  // 24-hour time setting
  [1920, 1080, ['readouts&clock=24', 'before&clock=24', 'settings&clock=24'], BOTH],
  [390, 844, ['readouts&clock=24'], ['dark']],
];

const outDir = path.join(here, 'shots');
fs.mkdirSync(path.join(outDir, 'contact'), { recursive: true });

// Runs in the page: layout checks that don't need a human eye.
function pageChecks(isPhone) {
  const vw = innerWidth;
  const vh = innerHeight;
  const hidden = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (n.classList?.contains('visually-hidden')) return true;
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)') return true;
    }
    return false;
  };
  const inScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  };
  const name = (el) => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName.toLowerCase()) + ` "${(el.textContent || '').trim().slice(0, 30)}"`;
  const result = { clipped: [], overlaps: [], smallTargets: [], pageScroll: false, digitRatio: null, flash: null };

  const root = document.scrollingElement;
  result.pageScroll = root.scrollWidth > vw + 1 || root.scrollHeight > vh + 1;

  const app = document.getElementById('app');
  const els = [...app.querySelectorAll('*')].filter((el) => !el.closest('[data-mock]') && !(el instanceof SVGElement && el.tagName !== 'svg'));
  for (const el of els) {
    if (hidden(el) || inScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.classList.contains('ring-flash') || el.classList.contains('scrim')) continue;
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) result.clipped.push(name(el));
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'hidden' && el.textContent.trim()) result.clipped.push('(overflow hidden) ' + name(el));
  }

  // Overlapping text leaves on the main screen (overlays excluded).
  const main = app.querySelector('main');
  if (main) {
    const leaves = [...main.querySelectorAll('*')].filter((el) => {
      if (hidden(el) || inScroller(el)) return false;
      // Small icons count; a big decorative svg (C's progress ring) is
      // meant to sit behind its text.
      if (el.tagName === 'svg') return el.getBoundingClientRect().width < 100;
      return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    });
    const boxes = leaves.map((el) => {
      // Use the text's own box, not the element's padded box.
      const range = document.createRange();
      range.selectNodeContents(el);
      if (el.tagName === 'svg') return { el, r: el.getBoundingClientRect() };
      // A text box is the font's content area, much taller than the ink of
      // big digits; trim it to roughly cap height so stacked lines don't
      // count as overlapping.
      const r = range.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize);
      return { el, r: { left: r.left, right: r.right, top: r.top + 0.3 * fs, bottom: r.bottom - 0.2 * fs } };
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2) result.overlaps.push(`${name(a.el)} x ${name(b.el)}`);
      }
    }
  }

  if (isPhone) {
    const targets = [...app.querySelectorAll('button, a, select, input:not([type=checkbox]):not([type=radio]), label.check, label.switch')];
    for (const t of targets) {
      if (hidden(t) || t.closest('[data-mock]')) continue;
      const r = t.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) result.smallTargets.push(`${name(t)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }

  // Digit height of the big Readout, measured from the glyphs themselves.
  const big = app.querySelector('[data-readout="big"]');
  if (big) {
    const cs = getComputedStyle(big);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText('0123456789');
    result.digitRatio = +((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / vh).toFixed(3);
  }

  const flash = app.querySelector('.ring-flash');
  if (flash) {
    const anims = flash.getAnimations();
    result.flash = anims.length
      ? anims.map((a) => ({ durationMs: a.effect.getTiming().duration, flashesPerSecond: 1000 / a.effect.getTiming().duration }))
      : 'steady (no animation)';
  }
  return result;
}

const browser = await chromium.launch();
const report = {};
const shotsByDir = {};

for (const dir of DIRECTIONS) {
  report[dir] = [];
  shotsByDir[dir] = [];
  const url = pathToFileURL(path.join(here, dir, 'index.html')).href;
  for (const [w, h, states, themes] of PLAN) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    for (const theme of themes) {
      for (const state of states) {
        await page.goto(`${url}#${state}&theme=${theme}&shot=1`);
        await page.reload(); // hash-only navigations don't re-run scripts
        await page.waitForLoadState('load');
        // Freeze animations at "flash on" so the shot is deterministic.
        await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
        const file = path.join(outDir, dir, `${w}x${h}`, `${state.replace(/[&=]/g, '_')}-${theme}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file });
        shotsByDir[dir].push({ file, w, h, state, theme });
        const checks = await page.evaluate(pageChecks, w <= 430);
        if (state.includes('ringing')) {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.reload();
          checks.reducedMotionFlash = await page.evaluate(() => {
            const f = document.querySelector('.ring-flash');
            return f && f.getAnimations().length === 0 ? 'steady (no animation)' : 'ANIMATES';
          });
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
        let axe = null;
        if (axeSource) {
          await page.addScriptTag({ content: axeSource });
          axe = await page.evaluate(async () => {
            const r = await window.axe.run(document, { exclude: [['[data-mock]']], resultTypes: ['violations'] });
            return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1]?.trim() || ''}`) }));
          });
        }
        report[dir].push({ size: `${w}x${h}`, state, theme, ...checks, axe, errors: [...errors] });
        errors.length = 0;
      }
    }
    await context.close();
  }
}

// Contact sheets: every shot of a direction at one size on one page.
const contact = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const cpage = await contact.newPage();
for (const dir of DIRECTIONS) {
  const groups = {};
  for (const s of shotsByDir[dir]) (groups[`${s.w}x${s.h}`] ||= []).push(s);
  for (const [size, shots] of Object.entries(groups)) {
    const w = shots[0].w;
    const cols = w >= 1280 ? 3 : w >= 480 ? 6 : w >= 390 ? 8 : 6;
    const html = `<!doctype html><body style="margin:0;padding:12px;background:#777;font:14px system-ui">
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px">
      ${shots.map((s) => `<figure style="margin:0"><img src="${pathToFileURL(s.file).href}" style="width:100%;display:block;outline:1px solid #000"><figcaption style="color:#fff">${s.state} · ${s.theme}</figcaption></figure>`).join('')}
      </div></body>`;
    const tmp = path.join(outDir, 'contact', `${dir}-${size}.html`);
    fs.writeFileSync(tmp, html);
    await cpage.goto(pathToFileURL(tmp).href);
    await cpage.waitForLoadState('load');
    await cpage.screenshot({ path: path.join(outDir, 'contact', `${dir}-${size}.png`), fullPage: true });
  }
}
// The index page itself (live scaled iframes), tall enough to load them all.
await cpage.setViewportSize({ width: 1440, height: 5200 });
await cpage.goto(pathToFileURL(path.join(here, 'index.html')).href);
await cpage.waitForTimeout(3000);
await cpage.screenshot({ path: path.join(outDir, 'index.png'), fullPage: true });
await browser.close();

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

// ---------- summary ----------
console.log(axeSource ? `axe-core: ${AXE}` : 'axe-core NOT FOUND: accessibility scan skipped');
for (const dir of DIRECTIONS) {
  const rows = report[dir];
  const axeIssues = rows.flatMap((r) => (r.axe || []).map((v) => `${r.size} ${r.state}-${r.theme}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).join(' | ')}`));
  const issues = rows.flatMap((r) => [
    ...(r.pageScroll ? [`${r.size} ${r.state}-${r.theme}: page scrolls`] : []),
    ...r.clipped.map((c) => `${r.size} ${r.state}-${r.theme}: clipped ${c}`),
    ...r.overlaps.map((c) => `${r.size} ${r.state}-${r.theme}: overlap ${c}`),
    ...r.smallTargets.map((c) => `${r.size} ${r.state}-${r.theme}: small target ${c}`),
    ...r.errors.map((c) => `${r.size} ${r.state}-${r.theme}: page error ${c}`),
    ...(r.reducedMotionFlash && r.reducedMotionFlash !== 'steady (no animation)' ? [`${r.size} ${r.state}: flash animates under reduced motion`] : []),
  ]);
  const ratios = rows.filter((r) => r.size === '1920x1080' && r.theme === 'dark' && r.digitRatio).map((r) => `${r.state} ${r.digitRatio}`);
  const flash = rows.find((r) => r.state === 'ringing' && r.size === '1920x1080')?.flash;
  console.log(`\n=== ${dir.toUpperCase()}: ${rows.length} shots`);
  console.log(`digit height / viewport height @1920x1080: ${ratios.join(', ')}`);
  console.log(`ringing flash: ${JSON.stringify(flash)}`);
  console.log(`axe violations: ${axeIssues.length}`);
  axeIssues.slice(0, 40).forEach((l) => console.log('  ' + l));
  console.log(`layout issues: ${issues.length}`);
  issues.slice(0, 60).forEach((l) => console.log('  ' + l));
}
