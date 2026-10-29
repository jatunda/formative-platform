// School Clock page controller: a thin DOM layer over the clock model.
// Everything it depends on is passed in (the real clock and the query
// string), so tests drive it with a fake clock. Each tick recomputes the whole
// display from the current time; nothing is counted up or down by ticks, so a
// throttled or sleeping tab is right the moment it ticks again.
import { alarmsAfterRinging, describeMoment, ringsInWindow } from './clock-model.js';
import { SAMPLE_SETTINGS } from './clock-settings.js';
import { createClockSource } from './clock-source.js';
import { formatClockTime, formatDate, formatDuration, formatLongDuration, formatShortDate } from './format.js';
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
  if (moment.state === 'summer') lines.push(['h1', `Day ${moment.summerDay} of Summer`]);
  else if (moment.dayLabel) lines.push(['h1', moment.dayLabel]);

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
        ['p', `School ended at ${formatClockTime(moment.schoolEndedAt)}`],
      );
      break;
  }

  // Off-Hours: when school is back (before school, "Up next" already says),
  // and how long since it ended.
  if (moment.nextSchoolDay && moment.state !== 'beforeSchool') {
    const lead = moment.state === 'summer' ? 'First day' : 'Next school day';
    const start = formatShortDate(moment.nextSchoolDay.firstSegment.start);
    lines.push(['p', `${lead}: ${start} · starts in ${formatLongDuration(moment.untilNextSchoolDayMs)}`]);
  }
  if (moment.schoolEndedAt) {
    lines.push(['p', `${formatLongDuration(moment.sinceSchoolEndedMs)} since school ended`]);
  }
  return lines;
}

const SOUND_NAMES = { chime: 'Chime', schoolBell: 'School bell', beep: 'Beep', buzzer: 'Buzzer' };

/** @param {import('./clock-settings.js').PeriodAnchor} anchor */
function anchorText(anchor) {
  if (anchor.from === 'start') return `minute ${anchor.minutes}`;
  if (anchor.from === 'end') return `${anchor.minutes} min before the end`;
  return 'halfway';
}

/**
 * What rang, in words: "Bell · Period 2 ends, Nutrition starts".
 * @param {import('./clock-model.js').Ring} ring
 */
function ringSourceText(ring) {
  const labelled = (alarm, text) => (alarm.label ? `${alarm.label} · ${text}` : text);
  switch (ring.source) {
    case 'bell': {
      const parts = [];
      if (ring.ends) parts.push(`${ring.ends.name} ends`);
      if (ring.starts) parts.push(`${ring.starts.name} starts`);
      return `Bell · ${parts.join(', ')}`;
    }
    case 'clockAlarm': {
      const repeat = ring.alarm.repeat === 'once' ? 'once' : 'every School Day';
      return `Clock Alarm · ${ring.alarm.label ? `${ring.alarm.label}, ${repeat}` : repeat}`;
    }
    case 'periodAlarm':
      return `Period Alarm · ${labelled(ring.alarm, `${ring.period.name}, ${anchorText(ring.alarm.anchor)}`)}`;
    default:
      return 'Timer';
  }
}

/**
 * The "Next rings today" list: every ring from `now` to midnight (nothing
 * at all when none are left, so a day off stays a plain clock).
 * @param {Date} now
 * @param {object[]} schoolYears
 * @param {import('./clock-settings.js').RingSettings} settings
 */
function nextRingsNodes(now, schoolYears, settings) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const rings = ringsInWindow(now, midnight, schoolYears, settings);
  if (rings.length === 0) return [];
  const heading = document.createElement('h2');
  heading.textContent = 'Next rings today';
  const list = document.createElement('ul');
  for (const ring of rings) {
    const item = document.createElement('li');
    const time = formatClockTime(ring.at, { seconds: ring.at.getSeconds() !== 0 });
    item.textContent = `${time} · ${ringSourceText(ring)} · ${SOUND_NAMES[ring.sound]}`;
    list.append(item);
  }
  return [heading, list];
}

/**
 * Mount the School Clock.
 * @param {{ mountId?: string, search?: string, realNow?: () => number, schoolYears?: object[],
 *   settings?: import('./clock-settings.js').RingSettings,
 *   onSettingsChange?: (settings: import('./clock-settings.js').RingSettings) => void }} [options]
 *   `search` is `location.search` (for `?at=` / `&speed=`); `realNow` is the real clock.
 *   `settings` decide what rings (a hard-coded sample until ticket 10 saves them);
 *   `onSettingsChange` hears every change the page makes to them (a "once"
 *   Clock Alarm turning off after it rings in real time).
 * @returns {{ destroy: () => void } | null} null if the mount element is missing
 */
export function initClockApp({
  mountId = 'clockApp',
  search = '',
  realNow = Date.now,
  schoolYears = SCHOOL_YEARS,
  settings: initialSettings = SAMPLE_SETTINGS,
  onSettingsChange = () => {},
} = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;
  destroyActiveApp?.();

  const clock = createClockSource({ search, realNow });
  let settings = initialSettings;
  let lastTick = new Date(clock.now());

  /** Settle whatever rang since the last tick, then redraw. */
  function tick() {
    const now = new Date(clock.now());
    const rang = ringsInWindow(lastTick, now, schoolYears, settings);
    lastTick = now;
    const alarms = alarmsAfterRinging(settings.alarms, rang, { simulated: clock.simulated });
    if (alarms !== settings.alarms) {
      settings = { ...settings, alarms };
      onSettingsChange(settings);
    }
    render(now);
  }

  function render(now) {
    const moment = describeMoment(now, schoolYears);
    mount.replaceChildren(
      ...displayLines(now, moment, clock.simulated).map(([tag, text]) => {
        const node = document.createElement(tag);
        node.textContent = text;
        return node;
      }),
      ...nextRingsNodes(now, schoolYears, settings),
    );
  }

  render(lastTick);
  const interval = setInterval(tick, TICK_MS);

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
