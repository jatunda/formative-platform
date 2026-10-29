// School Clock page controller: a thin DOM layer over the clock model.
// Everything it depends on is passed in (the real clock and the query
// string), so tests drive it with a fake clock. Each tick recomputes the whole
// display from the current time; nothing is counted up or down by ticks, so a
// throttled or sleeping tab is right the moment it ticks again.
import { describeMoment } from './clock-model.js';
import { createClockSource } from './clock-source.js';
import { formatClockTime, formatDate, formatDuration } from './format.js';
import { SCHOOL_YEARS } from './school-years.js';

const TICK_MS = 1000;

let destroyActiveApp = null;

/**
 * The display as a list of [tag, text] lines.
 * @param {Date} now
 * @param {import('./clock-model.js').Moment} moment
 * @param {boolean} simulated
 */
function displayLines(now, moment, simulated) {
  const lines = [];
  if (simulated) {
    lines.push(['p', `Simulated time: ${formatDate(now)}, ${formatClockTime(now, { seconds: true })}`]);
  }
  lines.push(['p', formatClockTime(now, { seconds: true })]);
  if (moment.dayLabel) lines.push(['h1', moment.dayLabel]);

  const upNext = (segment) => ['p', `Up next: ${segment.name} at ${formatClockTime(segment.start)}`];
  switch (moment.state) {
    case 'segment':
      lines.push(
        ['h2', moment.current.name],
        ['p', `${formatClockTime(moment.current.start)} – ${formatClockTime(moment.current.end)}`],
        ['p', `${formatDuration(moment.timeLeftMs)} left`],
        ['p', `${formatDuration(moment.timeElapsedMs)} elapsed`],
      );
      break;
    case 'passing':
      lines.push(
        ['h2', 'Passing Period'],
        ['p', `${formatDuration(moment.timeLeftMs)} left`],
        upNext(moment.upNext),
      );
      break;
    case 'beforeSchool':
      lines.push(
        ['h2', 'Before school'],
        upNext(moment.upNext),
        ['p', `${formatDuration(moment.timeLeftMs)} until school starts`],
      );
      break;
    case 'afterSchool':
      lines.push(
        ['h2', 'After school'],
        ['p', `School ended at ${formatClockTime(new Date(now.getTime() - moment.timeElapsedMs))}`],
        ['p', `${formatDuration(moment.timeElapsedMs)} since school ended`],
      );
      break;
    case 'dayOff':
      lines.push(['p', 'No school today']);
      break;
  }
  return lines;
}

/**
 * Mount the School Clock.
 * @param {{ mountId?: string, search?: string, realNow?: () => number, schoolYears?: object[] }} [options]
 *   `search` is `location.search` (for `?at=` / `&speed=`); `realNow` is the real clock.
 * @returns {{ destroy: () => void } | null} null if the mount element is missing
 */
export function initClockApp({ mountId = 'clockApp', search = '', realNow = Date.now, schoolYears = SCHOOL_YEARS } = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;
  destroyActiveApp?.();

  const clock = createClockSource({ search, realNow });

  function render() {
    const now = new Date(clock.now());
    const moment = describeMoment(now, schoolYears);
    mount.replaceChildren(
      ...displayLines(now, moment, clock.simulated).map(([tag, text]) => {
        const node = document.createElement(tag);
        node.textContent = text;
        return node;
      }),
    );
  }

  render();
  const interval = setInterval(render, TICK_MS);

  function destroy() {
    clearInterval(interval);
    if (destroyActiveApp === destroy) destroyActiveApp = null;
  }
  destroyActiveApp = destroy;
  return { destroy };
}

if (typeof document !== 'undefined' && document.getElementById('clockApp')) {
  initClockApp({ search: window.location.search });
}
