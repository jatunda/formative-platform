// Runs the School Clock's browser check (clock-check.mjs, which lists the
// checks) across the whole layout matrix, where layout bugs have hidden:
//
//   npm run check:clock:full               the matrix below, 6 pages at a time
//   npm run check:clock:full -- --jobs 3   fewer at a time (a slower machine)
//
// The matrix (fullMatrix() in clock-check-matrix.js, its one home):
//   Readouts: one (a new tab's own), two (countdown,clock), three (countdown,clock,countup)
//   × edit mode off and on × the timer in the big spot or not
//   × the sound prompt showing or sound already on
//   × every default state × the default sizes plus the short phones 375x667 and 360x740
// Pruned: the date outside every School Year ("unknown") shows only the time,
// with no Readouts button, layout or timer, so it runs once per sound setting
// and size rather than under each layout, edit mode and timer (renders that
// can't differ). That leaves 10 states × 24 runs × 7 sizes + 14 = 1694 renders.
//
// Failures already ticketed (KNOWN_FAILURES in clock-check-matrix.js) report as
// "known (ticket NN)" and don't fail the run; one that starts passing does (so
// the list can't go stale: remove its entry). Prints one summary and exits 1
// on any unexpected or stale result. Screenshots of failing renders (named
// run-state-size.png) and report.json go to .clock-check/ (gitignored).
//
// It starts its own Vite server and browsers and always stops them on exit,
// including Ctrl-C, so nothing is left running.
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { startClockCheck, webDir } from './clock-check-browser.mjs';
import { DEFAULT_STATES, fullMatrix, classify, describeFailure, parseFullArgs, fullRunFailed } from './clock-check-matrix.js';

let jobs;
try {
  ({ jobs } = parseFullArgs(process.argv.slice(2)));
} catch (e) {
  console.error(`check:clock:full: ${e.message}`);
  process.exit(1);
}

const outDir = resolve(webDir, '.clock-check');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// One task per run × size: a browser context rendering that run's states.
const tasks = fullMatrix().flatMap((run) => run.sizes.map((label) => {
  const [width, height] = label.split('x').map(Number);
  return { run, size: { label, width, height } };
}));

const started = Date.now();
const results = [];
const check = await startClockCheck();
try {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const { run, size } = tasks[next++];
      const opts = {
        ...run.config, states: run.states.map((name) => ({ name, query: DEFAULT_STATES[name] })),
        division: 'HS', settings: {}, bars: 0, axe: true, shots: /** @type {const} */ ('failures'),
      };
      const checked = await check.checkSize(opts, size, { outDir, prefix: `${run.name}-` });
      for (const r of checked) {
        const render = { run: run.name, config: run.config, ...r };
        results.push({ ...render, ...classify(render) });
      }
    }
  };
  await Promise.all(Array.from({ length: jobs }, worker));
} finally {
  await check.stop();
}
const seconds = Math.round((Date.now() - started) / 1000);

writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(results, null, 2));
const by = (outcome) => results.filter((r) => r.outcome === outcome);
for (const r of by('unexpected')) console.log(`✗ ${r.run} ${r.state} @ ${r.size}: ${describeFailure(r).join('; ')}`);
for (const r of by('stale')) console.log(`✗ ${r.run} ${r.state} @ ${r.size}: passes, but is listed as known (ticket ${r.ticket}); remove it from KNOWN_FAILURES`);
const known = by('known');
const tickets = [...new Set(known.map((r) => r.ticket))];
const knownText = tickets.map((t) => `${known.filter((r) => r.ticket === t).length} known (ticket ${t})`).join(', ');
console.log(`${by('passed').length}/${results.length} renders passed${knownText ? `, ${knownText}` : ''}, `
  + `${by('unexpected').length} unexpected, ${by('stale').length} stale, in ${seconds}s. Failing screenshots and report.json in ${outDir}`);
process.exitCode = fullRunFailed(results) ? 1 : 0;
