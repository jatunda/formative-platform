// Screenshots + automated checks for the School Clock design reference.
//
//   node .scratch/school-clock/mockups/final/shoot.mjs          # everything
//   node .scratch/school-clock/mockups/final/shoot.mjs --quick  # skip the combination sweep
//   node .scratch/school-clock/mockups/final/shoot.mjs --sweep  # only the combination sweep
//
// Writes PNGs to final/shots/ (gitignored), contact sheets to shots/contact/,
// and shots/report.json. Checks on every shot: axe-core, page scroll,
// clipping, overlapping text, decoration over text, 44x44 targets on the
// phone, big-Readout digit height, ringing flash rate (and reduced motion).
// The sweep renders every font x palette x mode (and the theme picker in
// every palette x mode) and runs axe, the digit-height and fit checks, and a
// tabular-digits check of each font.
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
const Themes = require('./themes.js');

const QUICK = process.argv.includes('--quick');
const SWEEP_ONLY = process.argv.includes('--sweep');

const MAIN = ['period', 'readouts', 'edit', 'passing', 'break', 'assembly', 'before', 'after', 'dayoff', 'experience', 'summer', 'unknown', 'simulated', 'ringing', 'sound', 'timer', 'timer-paused', 'timer-readouts', 'timer-ringing', 'picker', 'settings', 'look', 'alarm', 'alarm-clock', 'first', 'hint', 'toast', 'toast-error'];
const SMALL = ['period', 'readouts', 'passing', 'before', 'dayoff', 'ringing', 'timer', 'sound', 'edit', 'hint', 'toast', 'look'];
const MINI = ['mini', 'mini-passing', 'mini-ringing', 'mini-timer'];
const BOTH = ['dark', 'light'];

// [width, height, states, modes, extra hash]
const PLAN = [
  [1920, 1080, MAIN, BOTH, ''],
  [1440, 900, MAIN, BOTH, ''],
  [1280, 720, ['period', 'passing', 'readouts', 'timer'], BOTH, ''],
  [480, 320, SMALL, BOTH, ''],
  [390, 844, MAIN, ['dark'], ''],
  [390, 844, ['period', 'passing', 'timer'], ['light'], ''],
  [320, 180, MINI, BOTH, ''],
  [480, 270, MINI, ['dark'], ''],
  // settings variants
  [1920, 1080, ['period', 'readouts', 'passing', 'summer'], ['dark'], 'seconds=off'],
  [1920, 1080, ['period', 'passing', 'readouts', 'break', 'before', 'look'], ['dark', 'light'], 'bar=segment'],
  [1440, 900, ['period', 'passing', 'readouts'], ['dark'], 'bar=segment'],
  [1920, 1080, ['readouts', 'before', 'look'], ['dark'], 'clock=24'],
  [390, 844, ['period', 'passing', 'look'], ['dark'], 'bar=segment'],
  [480, 320, ['period'], ['dark'], 'bar=segment'],
  [320, 180, ['mini'], ['dark'], 'seconds=off'],
  // swaps shown in the picker
  [1920, 1080, ['look', 'period'], ['native', 'flipped'], 'theme=team&font=serif&palette=court'],
  [1920, 1080, ['look', 'readouts'], ['native', 'flipped'], 'theme=bloom'],
];
// Every theme, in-Period, both modes, at the projected size, plus the
// theme's ringing and timer states (they use the accent and ring colours).
for (const t of Themes.THEMES) {
  PLAN.push([1920, 1080, ['period', 'timer', 'ringing'], ['native', 'flipped'], `theme=${t.id}`]);
  PLAN.push([390, 844, ['period'], ['native'], `theme=${t.id}`]);
}

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
  const name = (el) => {
    const c = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
    return (c ? '.' + c.trim().split(/\s+/).join('.') : el.tagName.toLowerCase()) + ` "${(el.textContent || '').trim().slice(0, 30)}"`;
  };
  const result = { clipped: [], overlaps: [], smallTargets: [], decoOverlaps: [], badWords: [], pageScroll: false, digitRatio: null, digitFits: true, flash: null };
  // "Nutrition" is never shortened to "Nut" (visible or accessible text).
  const app0 = document.getElementById('app');
  if (/\bNut\b/.test(app0.innerText) || /\bNut\b/.test(app0.textContent)) result.badWords.push('Nut');

  const root = document.scrollingElement;
  result.pageScroll = root.scrollWidth > vw + 1 || root.scrollHeight > vh + 1;

  const app = document.getElementById('app');
  const els = [...app.querySelectorAll('*')].filter((el) => !el.closest('[data-mock]') && !el.closest('.deco') && !(el instanceof SVGElement && el.tagName !== 'svg'));
  for (const el of els) {
    if (hidden(el) || inScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.classList.contains('ring-flash') || el.classList.contains('scrim') || el.classList.contains('theme-tile__deco')) continue;
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) result.clipped.push(name(el));
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'hidden' && el.textContent.trim() && !el.classList.contains('seg__label')) result.clipped.push('(overflow hidden) ' + name(el));
  }

  // Overlapping text leaves on the main screen (overlays excluded).
  const main = app.querySelector('main');
  const textBox = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize);
    // Trim the font's content box to roughly cap height.
    return { left: r.left, right: r.right, top: r.top + 0.3 * fs, bottom: r.bottom - 0.2 * fs };
  };
  const leaves = main
    ? [...main.querySelectorAll('*')].filter((el) => {
        if (hidden(el) || inScroller(el) || el.closest('.deco')) return false;
        if (el.tagName === 'svg') return el.getBoundingClientRect().width < 100;
        return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      })
    : [];
  const boxes = leaves.map((el) => ({ el, r: el.tagName === 'svg' ? el.getBoundingClientRect() : textBox(el) }));
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (hit(a.r, b.r)) result.overlaps.push(`${name(a.el)} x ${name(b.el)}`);
    }
  }
  // Decorations never sit on text or controls.
  for (const d of app.querySelectorAll('.deco')) {
    if (hidden(d)) continue;
    const dr = d.getBoundingClientRect();
    for (const b of boxes) if (hit(dr, b.r)) result.decoOverlaps.push(name(b.el));
    for (const c of main.querySelectorAll('button')) if (!hidden(c) && hit(dr, c.getBoundingClientRect())) result.decoOverlaps.push(name(c));
  }

  if (isPhone) {
    const targets = [...app.querySelectorAll('button, a, select, input:not([type=checkbox]):not([type=radio]), label.check, label.switch, label.swatch, label.theme-tile')];
    for (const t of targets) {
      if (hidden(t) || t.closest('[data-mock]')) continue;
      const r = t.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) result.smallTargets.push(`${name(t)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }

  // Digit height of the big Readout, measured from the glyphs themselves,
  // and whether its text fits its box.
  const big = app.querySelector('[data-readout="big"]');
  if (big && !hidden(big)) {
    const cs = getComputedStyle(big);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText('0123456789');
    result.digitRatio = +((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / vh).toFixed(3);
    const r = big.getBoundingClientRect();
    const ring = big.closest('.timer__ring');
    if (ring) {
      // Inside the ring: the text's ends must stay inside the circle.
      const rr = ring.getBoundingClientRect();
      const cx = rr.left + rr.width / 2;
      const cy = rr.top + rr.height / 2;
      const rad = rr.width / 2 * 0.94;
      const t = textBox(big);
      const corners = [[t.left, t.top], [t.right, t.top], [t.left, t.bottom], [t.right, t.bottom]];
      result.digitFits = corners.every(([x, y]) => Math.hypot(x - cx, y - cy) <= rad);
    } else {
      result.digitFits = r.right <= vw + 1 && r.left >= -1;
    }
  }

  const flash = app.querySelector('.ring-flash');
  if (flash) {
    const anims = flash.getAnimations();
    result.flash = anims.length ? anims.map((a) => ({ flashesPerSecond: 1000 / a.effect.getTiming().duration })) : 'steady (no animation)';
  }
  return result;
}

async function runAxe(page) {
  if (!axeSource) return null;
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, { exclude: [['[data-mock]']], resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1]?.trim() || ''}`) }));
  });
}

const url = pathToFileURL(path.join(here, 'index.html')).href;
const browser = await chromium.launch();
const report = { shots: [], sweep: [], fonts: [] };
const shots = [];

if (!SWEEP_ONLY) {
  for (const [w, h, states, modes, extra] of PLAN) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    for (const mode of modes) {
      for (const state of states) {
        const modeHash = mode === 'native' ? '' : mode === 'flipped' ? '&flip=1' : `&mode=${mode}`;
        const hash = `${state}${modeHash}${extra ? '&' + extra : ''}&shot=1`;
        await page.goto(`${url}#${hash}`);
        await page.reload();
        await page.waitForLoadState('load');
        await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
        const tag = extra ? extra.replace(/[&=]/g, '_') + '/' : '';
        const file = path.join(outDir, `${w}x${h}`, tag, `${state}-${mode}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file });
        shots.push({ file, w, h, state, mode, extra });
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
        const axe = await runAxe(page);
        report.shots.push({ size: `${w}x${h}`, state, mode, extra, ...checks, axe, errors: [...errors] });
        errors.length = 0;
      }
    }
    await context.close();
  }
}

if (!QUICK) {
  // Every font x palette x mode, rendered in one page by changing the hash.
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto(`${url}#readouts&shot=1`);
  await page.waitForLoadState('load');
  const go = async (hash) => {
    await page.evaluate((h) => { location.hash = h; window.Final.render(); }, hash);
  };
  for (const font of Themes.FONTS) {
    for (const palette of Themes.PALETTES) {
      for (const mode of BOTH) {
        for (const state of ['readouts', 'passing', 'timer', 'ringing', 'break&bar=segment']) {
          await go(`${state}&mode=${mode}&font=${font.id}&palette=${palette.id}&shot=1`);
          const checks = await page.evaluate(pageChecks, false);
          const axe = await runAxe(page);
          report.sweep.push({ font: font.id, palette: palette.id, mode, state, digitRatio: checks.digitRatio, digitFits: checks.digitFits, overlaps: checks.overlaps, clipped: checks.clipped, axe });
        }
      }
    }
  }
  // The theme picker (every preview drawn) in every palette x mode.
  for (const palette of Themes.PALETTES) {
    for (const mode of BOTH) {
      await go(`look&mode=${mode}&palette=${palette.id}&shot=1`);
      const axe = await runAxe(page);
      report.sweep.push({ font: '(theme)', palette: palette.id, mode, state: 'look', axe, overlaps: [], clipped: [] });
    }
  }
  // Fonts: tabular digits (all ten the same width) and lining figures (the
  // digits share a baseline and height), as each face actually renders here.
  report.fonts = await page.evaluate((fonts) => {
    return fonts.map((f) => {
      document.documentElement.dataset.font = f.id;
      const cs = getComputedStyle(document.documentElement);
      const family = cs.getPropertyValue('--font-digits');
      const probe = document.createElement('span');
      probe.style.cssText = `position:absolute;font-family:${family};font-size:200px;font-variant-numeric:tabular-nums lining-nums;white-space:pre`;
      document.body.append(probe);
      const widths = [...'0123456789'].map((d) => {
        probe.textContent = d;
        return probe.getBoundingClientRect().width;
      });
      probe.remove();
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `200px ${family}`;
      const tops = [...'0123456789'].map((d) => ctx.measureText(d).actualBoundingBoxAscent);
      const bottoms = [...'0123456789'].map((d) => ctx.measureText(d).actualBoundingBoxDescent);
      // The first face in the stack that is installed: with it installed,
      // "Face", monospace and "Face", serif measure the same.
      const used = (() => {
        const c = document.createElement('canvas').getContext('2d');
        const w = (f) => {
          c.font = `40px ${f}`;
          return c.measureText('0123456789 il mW abc').width;
        };
        for (const name of family.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))) {
          if (['serif', 'sans-serif', 'monospace', 'cursive'].includes(name)) return `${name} (generic)`;
          if (w(`"${name}", monospace`) === w(`"${name}", serif`)) return name;
          if (name === 'system-ui' && w('system-ui, monospace') === w('system-ui, serif')) return name;
        }
        return '(none)';
      })();
      return {
        font: f.id,
        renderedWith: used,
        tabular: Math.max(...widths) - Math.min(...widths) < 0.5,
        lining: Math.max(...bottoms) < 6 && Math.max(...tops) - Math.min(...tops) < 12,
        widthSpread: +(Math.max(...widths) - Math.min(...widths)).toFixed(2),
        descent: +Math.max(...bottoms).toFixed(1),
      };
    });
  }, Themes.FONTS);
  await context.close();
}

if (!SWEEP_ONLY) {
  // Contact sheets: every shot at one size (and extra) on one page.
  const contact = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const cpage = await contact.newPage();
  const groups = {};
  for (const s of shots) {
    const theme = /theme=/.test(s.extra);
    const key = theme ? `${s.w}x${s.h}-themes` : `${s.w}x${s.h}${s.extra ? '-variants' : ''}`;
    (groups[key] ||= []).push(s);
  }
  for (const [key, list] of Object.entries(groups)) {
    const w = list[0].w;
    const cols = w >= 1280 ? 3 : w >= 480 ? 6 : w >= 390 ? 8 : 6;
    const html = `<!doctype html><body style="margin:0;padding:12px;background:#777;font:14px system-ui">
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px">
      ${list.map((s) => `<figure style="margin:0"><img src="${pathToFileURL(s.file).href}" style="width:100%;display:block;outline:1px solid #000"><figcaption style="color:#fff">${s.state} · ${s.mode}${s.extra ? ' · ' + s.extra : ''}</figcaption></figure>`).join('')}
      </div></body>`;
    const tmp = path.join(outDir, 'contact', `${key}.html`);
    fs.writeFileSync(tmp, html);
    await cpage.goto(pathToFileURL(tmp).href);
    await cpage.waitForLoadState('load');
    await cpage.screenshot({ path: path.join(outDir, 'contact', `${key}.png`), fullPage: true });
  }
  await contact.close();
}
await browser.close();

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

// ---------- summary ----------
console.log(axeSource ? `axe-core: ${AXE}` : 'axe-core NOT FOUND: accessibility scan skipped');
const label = (r) => `${r.size} ${r.state}-${r.mode}${r.extra ? ' [' + r.extra + ']' : ''}`;
if (report.shots.length) {
  const rows = report.shots;
  const axeIssues = rows.flatMap((r) => (r.axe || []).map((v) => `${label(r)}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).join(' | ')}`));
  const issues = rows.flatMap((r) => [
    ...(r.pageScroll ? [`${label(r)}: page scrolls`] : []),
    ...r.clipped.map((c) => `${label(r)}: clipped ${c}`),
    ...r.overlaps.map((c) => `${label(r)}: overlap ${c}`),
    ...r.decoOverlaps.map((c) => `${label(r)}: decoration over ${c}`),
    ...r.badWords.map((c) => `${label(r)}: shows "${c}"`),
    ...r.smallTargets.map((c) => `${label(r)}: small target ${c}`),
    ...r.errors.map((c) => `${label(r)}: page error ${c}`),
    ...(r.digitFits ? [] : [`${label(r)}: big digits don't fit`]),
    ...(r.reducedMotionFlash && r.reducedMotionFlash !== 'steady (no animation)' ? [`${label(r)}: flash animates under reduced motion`] : []),
  ]);
  const ratios = rows.filter((r) => r.size === '1920x1080' && r.mode === 'dark' && !r.extra && r.digitRatio).map((r) => `${r.state} ${r.digitRatio}`);
  const flash = rows.find((r) => r.state === 'ringing' && r.size === '1920x1080')?.flash;
  console.log(`\n=== shots: ${rows.length}`);
  console.log(`digit height / viewport height @1920x1080 dark: ${ratios.join(', ')}`);
  console.log(`ringing flash: ${JSON.stringify(flash)}`);
  console.log(`axe violations: ${axeIssues.length}`);
  axeIssues.slice(0, 40).forEach((l) => console.log('  ' + l));
  console.log(`layout issues: ${issues.length}`);
  issues.slice(0, 80).forEach((l) => console.log('  ' + l));
}
if (report.sweep.length) {
  const rows = report.sweep;
  const bad = rows.filter((r) => (r.axe || []).length || r.digitFits === false || r.overlaps.length || r.clipped.length);
  const minRatio = rows.filter((r) => r.digitRatio).reduce((a, r) => (r.digitRatio < a.digitRatio ? r : a));
  const byState = {};
  for (const r of rows.filter((x) => x.digitRatio)) {
    const k = r.state;
    byState[k] ||= { min: 1, max: 0 };
    byState[k].min = Math.min(byState[k].min, r.digitRatio);
    byState[k].max = Math.max(byState[k].max, r.digitRatio);
  }
  console.log(`\n=== sweep: ${rows.length} renders (${Themes.FONTS.length} fonts x ${Themes.PALETTES.length} palettes x 2 modes x 5 states, + picker per palette x mode)`);
  console.log(`digit height range by state: ${Object.entries(byState).map(([k, v]) => `${k} ${v.min}-${v.max}`).join(', ')}`);
  console.log(`lowest: ${minRatio.font}/${minRatio.palette}/${minRatio.state} ${minRatio.digitRatio}`);
  console.log(`renders with problems: ${bad.length}`);
  bad.slice(0, 40).forEach((r) => console.log(`  ${r.font}/${r.palette}/${r.mode}/${r.state}: ${[...(r.axe || []).map((v) => v.id + ' ' + v.nodes[0]), r.digitFits === false ? 'digits do not fit' : '', ...r.overlaps.map((o) => 'overlap ' + o), ...r.clipped.map((o) => 'clipped ' + o)].filter(Boolean).join('; ')}`));
}
if (report.fonts.length) {
  console.log('\n=== fonts (as rendered on this machine)');
  for (const f of report.fonts) console.log(`  ${f.font.padEnd(10)} ${String(f.renderedWith).padEnd(24)} tabular ${f.tabular ? 'yes' : 'NO (spread ' + f.widthSpread + ')'} · lining ${f.lining ? 'yes' : 'NO (descent ' + f.descent + ')'}`);
}
