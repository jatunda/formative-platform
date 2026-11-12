// @ts-check
// What the School Clock's browser check renders, and how its results read: the
// default states and sizes (clock-check.mjs), the full layout matrix and the
// failures already ticketed (clock-check-full.mjs). Pure, so it's unit-tested;
// the browser driving is in clock-check-browser.mjs.

/** One moment per kind of state, on real 2026–27 dates (HS unless --division MS). */
export const DEFAULT_STATES = {
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
export const DEFAULT_SIZES = ['1920x1080', '1440x900', '1280x720', '480x320', '390x844'];
/** Phones shorter than 390 × 844, where the stage and the agenda's three rows have least room. */
export const SHORT_PHONES = ['375x667', '360x740'];

/** The Readouts each run shows: null is a new tab's one Readout (the state's own mode). */
const LAYOUTS = [[null, '1r'], ['countdown,clock', '2r'], ['countdown,clock,countup', '3r']];

/**
 * @typedef {{ layout: string | null, editing: boolean, timer: boolean, soundOn: boolean }} Config
 * What a render shows besides its state and size: the Readouts' modes, big one
 * first (null for a new tab's one), edit mode, the timer, sound already on.
 * @typedef {{ name: string, config: Config, states: string[], sizes: string[] }} Run
 * One clock-check pass: this config, every state at every size.
 * @typedef {{ config: Config, state: string, size: string }} Render
 */

/**
 * Every combination where layout bugs have hidden: one, two and three
 * Readouts × edit mode × the timer × the sound prompt, each at every default
 * state and every default size plus the short phones. The date outside every
 * School Year shows only the time (no layout, edit mode or timer), so it runs
 * once per sound setting instead of under each of those.
 * @returns {Run[]}
 */
export function fullMatrix() {
  const sizes = [...DEFAULT_SIZES, ...SHORT_PHONES];
  const states = Object.keys(DEFAULT_STATES).filter((s) => s !== 'unknown');
  /** @type {Run[]} */
  const runs = [];
  for (const soundOn of [false, true]) {
    const sound = soundOn ? '-soundon' : '';
    for (const [layout, label] of LAYOUTS) {
      for (const editing of [false, true]) {
        for (const timer of [false, true]) {
          const name = `${label}${editing ? '-edit' : ''}${timer ? '-timer' : ''}${sound}`;
          runs.push({ name, config: { layout, editing, timer, soundOn }, states, sizes });
        }
      }
    }
    runs.push({ name: `time-only${sound}`, config: { layout: null, editing: false, timer: false, soundOn }, states: ['unknown'], sizes });
  }
  return runs;
}

/**
 * @typedef {Partial<Omit<Config, 'layout'>> & { layouts?: (string | null)[], states?: string[], sizes?: string[] }} Match
 * Which renders a known failure covers: each named field must match (a
 * Config's flag, or one of a list of layouts, states or sizes), and a field
 * left out matches any value.
 * @typedef {{ ticket: number, match: Match }} KnownFailure
 */

/**
 * Failures already ticketed, which the full run reports as known instead of
 * failing on. Each must match exactly the renders that fail: one that starts
 * passing fails the run, so a fix shows up here and its entry is removed.
 * @type {KnownFailure[]}
 */
export const KNOWN_FAILURES = [];

/** A Config's on/off fields, which a Match names as is. @type {('editing' | 'timer' | 'soundOn')[]} */
const FLAGS = ['editing', 'timer', 'soundOn'];

/**
 * Whether `match` covers `render`.
 * @param {Render} render @param {Match} match
 */
function covers({ config, state, size }, match) {
  return (match.layouts === undefined || match.layouts.includes(config.layout))
    && FLAGS.every((flag) => match[flag] === undefined || match[flag] === config[flag])
    && (match.states === undefined || match.states.includes(state))
    && (match.sizes === undefined || match.sizes.includes(size));
}

/**
 * How a checked render counts in the full run: passed, a ticketed failure
 * (known), a ticketed failure that now passes (stale), or unexpected.
 * @param {Render & { ok: boolean }} render @param {KnownFailure[]} [known]
 * @returns {{ outcome: 'passed' | 'unexpected' } | { outcome: 'known' | 'stale', ticket: number }}
 */
export function classify(render, known = KNOWN_FAILURES) {
  const entry = known.find((k) => covers(render, k.match));
  if (entry) return { outcome: render.ok ? 'stale' : 'known', ticket: entry.ticket };
  return { outcome: render.ok ? 'passed' : 'unexpected' };
}

/**
 * The full run's options: `--jobs N`, how many pages render at a time (6
 * unless given). Anything but a positive whole number would start no pages and
 * pass having checked nothing, so it throws instead.
 * @param {string[]} argv @returns {{ jobs: number }}
 */
export function parseFullArgs(argv) {
  let jobs = 6;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--jobs') throw new Error(`Unknown option ${argv[i]}`);
    const value = argv[++i];
    jobs = Number(value);
    if (!/^\d+$/.test(value ?? '') || jobs < 1) throw new Error(`--jobs takes a positive whole number, not ${value ?? 'nothing'}`);
  }
  return { jobs };
}

/**
 * Whether the full run fails: on any unexpected or stale render, or when it
 * checked no renders at all (nothing checked is not a pass).
 * @param {{ outcome: string }[]} results
 */
export function fullRunFailed(results) {
  return !results.length || results.some((r) => r.outcome === 'unexpected' || r.outcome === 'stale');
}

/**
 * What went wrong in one checked render, one phrase per problem (none when it's clean).
 * @param {{ scroll: { x: boolean, y: boolean },
 *   stage: { fits: boolean, above: number, below: number } | null,
 *   agenda: { reachable: boolean, listHeight: number, rowBottom: number, listBottom: number, visible: number } | null,
 *   overlaps: string[], errors: string[], violations: string[] }} r
 * @returns {string[]}
 */
export function describeFailure(r) {
  return [
    r.scroll.x && 'scrolls sideways',
    r.scroll.y && 'scrolls down',
    r.agenda?.reachable === false && `agenda's last row out of reach (list ${r.agenda.listHeight}px tall, row bottom ${Math.round(r.agenda.rowBottom)}, list bottom ${Math.round(r.agenda.listBottom)}, visible height ${r.agenda.visible})`,
    r.stage?.fits === false && `stage spills out of its row (${r.stage.above}px above, ${r.stage.below}px below)`,
    r.overlaps.length > 0 && `ring overlaps ${r.overlaps.join(', ')}`,
    ...r.errors,
    ...r.violations,
  ].filter((why) => typeof why === 'string');
}
