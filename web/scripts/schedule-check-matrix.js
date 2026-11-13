// @ts-check
// What the schedule layout check (schedule-check.mjs) renders and how its
// results read: the pages and sizes, the tap-target trade-offs already
// accepted, and what counts as a failure. Pure, so it's unit-tested; the
// browser driving is in schedule-check.mjs.

/**
 * Each page state, by name: its URL under web/ (data from
 * schedule-check-fixtures.js). Full Schedule opens scrolled to today, as
 * Lesson Planning's Full schedule link opens it.
 */
export const PAGES = {
  planning: 'lesson-planning.html',                         // Lesson Planning: every Class's pane
  'full-short': 'teacher.html?class=short&scroll=today',    // Full Schedule: only 0- and 1-Lesson days
  'full-busy': 'teacher.html?class=busy&scroll=today',      // Full Schedule: a day with several Lessons
};

/**
 * @typedef {{ label: string, width: number, height: number, touch: boolean }} Size
 * `touch`: a touch screen (coarse pointer), where tap targets are checked.
 */

/** @type {Size[]} */
export const SIZES = [
  { label: '375x667', width: 375, height: 667, touch: true },    // portrait phone
  { label: '800x1280', width: 800, height: 1280, touch: true },  // portrait tablet
  { label: '1280x800', width: 1280, height: 800, touch: false }, // laptop, mouse
];

/** The touch minimum for a tap target's height and width (style.css's --touch-min). */
export const TOUCH_MIN = 44;

/**
 * @typedef {{ selector: string, minWidth: number, maxViewportWidth: number, reason: string }} TapException
 * A control (matching `selector`) allowed to be narrower than TOUCH_MIN, down
 * to `minWidth`, at viewports up to `maxViewportWidth` wide. Its height must
 * still reach TOUCH_MIN.
 */

/**
 * Tap targets accepted as narrower than 44px, and why (style.css's
 * `--touch-min-icon` and `--touch-min-menu`). Anything else under 44px fails.
 * @type {TapException[]}
 */
export const TAP_EXCEPTIONS = [
  {
    selector: '.lesson-cluster .action-menu-btn',
    minWidth: 32,
    maxViewportWidth: 600,
    reason: 'The ⋮ glyph is thin; at 44px a one-Lesson day no longer fits a 375px phone (ticket 02), so a phone gives the title the room.',
  },
  {
    selector: '.schedule-icon-btn',
    minWidth: 40,
    maxViewportWidth: 600,
    reason: '➕ New Lesson and 🔗 Link Lesson: 40px wide on a phone so a one-Lesson day fits 375px (ticket 02).',
  },
];

/**
 * @typedef {{ label: string, width: number, height: number, exceptions: number[] }} Target
 * One tap target as measured: `exceptions` are the indexes into the
 * exceptions list of the selectors it matches.
 */

/**
 * Why a tap target is too small on a touch screen `viewportWidth` wide, or
 * null when it's big enough. Sizes round to the nearest half pixel first.
 * @param {Target} target @param {number} viewportWidth @param {TapException[]} [exceptions]
 * @returns {string | null}
 */
export function tapTargetProblem(target, viewportWidth, exceptions = TAP_EXCEPTIONS) {
  const round = (/** @type {number} */ n) => Math.round(n * 2) / 2;
  const [width, height] = [round(target.width), round(target.height)];
  const allowed = target.exceptions
    .map((i) => exceptions[i])
    .filter((e) => e && viewportWidth <= e.maxViewportWidth);
  const minWidth = Math.min(TOUCH_MIN, ...allowed.map((e) => e.minWidth));
  if (height >= TOUCH_MIN && width >= minWidth) return null;
  return `tap target "${target.label}" is ${width}x${height}px (needs ${minWidth}x${TOUCH_MIN})`;
}

/**
 * @typedef {{ name: string, lessonsPerDay: number, contentWidth: number, paneWidth: number }} ShortTable
 * A schedule table with no day over one Lesson: how wide its content is and
 * how wide its pane is.
 * @typedef {{ scrollWidth: number, shortTables: ShortTable[], targets: Target[] | null,
 *   coarse: boolean, touch: boolean, viewportWidth: number, errors: string[], violations: string[] }} Checked
 * One render as measured: `scrollWidth` is the document's; `targets` is null
 * where tap targets aren't checked (a mouse size).
 */

/**
 * What went wrong in one checked render, one phrase per problem (none when it's clean).
 * @param {Checked} r @returns {string[]}
 */
export function describeFailure(r) {
  return [
    r.scrollWidth > r.viewportWidth && `page scrolls sideways (${r.scrollWidth}px wide in ${r.viewportWidth}px)`,
    r.touch !== r.coarse && `expected ${r.touch ? 'a coarse' : 'a fine'} pointer (the browser setup is wrong)`,
    ...r.shortTables
      .filter((t) => t.contentWidth > t.paneWidth)
      .map((t) => `${t.name}: days of at most ${t.lessonsPerDay} Lesson(s) are ${t.contentWidth}px wide in a ${t.paneWidth}px pane`),
    ...(r.targets ?? []).map((t) => tapTargetProblem(t, r.viewportWidth)),
    ...r.errors,
    ...r.violations,
  ].filter((why) => typeof why === 'string');
}

/**
 * @typedef {{ page: string, width: number, touch: boolean }} Render
 * Which page state at what size.
 * @typedef {{ failure: string, pages?: string[], touch?: boolean, maxWidth?: number, note: string }} KnownFailure
 * A failure already found and not yet fixed: a failure phrase that starts
 * with `failure`, on the renders it covers (each field given must match: one
 * of `pages`, a touch or mouse size, a viewport up to `maxWidth` wide).
 */

/**
 * Failures the check found in the pages as they were when it was written,
 * reported as known instead of failing the run. One that no longer shows on
 * any render it covers is stale and fails the run, so a fix shows up here and
 * its entry is removed.
 * @type {KnownFailure[]}
 */
export const KNOWN_FAILURES = [
  {
    failure: 'tap target "+ Insert Day Here',
    touch: true,
    note: 'The Insert Day Here buttons between days are about 22px tall on touch screens. Making them 44px makes every gap between days twice as tall: a design call for Eric.',
  },
  {
    failure: 'tap target "Delete day ',
    touch: true,
    maxWidth: 600,
    note: 'The 🗑 Delete Day button is about 29px wide on a phone; a wider one would squeeze the Lessons column (ticket 02).',
  },
  {
    failure: 'color-contrast: 1 node(s)',
    pages: ['planning'],
    note: 'The red Logout button (white on #e53e3e, 4.1:1; 4.5:1 is the minimum): accepted by Eric.',
  },
  {
    failure: 'color-contrast: 2 node(s)',
    pages: ['full-short', 'full-busy'],
    note: 'The red Logout button (4.1:1) and the green Go to Today button (white on #28a745, 3.1:1): accepted by Eric.',
  },
  {
    failure: 'empty-table-header:',
    note: 'The day actions column (🗑) has an empty header cell: accepted by Eric (a header word would widen the column for no gain).',
  },
];

/**
 * Whether a known failure's fields cover a render.
 * @param {KnownFailure} known @param {Render} render
 */
function covers(known, render) {
  return (known.pages === undefined || known.pages.includes(render.page))
    && (known.touch === undefined || known.touch === render.touch)
    && (known.maxWidth === undefined || render.width <= known.maxWidth);
}

/**
 * Sorts a run's failures into known ones and unexpected ones, and finds the
 * known failures that are stale: they cover at least one render of the run
 * but none of those renders showed them.
 * @template {Render & { failures: string[] }} R
 * @param {R[]} renders @param {KnownFailure[]} [known]
 * @returns {{ renders: (R & { unexpected: string[], known: string[] })[], stale: KnownFailure[] }}
 */
export function classify(renders, known = KNOWN_FAILURES) {
  /** @type {Set<KnownFailure>} */
  const seen = new Set();
  const sorted = renders.map((render) => {
    /** @type {string[]} */
    const unexpected = [];
    /** @type {string[]} */
    const knownHere = [];
    for (const failure of render.failures) {
      const entry = known.find((k) => covers(k, render) && failure.startsWith(k.failure));
      if (entry) { seen.add(entry); knownHere.push(failure); } else unexpected.push(failure);
    }
    return { ...render, unexpected, known: knownHere };
  });
  const stale = known.filter((k) => !seen.has(k) && renders.some((r) => covers(k, r)));
  return { renders: sorted, stale };
}

/**
 * The command line: `--page NAME` and `--size WxH` (each repeatable; a size
 * not in SIZES is a touch screen when its width is under 1024px), and
 * `--no-shots`.
 * @param {string[]} argv
 * @returns {{ pages: { name: string, url: string }[], sizes: Size[], shots: boolean }}
 */
export function parseArgs(argv) {
  /** @type {string[]} */
  const pageArgs = [];
  /** @type {string[]} */
  const sizeArgs = [];
  let shots = true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--page') pageArgs.push(argv[++i]);
    else if (arg === '--size') sizeArgs.push(argv[++i]);
    else if (arg === '--no-shots') shots = false;
    else throw new Error(`Unknown option ${arg}`);
  }
  const pages = (pageArgs.length ? pageArgs : Object.keys(PAGES)).map((name) => {
    if (!(name in PAGES)) throw new Error(`Unknown page ${name}; one of ${Object.keys(PAGES).join(', ')}`);
    return { name, url: PAGES[/** @type {keyof typeof PAGES} */ (name)] };
  });
  const sizes = sizeArgs.length ? sizeArgs.map((label) => {
    const known = SIZES.find((s) => s.label === label);
    if (known) return known;
    if (!/^\d+x\d+$/.test(label ?? '')) throw new Error(`--size takes WIDTHxHEIGHT, not ${label ?? 'nothing'}`);
    const [width, height] = label.split('x').map(Number);
    return { label, width, height, touch: width < 1024 };
  }) : SIZES;
  return { pages, sizes, shots };
}
