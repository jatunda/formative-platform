// @ts-check
// Runs the School Clock's browser check (clock-check.mjs, which lists the
// checks) across the whole layout matrix, where layout bugs have hidden:
//
//   npm run check:clock:full               the whole matrix, 6 pages at a time
//   npm run check:clock:full -- --jobs 3   fewer at a time (a slower machine)
//
// The matrix, and why it's pruned where it is, is fullMatrix() in
// clock-check-matrix.js.
//
// Failures already ticketed (KNOWN_FAILURES in clock-check-matrix.js) report as
// "known (ticket NN)" and don't fail the run; one that starts passing does (so
// the list can't go stale: remove its entry). Prints one summary and exits 1
// on any unexpected or stale result, or when it checked no renders. Screenshots of failing renders (named
// run-state-size.png) and report.json go to .clock-check/ (gitignored).
//
// It starts its own Vite server and browsers and always stops them on exit,
// including Ctrl-C, so nothing is left running.
import { startClockCheck, outDir, resetOutDir, report } from './clock-check-browser.mjs';
import { DEFAULT_STATES, fullMatrix, classify, describeFailure, parseFullArgs, fullRunFailed } from './clock-check-matrix.js';

let jobs;
try {
  ({ jobs } = parseFullArgs(process.argv.slice(2)));
} catch (e) {
  console.error(`check:clock:full: ${e.message}`);
  process.exit(1);
}

resetOutDir();

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
      const checked = await check.checkSize(opts, size, `${run.name}-`);
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

/** @param {string} outcome */
const by = (outcome) => results.filter((r) => r.outcome === outcome);
report(results, [
  ...by('unexpected').map((r) => `${r.run} ${r.state} @ ${r.size}: ${describeFailure(r).join('; ')}`),
  ...by('stale').map((r) => `${r.run} ${r.state} @ ${r.size}: passes, but is listed as known (ticket ${r.ticket}); remove it from KNOWN_FAILURES`),
]);
const known = by('known');
const tickets = [...new Set(known.map((r) => r.ticket))];
const knownText = tickets.map((t) => `${known.filter((r) => r.ticket === t).length} known (ticket ${t})`).join(', ');
console.log(`${by('passed').length}/${results.length} renders passed${knownText ? `, ${knownText}` : ''}, `
  + `${by('unexpected').length} unexpected, ${by('stale').length} stale, in ${seconds}s. Failing screenshots and report.json in ${outDir}`);
process.exitCode = fullRunFailed(results) ? 1 : 0;
