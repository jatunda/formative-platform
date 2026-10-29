// School Clock page controller: a thin DOM layer over the clock model.
// Everything it depends on is passed in (the real clock, the query string and
// the device's storage), so tests drive it with a fake clock and fake storage.
// Each tick recomputes the whole display from the current time; nothing is
// counted up or down by ticks, so a throttled or sleeping tab is right the
// moment it ticks again. Settings are read once at start and saved on every
// change; the page never listens for other tabs' storage events.
// Sound: the coming rings are handed to the sound player ahead of time, mapped
// onto its audio clock, so they play on time even when this tab's timers are
// throttled behind other windows. The window is redone when settings change,
// when the tab is shown again, when sound turns on, and as it rolls forward.
import { alarmsAfterRinging, describeMoment, ringsInWindow, ringsUntilDismissed } from './clock-model.js';
import { LABELLED_PERIODS } from './clock-settings.js';
import { createSettingsStore } from './clock-storage.js';
import { createClockSource } from './clock-source.js';
import {
  formatClockTime, formatDate, formatDuration, formatLongDuration, formatSegmentName, formatShortDate,
} from './format.js';
import { addReadout, createLayoutStore, cycleReadout, newLayout, removeReadout } from './readout-layout.js';
import { readoutText, readoutValue } from './readouts.js';
import { SCHOOL_YEARS } from './school-years.js';
import { createWakeLockKeeper, detectCapabilities } from './screen.js';
import { BELL_SECONDS, ALARM_MAX_SECONDS, SOUNDS, SOUND_NAMES, createSoundPlayer } from './sound.js';
import {
  PRESET_MINUTES, cancelTimer, durationLabel, parseDuration, pauseTimer, rememberDuration, resumeTimer,
  settleTimer, startTimer, timerStatus,
} from './timer.js';

const TICK_MS = 1000;
/** How far ahead (real time) rings are handed to the sound player: past the
 * minute-long timer throttling of a background tab. */
const LOOKAHEAD_MS = 5 * 60 * 1000;
/** Rings this recent (real time) stay in the window, so one already playing is
 * kept rather than cancelled when the window is redone. */
const GRACE_MS = 1000;
/** Rings older than this (real time) when a tick finally reaches them were
 * missed while the tab slept or was throttled: they don't ring late. */
const STALE_MS = 5 * 1000;
const DIVISIONS = [['MS', 'Middle School'], ['HS', 'High School']];
const FEEDBACK_HREF = `mailto:erich@villagechristian.org?subject=${encodeURIComponent('Clock feedback')}`;
/** The mini player's starting size (the user can resize it). */
const MINI_PLAYER_SIZE = { width: 320, height: 200 };

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
 * The day's heading: the Day Label, or "Day N of Summer".
 * @param {import('./clock-model.js').Moment} moment
 */
function dayHeading(moment) {
  return moment.state === 'summer' ? `Day ${moment.summerDay} of Summer` : moment.dayLabel;
}

/**
 * Where the day is: the current Segment (with the Division), a Passing
 * Period, before or after school; null on a day with no Segments.
 * @param {import('./clock-model.js').Moment} moment
 * @param {ReturnType<typeof textFor>} text
 */
function statusHeading(moment, text) {
  switch (moment.state) {
    case 'segment': return `${text.name(moment.current)} · ${text.division}`;
    case 'passing': return 'Passing Period';
    case 'beforeSchool': return 'Before school';
    case 'afterSchool': return 'After school';
    default: return null;
  }
}

/** @param {import('./clock-model.js').TimedSegment} segment @param {ReturnType<typeof textFor>} text */
function upNextText(segment, text) {
  return `Up next: ${text.name(segment)} at ${text.time(segment.start)}`;
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
  const day = dayHeading(moment);
  if (day) lines.push(['h1', day]);
  const status = statusHeading(moment, text);
  if (status) lines.push(['h2', status]);
  // Time left, elapsed and until school starts are the Readouts' job.
  switch (moment.state) {
    case 'segment':
      lines.push(['p', `${text.time(moment.current.start)} – ${text.time(moment.current.end)}`]);
      break;
    case 'passing':
    case 'beforeSchool':
      lines.push(['p', upNextText(moment.upNext, text)]);
      break;
    case 'afterSchool':
      lines.push(['p', `School ended at ${text.time(moment.schoolEndedAt)}`]);
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
 * A name for one ring that stays the same each time the window is redone, so
 * the sound player can tell a ring it already has from a new one.
 * @param {import('./clock-model.js').Ring} ring
 */
function ringKey(ring) {
  return `${ring.at.getTime()}|${ring.source}|${'alarm' in ring ? ring.alarm.id : ''}`;
}

/** Whether the browser asks for less motion (no flashing). */
function browserPrefersReducedMotion() {
  try {
    return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

/** The browser's sound player (silent where there's no Web Audio). */
function browserSoundPlayer() {
  return createSoundPlayer({ AudioContextClass: globalThis.AudioContext ?? globalThis.webkitAudioContext });
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
 *   storage?: Pick<Storage, 'getItem' | 'setItem'>, tabStorage?: Pick<Storage, 'getItem' | 'setItem'>,
 *   soundPlayer?: import('./sound.js').SoundPlayer, prefersReducedMotion?: () => boolean,
 *   capabilities?: import('./screen.js').Capabilities }} [options]
 *   `search` is `location.search` (for `?at=` / `&speed=`); `realNow` is the real clock;
 *   `storage` holds the device's settings and last used Readout layout (localStorage on
 *   the real page); `tabStorage` holds this tab's Readout layout (sessionStorage);
 *   `soundPlayer` plays the rings (the browser's by default; the page closes it when destroyed);
 *   `prefersReducedMotion` swaps the ringing flash for a steady highlight;
 *   `capabilities` are the browser's Fullscreen, Wake Lock and Document PiP (each null
 *   when missing, and its control left out).
 * @returns {{ destroy: () => void } | null} null if the mount element is missing
 */
export function initClockApp({
  mountId = 'clockApp',
  search = '',
  realNow = Date.now,
  schoolYears = SCHOOL_YEARS,
  storage = globalThis.localStorage,
  tabStorage = globalThis.sessionStorage,
  soundPlayer: givenSoundPlayer,
  prefersReducedMotion = browserPrefersReducedMotion,
  capabilities = detectCapabilities(globalThis),
} = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;
  destroyActiveApp?.();
  const soundPlayer = givenSoundPlayer ?? browserSoundPlayer();

  const clock = createClockSource({ search, realNow });
  const store = createSettingsStore(storage);
  let settings = store.load();
  let lastTick = new Date(clock.now());
  // Simulated time affects only this tab: its timer lives in memory, and the
  // real timer saved by other tabs is neither loaded, cleared nor overwritten.
  const savedTimer = { timerEndsAt: settings.timerEndsAt, timerPausedMs: settings.timerPausedMs };
  if (clock.simulated) settings = { ...settings, ...cancelTimer() };
  /** Save the settings (in simulated time, with the real timer as it was saved). */
  function saveSettings() {
    store.save(clock.simulated ? { ...settings, ...savedTimer } : settings);
  }
  // A timer that ended while the page was closed is simply gone: it doesn't ring late.
  settleSavedTimer(lastTick);

  /** Clear the timer once its end has passed (it has rung by then). @param {Date} now */
  function settleSavedTimer(now) {
    if (settleTimer(settings, now.getTime()) === settings) return;
    settings = { ...settings, ...cancelTimer() };
    saveSettings();
  }

  // This tab's Readouts: its own saved layout, else the last used one; with
  // neither, a default one is made from the first moment the clock describes.
  const layoutStore = createLayoutStore({ session: tabStorage, local: storage });
  let layout = layoutStore.load();
  if (layout) layoutStore.keepInTab(layout);
  /** @param {import('./readout-layout.js').Layout} next */
  function changeLayout(next) {
    layout = next;
    layoutStore.save(layout);
    buildReadouts();
    render(new Date(clock.now()));
  }

  /** @param {Partial<import('./clock-settings.js').ClockSettings>} change */
  function updateSettings(change) {
    settings = { ...settings, ...change };
    saveSettings();
    soundPlayer.setVolume(settings.volume);
    const now = new Date(clock.now());
    scheduleSounds(now);
    render(now);
  }

  // Sound. The coming rings, [now - grace, now + lookahead) in clock time,
  // mapped onto the audio clock: at &speed=60 a clock minute is a real second.
  let windowEnd = -Infinity;
  /** @param {Date} now */
  function scheduleSounds(now) {
    const t = now.getTime();
    windowEnd = t + LOOKAHEAD_MS * clock.speed;
    if (soundPlayer.state() !== 'running') return;
    const rings = settings.division
      ? ringsInWindow(new Date(t - GRACE_MS * clock.speed), new Date(windowEnd), schoolYears, settings)
      : [];
    const audioNow = soundPlayer.currentTime();
    soundPlayer.schedule(rings.map((ring) => ({
      key: ringKey(ring),
      at: audioNow + (ring.at.getTime() - t) / 1000 / clock.speed,
      sound: ring.sound,
      repeat: ringsUntilDismissed(ring),
    })));
  }

  // What's ringing on screen: a flash (or a steady highlight) and words for
  // it, about 3 s for a Bell and until dismissed (60 s at most) otherwise.
  let ringingUntil = null;
  const ringingText = el('p');
  const ringingBanner = el('section', { 'aria-label': 'Ringing', role: 'alert', hidden: true }, [
    ringingText,
    el('button', { type: 'button', textContent: 'Dismiss', onclick: () => dismiss() }),
  ]);
  /** @param {string} what @param {boolean} untilDismissed */
  function startRinging(what, untilDismissed) {
    const seconds = untilDismissed ? ALARM_MAX_SECONDS : BELL_SECONDS;
    ringingUntil = Math.max(ringingUntil ?? 0, realNow() + seconds * 1000);
    ringingText.textContent = `Ringing: ${what}`;
    ringingBanner.hidden = false;
    mount.classList.remove('clock-ringing--flash', 'clock-ringing--steady');
    mount.classList.add('clock-ringing', prefersReducedMotion() ? 'clock-ringing--steady' : 'clock-ringing--flash');
    renderMiniRinging();
  }
  function stopRinging() {
    ringingUntil = null;
    ringingBanner.hidden = true;
    mount.classList.remove('clock-ringing', 'clock-ringing--flash', 'clock-ringing--steady');
    renderMiniRinging();
  }
  /** Stop the current ring, sound and all. */
  function dismiss() {
    soundPlayer.dismiss();
    stopRinging();
  }


  // First visit: ask the Division once.
  const prompt = el('section', { 'aria-label': 'Choose your Division' }, [
    el('p', { textContent: 'Which Division do you teach?' }),
    ...DIVISIONS.map(([key, name]) =>
      el('button', { type: 'button', textContent: name, onclick: () => updateSettings({ division: key }) })),
  ]);

  // The Readouts, rebuilt only when the layout changes (so focus survives the
  // ticks); each tick just rewrites their text. The first is the big one.
  const readoutsSection = el('section', { 'aria-label': 'Readouts', className: 'clock-readouts' });
  let readoutButtons = [];
  let lastMoment = null;
  function buildReadouts() {
    readoutButtons = layout.readouts.map((_, i) =>
      el('button', { type: 'button', className: 'clock-readout-value', onclick: () => changeLayout(cycleReadout(layout, i)) }));
    const removable = layout.readouts.length > 1;
    readoutsSection.replaceChildren(
      ...readoutButtons.map((button, i) => el('div', {
        className: i === 0 ? 'clock-readout clock-readout--big' : 'clock-readout',
      }, [
        button,
        ...(removable ? [el('button', {
          type: 'button', textContent: '×', 'aria-label': 'Remove Readout',
          onclick: () => changeLayout(removeReadout(layout, i)),
        })] : []),
      ])),
      el('button', { type: 'button', textContent: 'Add Readout', onclick: () => changeLayout(addReadout(layout, lastMoment)) }),
    );
  }

  // Turning sound on (browsers need one click after every load), the Bells
  // toggle and a test ring, one tap from the main screen.
  const soundOn = el('button', { type: 'button', textContent: 'Turn sound on', onclick: () => soundPlayer.resume() });
  const noSound = el('p', { textContent: "Sound isn't available in this browser." });
  const bellsToggle = el('input', {
    type: 'checkbox', checked: settings.bells.on,
    onchange: () => updateSettings({ bells: { ...settings.bells, on: bellsToggle.checked } }),
  });
  const soundControls = el('section', { 'aria-label': 'Sound' }, [
    soundOn,
    noSound,
    el('label', {}, [bellsToggle, ' Bells']),
    el('button', {
      type: 'button', textContent: 'Test ring',
      onclick: () => {
        soundPlayer.play(settings.bells.sound);
        startRinging('Test ring', false);
      },
    }),
    el('p', { textContent: 'Keep this tab open for sounds to play. It can stay behind other windows.' }),
  ]);
  function showSoundState() {
    const state = soundPlayer.state();
    soundOn.hidden = state !== 'suspended';
    noSound.hidden = state !== 'unavailable';
  }
  soundPlayer.onStateChange(() => {
    showSoundState();
    scheduleSounds(new Date(clock.now()));
  });
  showSoundState();
  soundPlayer.setVolume(settings.volume);

  // The classroom timer, one tap from the main screen. Built once (so typing
  // a custom duration survives the ticks); each tick rewrites its time left.
  const timerLeft = el('p');
  const timerError = el('p', { 'aria-live': 'polite' });
  /** @param {Partial<import('./clock-settings.js').ClockSettings>} change */
  const changeTimer = (change) => {
    timerError.textContent = '';
    updateSettings(change);
  };
  const pauseButton = el('button', {
    type: 'button', textContent: 'Pause', onclick: () => changeTimer(pauseTimer(settings, clock.now())),
  });
  const resumeButton = el('button', {
    type: 'button', textContent: 'Resume', onclick: () => changeTimer(resumeTimer(settings, clock.now())),
  });
  const cancelButton = el('button', { type: 'button', textContent: 'Cancel', onclick: () => changeTimer(cancelTimer()) });
  /** A typed duration or a quick pick: it starts and becomes the first quick pick. @param {number} ms */
  function startCustom(ms) {
    changeTimer({ ...startTimer(ms, clock.now()), recentDurations: rememberDuration(settings.recentDurations, ms) });
    buildQuickPicks();
  }
  const quickPicks = el('div', { role: 'group', 'aria-label': 'Quick picks' });
  function buildQuickPicks() {
    quickPicks.replaceChildren(...settings.recentDurations.map((ms) =>
      el('button', { type: 'button', textContent: durationLabel(ms), onclick: () => startCustom(ms) })));
  }
  buildQuickPicks();
  const customInput = el('input', { type: 'text', placeholder: '7:30', autocomplete: 'off' });
  const timerSection = el('section', { 'aria-label': 'Timer' }, [
    el('h2', { textContent: 'Timer' }),
    timerLeft,
    pauseButton, resumeButton, cancelButton,
    el('div', { role: 'group', 'aria-label': 'Presets' }, PRESET_MINUTES.map((minutes) => el('button', {
      type: 'button', textContent: durationLabel(minutes * 60 * 1000),
      onclick: () => changeTimer(startTimer(minutes * 60 * 1000, clock.now())),
    }))),
    quickPicks,
    el('form', {
      onsubmit: (event) => {
        event.preventDefault();
        const typed = parseDuration(customInput.value);
        if (typed.ok) startCustom(typed.ms);
        else timerError.textContent = typed.error;
      },
    }, [
      el('label', {}, ['Custom (minutes or m:ss) ', customInput]),
      el('button', { type: 'submit', textContent: 'Start' }),
    ]),
    timerError,
  ]);
  /** @param {Date} now */
  function renderTimer(now) {
    const { status, remainingMs } = timerStatus(settings, now.getTime());
    // Rounded up, so a 5 min timer reads 5:00 when it starts and 0:00 as it rings.
    const left = status === 'idle' ? '' : `${formatDuration(Math.ceil(remainingMs / 1000) * 1000)} left`;
    timerLeft.textContent = status === 'paused' ? `Paused · ${left}` : left;
    pauseButton.hidden = status !== 'running';
    resumeButton.hidden = status !== 'paused';
    cancelButton.hidden = status === 'idle';
  }

  const info = el('div');
  const display = el('div', { className: 'clock-display' }, [readoutsSection, info]);

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
  const volume = el('input', {
    type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(settings.volume * 100)),
    oninput: () => updateSettings({ volume: Number(volume.value) / 100 }),
  });
  const bellSound = el('select', {
    onchange: () => updateSettings({ bells: { ...settings.bells, sound: bellSound.value } }),
  }, SOUNDS.map((sound) => el('option', { value: sound, textContent: SOUND_NAMES[sound] })));
  bellSound.value = settings.bells.sound;
  const settingsPanel = el('section', { 'aria-label': 'Settings' }, [
    el('h2', { textContent: 'Settings' }),
    el('label', {}, ['Division ', divisionSelect]),
    el('label', {}, [use24Hour, ' 24-hour time']),
    ...labelInputs,
    el('label', {}, ['Volume ', volume]),
    el('label', {}, ['Bell sound ', bellSound]),
    ...SOUNDS.map((sound) => el('button', {
      type: 'button', textContent: `Preview ${SOUND_NAMES[sound]}`, onclick: () => soundPlayer.play(sound),
    })),
  ]);
  // Fullscreen for projecting: the screen is kept awake for as long as it
  // lasts (however it ends), where the browser allows a wake lock.
  const { fullscreen, pictureInPicture } = capabilities;
  const wakeLock = createWakeLockKeeper(capabilities.wakeLock);
  const fullscreenButton = el('button', {
    type: 'button', hidden: !fullscreen,
    onclick: () => (fullscreen.isActive() ? fullscreen.exit() : fullscreen.request(mount)).catch(() => {}),
  });
  function showFullscreen() {
    const on = Boolean(fullscreen?.isActive());
    fullscreenButton.textContent = on ? 'Exit fullscreen' : 'Fullscreen';
    if (on) wakeLock.hold();
    else wakeLock.release();
  }
  const stopWatchingFullscreen = fullscreen?.onChange(showFullscreen);
  showFullscreen();

  // The mini player: an always-on-top window (Document Picture-in-Picture,
  // where it exists) that mirrors the big Readout, the current Segment, up
  // next and what's ringing, redrawn with every render of the main page.
  let mini = null;
  const miniButton = el('button', {
    type: 'button', hidden: !pictureInPicture,
    onclick: () => (mini ? closeMini() : openMini()),
  });
  function showMiniState() {
    miniButton.textContent = mini ? 'Close mini player' : 'Mini player';
  }
  showMiniState();
  async function openMini() {
    let win;
    try {
      win = await pictureInPicture.open(MINI_PLAYER_SIZE);
    } catch {
      return;
    }
    const doc = win.document;
    doc.title = 'School Clock';
    const stylesheet = doc.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/clock/clock.css';
    doc.head.append(stylesheet);
    const parts = {
      win,
      readout: el('p', { className: 'clock-mini-readout' }),
      status: el('p'),
      upNext: el('p'),
      ringingText: el('p'),
      dismiss: el('button', { type: 'button', textContent: 'Dismiss', onclick: () => dismiss() }),
    };
    doc.body.className = 'clock-mini';
    doc.body.replaceChildren(parts.readout, parts.status, parts.upNext, parts.ringingText, parts.dismiss);
    // Closed by the user, by this page, or because this tab went away. A
    // window this page already closed may say so after a new one has opened.
    win.addEventListener('pagehide', () => {
      if (mini !== parts) return;
      mini = null;
      showMiniState();
    });
    mini = parts;
    showMiniState();
    render(new Date(clock.now()));
    renderMiniRinging();
  }
  /** Close it now; the window's own pagehide comes a moment later. */
  function closeMini() {
    if (!mini) return;
    const { win } = mini;
    mini = null;
    showMiniState();
    win.close();
  }
  globalThis.addEventListener('pagehide', closeMini);

  /**
   * @param {Date} now @param {import('./clock-model.js').Moment | null} moment
   * @param {string | null} bigReadout the big Readout's text (null when the Readouts are hidden)
   * @param {ReturnType<typeof textFor>} text
   */
  function renderMini(now, moment, bigReadout, text) {
    if (!mini) return;
    mini.readout.textContent = bigReadout ?? text.time(now, { seconds: true });
    mini.status.textContent = moment ? (statusHeading(moment, text) ?? dayHeading(moment) ?? '') : '';
    mini.upNext.textContent = moment?.upNext ? upNextText(moment.upNext, text) : '';
  }
  function renderMiniRinging() {
    if (!mini) return;
    mini.ringingText.textContent = ringingBanner.hidden ? '' : ringingText.textContent;
    mini.dismiss.hidden = ringingBanner.hidden;
  }

  const viewControls = el('section', { 'aria-label': 'View' }, [fullscreenButton, miniButton]);
  const footer = el('footer', {}, [el('a', { href: FEEDBACK_HREF, textContent: 'Feedback? Email Eric' })]);

  mount.replaceChildren(prompt, ringingBanner, soundControls, viewControls, display, timerSection, settingsPanel, footer);

  /**
   * Settle whatever rang since the last tick, then redraw. After a sleep or a
   * long stall, what came due meanwhile is settled (a one-time Clock Alarm is
   * turned off) but doesn't ring late, and the sound schedule is redone so the
   * player drops it too.
   */
  function tick() {
    const now = new Date(clock.now());
    const staleBefore = now.getTime() - STALE_MS * clock.speed;
    if (ringingUntil !== null && realNow() >= ringingUntil) stopRinging();
    if (lastTick.getTime() < staleBefore || now.getTime() >= windowEnd - (LOOKAHEAD_MS * clock.speed) / 2) {
      scheduleSounds(now);
    }
    if (settings.division) {
      const rang = ringsInWindow(lastTick, now, schoolYears, settings);
      const text = textFor(settings);
      for (const ring of rang) {
        if (ring.at.getTime() >= staleBefore) startRinging(ringSourceText(ring, text), ringsUntilDismissed(ring));
      }
      const alarms = alarmsAfterRinging(settings.alarms, rang, { simulated: clock.simulated });
      if (alarms !== settings.alarms) {
        settings = { ...settings, alarms };
        saveSettings();
      }
      settleSavedTimer(now);
    }
    lastTick = now;
    render(now);
  }

  function render(now) {
    const chosen = settings.division !== null;
    prompt.hidden = chosen;
    settingsPanel.hidden = !chosen;
    timerSection.hidden = !chosen;
    renderTimer(now);
    if (chosen) divisionSelect.value = settings.division;
    const text = textFor(settings);
    const moment = chosen ? describeMoment(now, schoolYears, { division: settings.division }) : null;
    renderMini(now, moment, renderReadouts(now, moment), text);
    info.replaceChildren(
      ...displayLines(now, moment, clock.simulated, text).map(([tag, line]) => el(tag, { textContent: line })),
      ...(chosen ? nextRingsNodes(now, schoolYears, settings, text) : []),
    );
  }

  /**
   * Show the Readouts for `moment`; none before a Division is chosen or on a
   * date the clock knows nothing about (the time alone is shown then).
   * @param {Date} now @param {import('./clock-model.js').Moment | null} moment
   * @returns {string | null} the big Readout's text, null when none are shown
   */
  function renderReadouts(now, moment) {
    if (!moment || moment.state === 'unknown') {
      readoutsSection.replaceChildren();
      readoutButtons = [];
      return null;
    }
    lastMoment = moment;
    if (!layout) {
      layout = newLayout(moment);
      layoutStore.keepInTab(layout);
    }
    if (readoutButtons.length === 0) buildReadouts();
    layout.readouts.forEach(({ mode }, i) => {
      readoutButtons[i].textContent = readoutText(readoutValue(mode, moment, now), settings);
    });
    return readoutButtons[0].textContent;
  }

  render(lastTick);
  scheduleSounds(lastTick);
  const interval = setInterval(tick, TICK_MS);
  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    scheduleSounds(new Date(clock.now()));
    // The browser let go of the wake lock while the tab was hidden.
    wakeLock.refresh();
  };
  document.addEventListener('visibilitychange', onVisibility);

  function destroy() {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibility);
    globalThis.removeEventListener('pagehide', closeMini);
    stopWatchingFullscreen?.();
    wakeLock.release();
    closeMini();
    soundPlayer.close();
    if (destroyActiveApp === destroy) destroyActiveApp = null;
  }
  destroyActiveApp = destroy;
  return { destroy };
}

if (typeof document !== 'undefined' && document.getElementById('clockApp')) {
  initClockApp({ search: window.location.search });
}
