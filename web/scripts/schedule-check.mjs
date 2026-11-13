// @ts-check
// Screenshots and checks the real schedule pages (Lesson Planning,
// lesson-planning.html, and Full Schedule, teacher.html) in Chromium, across
// page states and sizes.
//
//   npm run check:schedule                        every page state at every size
//   npm run check:schedule -- --page planning     one page state (repeatable): planning, full-short, full-busy
//   npm run check:schedule -- --size 375x667      one size (repeatable); a size not in SIZES is a
//                                                 touch screen when under 1024px wide
//   npm run check:schedule -- --no-shots          checks only, no PNGs
//
// The pages and sizes are PAGES and SIZES in schedule-check-matrix.js. For
// each page state × size it saves a full-page screenshot, runs axe, records
// page errors, and checks:
// - the page doesn't scroll sideways (document scrollWidth <= the viewport's width);
// - a schedule table whose days each have at most one Lesson fits its pane
//   without scrolling sideways (ticket 02: a short day fits a portrait phone);
// - every day row's cells (Day Index, Date, Lessons, Delete Day) share one
//   top and one bottom edge, so the row's borders form straight lines
//   (ticket 09); report.json also records each day row's height;
// - every Insert Day "+" sits in the table's left gutter, centred on the line
//   between days it belongs to, and every table has one below its last
//   day (ticket 10);
// - axe also runs with the lesson actions menu and the Link Lesson popup
//   open (POPUPS), so a pop-up outside the page's landmarks is caught;
// - on touch sizes, every control in the schedule rows is at least 44px tall
//   and 44px wide, except the narrower widths TAP_EXCEPTIONS accepts, each
//   with its reason.
// Failures found but not yet fixed (KNOWN_FAILURES, each with a note) report
// as known and don't fail the run; one that no longer shows does (so the list
// can't go stale: remove its entry). Results go to .schedule-check/
// (gitignored): one PNG per render plus report.json. Exits 1 on any
// unexpected failure or stale known one.
//
// Data: the pages import the Firebase SDK from gstatic; the check serves a
// fake in its place (schedule-check-firebase.js) holding the fixture database
// (schedule-check-fixtures.js), and fixes the browser's clock to its day, so
// no emulator, network or login is needed. The teacher password gate is
// passed by seeding a signed-in session, so the dev-bypass banner doesn't
// show.
//
// It starts its own Vite server on 127.0.0.1 (a free port) and always stops it
// and the browser on exit, including Ctrl-C, so nothing is left running.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { checkOutput, startServer, recordPageErrors, axeViolations, webDir } from './page-check-browser.mjs';
import { parseArgs, describeFailure, classify, TAP_EXCEPTIONS } from './schedule-check-matrix.js';
import { buildFixtureDb, TODAY } from './schedule-check-fixtures.js';

const { outDir, resetOutDir, report } = checkOutput('.schedule-check');
const FAKE_FIREBASE = readFileSync(resolve(webDir, 'scripts/schedule-check-firebase.js'), 'utf8');
/** Mid-morning on the fixture's day, in the school's time zone. */
const NOW = new Date(`${TODAY}T10:00:00-08:00`);
const TIMEZONE = 'America/Los_Angeles';

/** The pop-ups axe also checks while open: what to click to open one, and what shows. */
const POPUPS = [
  { name: 'the lesson actions menu', open: '.action-menu-btn', shows: '[role="menu"]' },
  { name: 'the Link Lesson popup', open: '[aria-label="Link Lesson"]', shows: '.lesson-popup' },
];

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (e) {
  console.error(`check:schedule: ${e.message}`);
  process.exit(1);
}
resetOutDir();

/** @type {import('playwright').Browser | undefined} */
let browser;
let closeServer = async () => {};
const stop = async () => {
  await browser?.close().catch(() => {});
  await closeServer();
};

const started = Date.now();
const results = [];
try {
  const { origin, close } = await startServer(stop);
  closeServer = close;
  browser = await chromium.launch();
  for (const size of opts.sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      hasTouch: size.touch,
      isMobile: size.touch,
      timezoneId: TIMEZONE,
      locale: 'en-US',
    });
    await context.route('https://www.gstatic.com/firebasejs/**', (route) => route.fulfill({
      contentType: 'text/javascript',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: FAKE_FIREBASE,
    }));
    await context.addInitScript((db) => {
      /** @type {any} */ (window).__scheduleCheckDb = db;
      // A signed-in teacher session (teacher-auth.js) that doesn't expire.
      localStorage.setItem('teacherAuthSession', 'authenticated');
      localStorage.setItem('teacherAuthTimeout', String(Number.MAX_SAFE_INTEGER));
    }, buildFixtureDb());
    try {
      for (const { name, url } of opts.pages) {
        const page = await context.newPage();
        await page.clock.setFixedTime(NOW);
        const result = await checkPage(page, `${origin}/${url}`, size);
        const file = `${name}-${size.label}.png`;
        if (opts.shots) await page.screenshot({ path: resolve(outDir, file), fullPage: true });
        results.push({ page: name, size: size.label, width: size.width, url, ...result, shot: opts.shots ? file : null });
        await page.close();
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await stop();
}

const { renders, stale } = classify(results);
const failed = renders.filter((r) => r.unexpected.length);
const knownCount = renders.filter((r) => r.known.length).length;
report(renders, [
  ...failed.map((r) => `${r.page} @ ${r.size}: ${r.unexpected.join('; ')}`),
  ...stale.map((k) => `stale known failure (no longer seen; remove it from KNOWN_FAILURES): ${k.failure}`),
]);
console.log(`${renders.length - failed.length}/${renders.length} renders passed (${knownCount} with known failures, KNOWN_FAILURES in schedule-check-matrix.js) in ${((Date.now() - started) / 1000).toFixed(1)}s. Screenshots and report.json in ${outDir}`);
process.exitCode = failed.length || stale.length || !renders.length ? 1 : 0;

/**
 * Opens the page, waits for its schedule tables, and checks the render.
 * @param {import('playwright').Page} page @param {string} url
 * @param {import('./schedule-check-matrix.js').Size} size
 */
async function checkPage(page, url, size) {
  const errors = recordPageErrors(page);
  await page.goto(url);
  // Loaded once no spinner shows and every schedule table has its rows.
  await page.waitForFunction(() => !document.querySelector('.loading-spinner:not([hidden])')?.getClientRects().length
    && [...document.querySelectorAll('.schedule-table, #scheduleTable')].some((t) => t.getClientRects().length), null, { timeout: 10000 })
    .catch(() => errors.push('the schedule never finished loading'));
  // Full Schedule scrolls (smoothly) to today's row; wait until it shows.
  await page.waitForFunction(() => {
    const row = document.querySelector('#schedulePane .today-row');
    const pane = row?.closest('#schedulePane');
    if (!row || !pane) return true;
    const [r, p] = [row.getBoundingClientRect(), pane.getBoundingClientRect()];
    return r.top >= p.top && r.bottom <= p.bottom + 1;
  }, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  const measured = await page.evaluate(([exceptionSelectors, touch]) => {
    const tables = [...document.querySelectorAll('.schedule-table, #scheduleTable')].filter((t) => t.getClientRects().length);
    /** A schedule table's name in reports: its pane's heading, or Full Schedule's Class. @param {Element} table */
    const tableName = (table) => table.closest('.lesson-planning-pane')?.querySelector('h2')?.textContent
      ?? /** @type {HTMLSelectElement | null} */ (document.getElementById('classSelect'))?.selectedOptions[0]?.textContent ?? 'schedule';
    const shortTables = tables.flatMap((table) => {
      const rows = [...table.querySelectorAll('tbody tr')];
      const lessonsPerDay = Math.max(0, ...rows.map((row) => row.querySelectorAll('.lesson-cluster').length));
      if (lessonsPerDay > 1) return [];
      // The pane scrolls sideways when the table is wider than it.
      const pane = /** @type {HTMLElement} */ (table.parentElement);
      const contentWidth = Math.max(pane.scrollWidth, Math.ceil(table.getBoundingClientRect().width));
      return [{ name: tableName(table), lessonsPerDay, contentWidth, paneWidth: pane.clientWidth }];
    });
    const controls = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    const targets = touch ? tables.flatMap((table) => [...table.querySelectorAll(`tbody :is(${controls})`)])
      .filter((el) => el.getClientRects().length)
      .map((el) => {
        const box = el.getBoundingClientRect();
        const text = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim() || el.tagName.toLowerCase();
        return {
          label: `${text.slice(0, 30)} (.${[...el.classList].join('.') || el.tagName.toLowerCase()})`,
          width: box.width,
          height: box.height,
          exceptions: exceptionSelectors.flatMap((selector, i) => el.matches(selector) ? [i] : []),
        };
      }) : null;
    /** A day row's name in reports: its table's name and its Day Index. @param {Element} table @param {Element} tr */
    const rowLabel = (table, tr) => `${tableName(table)} day ${tr.querySelector('.day-index-cell')?.firstChild?.textContent}`;
    // Day rows: rows with a Day Index cell (Full Schedule's last row, the next day to add, counts).
    const cellNames = { 'day-index-cell': 'Day Index', 'date-cell': 'Date', 'lessons-cell': 'Lessons', 'day-actions-cell': 'Delete Day' };
    const rows = tables.flatMap((table) => [...table.querySelectorAll('tbody tr')]
      .filter((tr) => tr.querySelector(':scope > .day-index-cell') && tr.getClientRects().length)
      .map((tr) => {
        const cells = [...tr.children].map((td) => {
          const box = td.getBoundingClientRect();
          const name = Object.entries(cellNames).find(([cls]) => td.classList.contains(cls))?.[1] ?? td.className;
          return { name, top: box.top + scrollY, bottom: box.bottom + scrollY };
        });
        const lessons = tr.querySelectorAll('.lesson-cluster').length;
        const box = tr.getBoundingClientRect();
        return { label: `${rowLabel(table, tr)} (${lessons} Lesson${lessons === 1 ? '' : 's'})`, lessons, height: box.height, cells };
      }));
    // Insert Day "+"s: each glyph's centre, its gutter and the line it belongs on.
    const pluses = tables.flatMap((table) => [...table.querySelectorAll('.insert-day-btn')]
      .filter((btn) => btn.getClientRects().length)
      .map((btn) => {
        const glyph = /** @type {Element} */ (btn.querySelector('.text-icon') ?? btn).getBoundingClientRect();
        const tr = /** @type {HTMLTableRowElement} */ (btn.closest('tr'));
        const row = tr.getBoundingClientRect();
        const pane = /** @type {HTMLElement} */ (table.parentElement);
        const below = btn.classList.contains('insert-day-below');
        return {
          label: `${below ? 'below' : 'above'} ${rowLabel(table, tr)}`,
          x: glyph.left + glyph.width / 2 + scrollX,
          y: glyph.top + glyph.height / 2 + scrollY,
          gutterLeft: pane.getBoundingClientRect().left + pane.clientLeft + scrollX,
          gutterRight: table.getBoundingClientRect().left + scrollX,
          line: (below ? row.bottom : row.top) + scrollY,
        };
      }));
    // The "+" below the last day (ticket 10), on both pages.
    const tablesWithoutEndPlus = tables.filter((table) => !table.querySelector('.insert-day-below')).map(tableName);
    return {
      pluses,
      tablesWithoutEndPlus,
      scrollWidth: document.documentElement.scrollWidth,
      shortTables,
      targets,
      rows,
      coarse: matchMedia('(pointer: coarse)').matches,
    };
  }, /** @type {[string[], boolean]} */ ([TAP_EXCEPTIONS.map((e) => e.selector), size.touch]));
  const pageViolations = await axeViolations(page);
  const violations = [...pageViolations, ...await popupViolations(page, pageViolations)];
  const checked = { ...measured, touch: size.touch, viewportWidth: size.width, errors, violations };
  return { failures: describeFailure(checked), ...checked };
}

/**
 * axe's findings with each of POPUPS open in turn (a pop-up mounted outside
 * the page's landmarks fails axe's "region" rule) that the page without it
 * didn't already have; each is closed again after.
 * @param {import('playwright').Page} page @param {string[]} pageViolations
 * @returns {Promise<string[]>}
 */
async function popupViolations(page, pageViolations) {
  const found = [];
  for (const { name, open, shows } of POPUPS) {
    const opener = page.locator(open).first();
    if (!await opener.count()) continue;
    // Scroll first and let it settle: a scroll closes the ⋮ menu (it is placed against its button).
    await opener.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await opener.click();
    const shown = await page.locator(shows).first().waitFor({ timeout: 3000 }).then(() => true, () => false);
    if (!shown) {
      found.push(`${name} never opened`);
      continue;
    }
    const added = (await axeViolations(page)).filter((v) => !pageViolations.includes(v));
    found.push(...added.map((v) => `with ${name} open, ${v}`));
    await page.keyboard.press('Escape');
    await page.locator(shows).first().waitFor({ state: 'detached', timeout: 3000 })
      .catch(() => found.push(`${name} didn't close on Escape`));
  }
  return found;
}
