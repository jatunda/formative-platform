// School Clock page controller: a thin DOM layer over the clock model.
// Everything it depends on is passed in (the real clock, the query string and
// the device's storage), so tests drive it with a fake clock and fake storage.
// Each tick recomputes the whole display from the current time; nothing is
// counted up or down by ticks, so a throttled or sleeping tab is right the
// moment it ticks again. Settings are read once at start and saved on every
// change; the page never listens for other tabs' storage events.
import { alarmsAfterRinging, describeMoment, ringsInWindow } from './clock-model.js';
import { LABELLED_PERIODS } from './clock-settings.js';
import { createSettingsStore } from './clock-storage.js';
import { createClockSource } from './clock-source.js';
import {
  formatClockTime, formatDate, formatDuration, formatLongDuration, formatSegmentName, formatShortDate,
} from './format.js';
import { SCHOOL_YEARS } from './school-years.js';

const TICK_MS = 1000;
const DIVISIONS = [['MS', 'Middle School'], ['HS', 'High School']];

let destroyActiveApp = null;

/**
 * How the page writes clock times, Segment names and the Division under the current settings.
 * @param {import('./clock-settings.js').ClockSettings} settings
 */
function textFor(settings) {
  return {
    time: (date, { seconds = false } = {}) => formatClockTime(date, { seconds, use24Hour: settings.use24Hour }),
    name: (segment) => formatSegmentName(segment, settings.periodLabels),
    division: settings.division,
  };
}

/**
 * The display as a list of [tag, text] lines. With no Division chosen yet it
 * is just the time: the Division prompt comes first.
 * @param {Date} now
 * @param {import('./clock-model.js').Moment | null} moment
 * @param {boolean} simulated
 * @param {ReturnType<typeof textFor>} text
 */
function displayLines(now, moment, simulated, text) {
  const lines = [];
  if (simulated) {
    lines.push(['p', `Simulated time: ${formatDate(now)}, ${text.time(now, { seconds: true })}`]);
  }
  lines.push(['p', text.time(now, { seconds: true })]);
  if (!moment) return lines;
  if (moment.state === 'summer') lines.push(['h1', `Day ${moment.summerDay} of Summer`]);
  else if (moment.dayLabel) lines.push(['h1', moment.dayLabel]);

  const upNext = (segment) => ['p', `Up next: ${text.name(segment)} at ${text.time(segment.start)}`];
  switch (moment.state) {
    case 'segment':
      lines.push(
        ['h2', `${text.name(moment.current)} · ${text.division}`],
        ['p', `${text.time(moment.current.start)} – ${text.time(moment.current.end)}`],
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
        ['p', `School ended at ${text.time(moment.schoolEndedAt)}`],
      );
      break;
  }

  // Off-Hours: when school is back (before school, "Up next" already says),
  // and how long since it ended.
  if (moment.nextSchoolDay && moment.state !== 'beforeSchool') {
    const lead = moment.state === 'summer' ? 'First day' : 'Next school day';
    const first = moment.nextSchoolDay.firstSegment.start;
    lines.push(['p',
      `${lead}: ${formatShortDate(first)} at ${text.time(first)} · starts in ${formatLongDuration(moment.untilNextSchoolDayMs)}`]);
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
 * @param {ReturnType<typeof textFor>} text
 */
function ringSourceText(ring, text) {
  const labelled = (alarm, words) => (alarm.label ? `${alarm.label} · ${words}` : words);
  switch (ring.source) {
    case 'bell': {
      const parts = [];
      if (ring.ends) parts.push(`${text.name(ring.ends)} ends`);
      if (ring.starts) parts.push(`${text.name(ring.starts)} starts`);
      return `Bell · ${parts.join(', ')}`;
    }
    case 'clockAlarm': {
      const repeat = ring.alarm.repeat === 'once' ? 'once' : 'every School Day';
      return `Clock Alarm · ${ring.alarm.label ? `${ring.alarm.label}, ${repeat}` : repeat}`;
    }
    case 'periodAlarm':
      return `Period Alarm · ${labelled(ring.alarm, `${text.name(ring.period)}, ${anchorText(ring.alarm.anchor)}`)}`;
    default:
      return 'Timer';
  }
}

/**
 * The "Next rings today" list: every ring from `now` to midnight (nothing
 * at all when none are left, so a day off stays a plain clock).
 * @param {Date} now
 * @param {object[]} schoolYears
 * @param {import('./clock-settings.js').RingSettings} ringSettings
 * @param {ReturnType<typeof textFor>} text
 */
function nextRingsNodes(now, schoolYears, ringSettings, text) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const rings = ringsInWindow(now, midnight, schoolYears, ringSettings);
  if (rings.length === 0) return [];
  const heading = document.createElement('h2');
  heading.textContent = 'Next rings today';
  const list = document.createElement('ul');
  for (const ring of rings) {
    const item = document.createElement('li');
    const time = text.time(ring.at, { seconds: ring.at.getSeconds() !== 0 });
    item.textContent = `${time} · ${ringSourceText(ring, text)} · ${SOUND_NAMES[ring.sound]}`;
    list.append(item);
  }
  return [heading, list];
}

/**
 * A DOM element: `props` are set as properties, except hyphenated names
 * ('aria-label'), which are set as attributes.
 * @param {string} tag @param {object} [props] @param {(Node | string)[]} [children]
 */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.includes('-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  node.append(...children);
  return node;
}

/**
 * Mount the School Clock.
 * @param {{ mountId?: string, search?: string, realNow?: () => number, schoolYears?: object[],
 *   storage?: Pick<Storage, 'getItem' | 'setItem'> }} [options]
 *   `search` is `location.search` (for `?at=` / `&speed=`); `realNow` is the real clock;
 *   `storage` holds the device's settings (localStorage on the real page).
 * @returns {{ destroy: () => void } | null} null if the mount element is missing
 */
export function initClockApp({
  mountId = 'clockApp',
  search = '',
  realNow = Date.now,
  schoolYears = SCHOOL_YEARS,
  storage = globalThis.localStorage,
} = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;
  destroyActiveApp?.();

  const clock = createClockSource({ search, realNow });
  const store = createSettingsStore(storage);
  let settings = store.load();
  let lastTick = new Date(clock.now());

  /** @param {Partial<import('./clock-settings.js').ClockSettings>} change */
  function updateSettings(change) {
    settings = { ...settings, ...change };
    store.save(settings);
    render(new Date(clock.now()));
  }


  // First visit: ask the Division once.
  const prompt = el('section', { 'aria-label': 'Choose your Division' }, [
    el('p', { textContent: 'Which Division do you teach?' }),
    ...DIVISIONS.map(([key, name]) =>
      el('button', { type: 'button', textContent: name, onclick: () => updateSettings({ division: key }) })),
  ]);

  const display = el('div', { className: 'clock-display' });

  // The settings, built once so typing isn't interrupted by the ticks.
  const divisionSelect = el('select', {
    onchange: () => updateSettings({ division: divisionSelect.value }),
  }, DIVISIONS.map(([key, name]) => el('option', { value: key, textContent: name })));
  const use24Hour = el('input', {
    type: 'checkbox', checked: settings.use24Hour,
    onchange: () => updateSettings({ use24Hour: use24Hour.checked }),
  });
  const labelInputs = LABELLED_PERIODS.map((period) => {
    const input = el('input', {
      type: 'text', value: settings.periodLabels[period] ?? '',
      oninput: () => updateSettings({ periodLabels: { ...settings.periodLabels, [period]: input.value } }),
    });
    return el('label', {}, [`${period} label `, input]);
  });
  const settingsPanel = el('section', { 'aria-label': 'Settings' }, [
    el('h2', { textContent: 'Settings' }),
    el('label', {}, ['Division ', divisionSelect]),
    el('label', {}, [use24Hour, ' 24-hour time']),
    ...labelInputs,
  ]);
  mount.replaceChildren(prompt, display, settingsPanel);

  /** Settle whatever rang since the last tick, then redraw. */
  function tick() {
    const now = new Date(clock.now());
    if (settings.division) {
      const rang = ringsInWindow(lastTick, now, schoolYears, settings);
      const alarms = alarmsAfterRinging(settings.alarms, rang, { simulated: clock.simulated });
      if (alarms !== settings.alarms) {
        settings = { ...settings, alarms };
        store.save(settings);
      }
    }
    lastTick = now;
    render(now);
  }

  function render(now) {
    const chosen = settings.division !== null;
    prompt.hidden = chosen;
    settingsPanel.hidden = !chosen;
    if (chosen) divisionSelect.value = settings.division;
    const text = textFor(settings);
    const moment = chosen ? describeMoment(now, schoolYears, { division: settings.division }) : null;
    display.replaceChildren(
      ...displayLines(now, moment, clock.simulated, text).map(([tag, line]) => el(tag, { textContent: line })),
      ...(chosen ? nextRingsNodes(now, schoolYears, settings, text) : []),
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
  initClockApp({ search: window.location.search, storage: window.localStorage });
}
