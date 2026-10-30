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
import { createSettingsStore } from './clock-storage.js';
import { createClockSource } from './clock-source.js';
import { displayText } from './display-text.js';
import { el } from './dom.js';
import { formatClockTime, formatSegmentName, formatShortDate } from './format.js';
import { icon } from './icons.js';
import { createMiniPlayer } from './mini-player.js';
import { addReadout, canAddReadout, createLayoutStore, cycleReadout, newLayout, removeReadout } from './readout-layout.js';
import { readoutParts, readoutText, readoutValue } from './readouts.js';
import { createReadoutsView } from './readouts-view.js';
import { SCHOOL_YEARS } from './school-years.js';
import { createWakeLockKeeper, detectCapabilities } from './screen.js';
import { createSettingsDrawer } from './settings-drawer.js';
import { BELL_SECONDS, ALARM_MAX_SECONDS, SOUND_NAMES, createSoundPlayer } from './sound.js';
import { cancelTimer, settleTimer, timerText } from './timer.js';
import { createTimerPanel } from './timer-panel.js';

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

let destroyActiveApp = null;

/**
 * How the page writes clock times, Segment names and the Division under the current settings.
 * @param {import('./clock-settings.js').ClockSettings} settings
 */
function textFor(settings) {
  return {
    time: (date, { seconds = false } = {}) => formatClockTime(date, { seconds, use24Hour: settings.use24Hour }),
    /** The current time, with seconds when they're on. @param {Date} date */
    now: (date) => formatClockTime(date, { seconds: settings.showSeconds, use24Hour: settings.use24Hour }),
    readout: { use24Hour: settings.use24Hour, seconds: settings.showSeconds },
    name: (segment) => formatSegmentName(segment, settings.periodLabels),
    division: settings.division,
  };
}

/**
 * Where the day is, for the mini player: the current Segment (with the
 * Division), a Passing Period, before or after school, or the Day Label
 * ("Day N of Summer" in Summer); '' on a date the clock knows nothing about.
 * @param {import('./clock-model.js').Moment} moment
 * @param {ReturnType<typeof textFor>} text
 */
function statusHeading(moment, text) {
  switch (moment.state) {
    case 'segment': return `${text.name(moment.current)} · ${text.division}`;
    case 'passing': return 'Passing Period';
    case 'beforeSchool': return 'Before school';
    case 'afterSchool': return 'After school';
    case 'summer': return `Day ${moment.summerDay} of Summer`;
    default: return moment.dayLabel ?? '';
  }
}

/** @param {import('./clock-model.js').TimedSegment} segment @param {ReturnType<typeof textFor>} text */
function upNextText(segment, text) {
  return `Up next: ${text.name(segment)} at ${text.time(segment.start)}`;
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
 * The "Next rings today" lines: every ring from `now` to midnight, with its
 * time, what rings and its sound.
 * @param {Date} now
 * @param {object[]} schoolYears
 * @param {import('./clock-settings.js').RingSettings} ringSettings
 * @param {ReturnType<typeof textFor>} text
 */
function nextRingLines(now, schoolYears, ringSettings, text) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return ringsInWindow(now, midnight, schoolYears, ringSettings).map((ring) => {
    const time = text.time(ring.at, { seconds: ring.at.getSeconds() !== 0 });
    return `${time} · ${ringSourceText(ring, text)} · ${SOUND_NAMES[ring.sound]}`;
  });
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
  /** The timer has rung and is still ringing: it keeps the big Readout until then. */
  let timerRinging = false;
  const ringingText = el('p');
  const ringingBanner = el('section', { 'aria-label': 'Ringing', role: 'alert', className: 'clock-ringing-card', hidden: true }, [
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
    timerRinging = false;
    ringingBanner.hidden = true;
    mount.classList.remove('clock-ringing', 'clock-ringing--flash', 'clock-ringing--steady');
    renderMiniRinging();
  }
  /** Stop the current ring, sound and all. */
  function dismiss() {
    soundPlayer.dismiss();
    stopRinging();
    render(new Date(clock.now()));
  }


  // First visit: ask the Division once. (Plain for now; ticket 18 designs it.)
  const prompt = el('section', { 'aria-label': 'Choose your Division', className: 'clock-prompt' }, [
    el('p', { textContent: 'Which Division do you teach?' }),
    ...DIVISIONS.map(([key, name]) =>
      el('button', { type: 'button', textContent: name, onclick: () => updateSettings({ division: key }) })),
  ]);

  // The Readouts, redrawn only when their arrangement changes. The big one
  // is the layout's first, or the timer while it's running, paused or
  // ringing. The timer's spot is never part of the saved layout, so when it
  // goes the layout is back exactly as it was. Edit mode (adding and
  // removing) belongs to this tab's page only and is never saved.
  let lastMoment = null;
  let editing = false;
  const readoutsView = createReadoutsView({
    onCycle: (i) => changeLayout(cycleReadout(layout, i)),
    onRemove: (i) => {
      changeLayout(removeReadout(layout, i));
      // Focus moves on to the next Remove button, or to Done once none is left.
      if (!readoutsView.focusRemove(i)) readoutsControl.focus();
    },
    onAdd: () => {
      changeLayout(addReadout(layout, lastMoment));
      readoutsView.focusReadout(layout.readouts.length - 1);
    },
  });
  const editNote = el('p', { className: 'clock-edit-note', textContent: 'Tap a Readout to change what it shows' });
  /** @param {boolean} on */
  function setEditing(on) {
    editing = on;
    render(new Date(clock.now()));
  }
  const onKeyDown = (event) => {
    if (event.key !== 'Escape' || !editing) return;
    setEditing(false);
    readoutsControl.focus();
  };
  document.addEventListener('keydown', onKeyDown);

  // The top bar's controls: quiet text buttons with icons. The plain timer
  // panel is restyled by ticket 22; Settings opens the drawer
  // (settings-drawer.js); Look (21) slots in between Readouts and Settings.
  /** @param {string} label @param {Parameters<typeof icon>[0]} iconName @param {object} props */
  const topControl = (label, iconName, props) => {
    const text = el('span', { className: 'clock-control__label', textContent: label });
    const button = el('button', { type: 'button', className: 'clock-control', ...props }, [icon(iconName), text]);
    return Object.assign(button, { setLabel: (to) => { text.textContent = to; } });
  };
  /** @type {{ panel: HTMLElement, button: HTMLElement }[]} */
  const panels = [];
  /** A plain panel the top bar opens and closes. @param {HTMLElement} panel @param {string} id */
  function panelToggle(panel, id, label, iconName) {
    panel.id = id;
    panel.hidden = true;
    panel.classList.add('clock-panel');
    const button = topControl(label, iconName, {
      'aria-controls': id, 'aria-expanded': 'false',
      onclick: () => showPanel(panel.hidden ? panel : null),
    });
    panels.push({ panel, button });
    return button;
  }
  /** Show one panel (or none), closing the others. @param {HTMLElement | null} shownPanel */
  function showPanel(shownPanel) {
    for (const { panel, button } of panels) {
      panel.hidden = panel !== shownPanel;
      button.setAttribute('aria-expanded', String(!panel.hidden));
    }
  }
  const bellsControl = topControl('Bells', 'bell', {
    onclick: () => updateSettings({ bells: { ...settings.bells, on: !settings.bells.on } }),
  });
  const readoutsControl = topControl('Readouts', 'readouts', { onclick: () => setEditing(!editing) });
  readoutsControl.classList.add('clock-control--fills');
  const divisionChip = el('button', {
    type: 'button', className: 'clock-chip', onclick: () => openSettings(divisionChip, { atDivision: true }),
  });

  // Turning sound on (browsers need one click after every load): bottom
  // centre, over the bar. (Plain for now; ticket 18 designs it.)
  const soundOn = el('button', { type: 'button', textContent: 'Turn sound on', onclick: () => soundPlayer.resume() });
  const noSound = el('p', { textContent: "Sound isn't available in this browser." });
  const soundPrompt = el('section', { 'aria-label': 'Sound', className: 'clock-sound-prompt' }, [soundOn, noSound]);
  function showSoundState() {
    const state = soundPlayer.state();
    soundOn.hidden = state !== 'suspended';
    noSound.hidden = state !== 'unavailable';
    soundPrompt.hidden = soundOn.hidden && noSound.hidden;
  }
  soundPlayer.onStateChange(() => {
    showSoundState();
    scheduleSounds(new Date(clock.now()));
  });
  showSoundState();
  soundPlayer.setVolume(settings.volume);

  // The classroom timer.
  const timerPanel = createTimerPanel({ settings: () => settings, now: () => clock.now(), update: updateSettings });

  const timerControl = panelToggle(timerPanel.section, 'clock-timer-panel', 'Timer', 'timer');

  // The Settings drawer (what the clock does), over the rest of the page.
  const drawer = createSettingsDrawer({
    settings: () => settings,
    update: updateSettings,
    play: (sound) => soundPlayer.play(sound),
    testRing: () => {
      soundPlayer.play(settings.bells.sound);
      startRinging('Test ring', false);
    },
    behind: () => [...mount.children].filter((node) => !drawer.elements.includes(node)),
    onChange: (open) => settingsControl.setAttribute('aria-expanded', String(open)),
  });
  /** @param {HTMLElement} from @param {{ atDivision?: boolean }} [options] */
  function openSettings(from, options) {
    showPanel(null);
    drawer.open(from, options);
  }
  const settingsControl = topControl('Settings', 'gear', {
    'aria-controls': drawer.dialog.id, 'aria-expanded': 'false', 'aria-haspopup': 'dialog',
    onclick: () => openSettings(settingsControl),
  });

  // Fullscreen for projecting: the screen is kept awake for as long as it
  // lasts (however it ends), where the browser allows a wake lock.
  const { fullscreen, pictureInPicture } = capabilities;
  const wakeLock = createWakeLockKeeper(capabilities.wakeLock);
  const fullscreenButton = el('button', {
    type: 'button', className: 'clock-control clock-control--icon', hidden: !fullscreen,
    onclick: () => (fullscreen.isActive() ? fullscreen.exit() : fullscreen.request(mount)).catch(() => {}),
  });
  function showFullscreen() {
    const on = Boolean(fullscreen?.isActive());
    const name = on ? 'Exit fullscreen' : 'Fullscreen';
    fullscreenButton.setAttribute('aria-label', name);
    fullscreenButton.title = name;
    fullscreenButton.replaceChildren(icon(on ? 'collapse' : 'expand'));
    if (on) wakeLock.hold();
    else wakeLock.release();
  }
  const stopWatchingFullscreen = fullscreen?.onChange(showFullscreen);
  showFullscreen();

  // The mini player, redrawn with every render of the main page.
  const mini = createMiniPlayer({
    pictureInPicture,
    onOpen: () => {
      render(new Date(clock.now()));
      renderMiniRinging();
    },
    onDismiss: () => dismiss(),
  });
  mini.button.classList.add('clock-control', 'clock-control--icon', 'clock-control--mini');
  globalThis.addEventListener('pagehide', mini.close);

  /**
   * @param {Date} now @param {import('./clock-model.js').Moment | null} moment
   * @param {string} bigReadout the big Readout's text
   * @param {ReturnType<typeof textFor>} text
   */
  function renderMini(now, moment, bigReadout, text) {
    mini.show({
      readout: bigReadout,
      status: moment ? statusHeading(moment, text) : '',
      upNext: moment?.upNext ? upNextText(moment.upNext, text) : '',
    });
  }
  function renderMiniRinging() {
    mini.showRinging(ringingBanner.hidden ? null : ringingText.textContent);
  }

  // The main screen: the "Simulated time" banner (with ?at=), the top bar,
  // the stage (heading, Readouts, the line under them) and the bottom row
  // (the bar's place, ticket 20, then the window buttons).
  const banner = el('p', { className: 'clock-banner' });
  const dayLine = el('p', { className: 'clock-day' });
  const heading = el('h1', { className: 'clock-title' });
  const underLine = el('p');
  const stage = el('section', { className: 'clock-stage', 'aria-label': 'Clock' }, [heading, readoutsView.element, underLine, editNote]);
  const top = el('header', { className: 'clock-top' }, [
    dayLine,
    el('div', { className: 'clock-top__end' }, [
      el('nav', { className: 'clock-controls', 'aria-label': 'Clock controls' },
        [timerControl, bellsControl, readoutsControl, settingsControl]),
      divisionChip,
    ]),
  ]);
  const bottom = el('footer', { className: 'clock-bottom' }, [
    el('div', { className: 'clock-bar-slot' }),
    el('div', { className: 'clock-corner', role: 'group', 'aria-label': 'Window' }, [mini.button, fullscreenButton]),
  ]);
  const mainScreen = el('main', { className: clock.simulated ? 'clock-screen is-simulated' : 'clock-screen' }, [
    ...(clock.simulated ? [banner] : []), top, stage, bottom,
  ]);
  mount.replaceChildren(mainScreen, prompt, ringingBanner, soundPrompt, timerPanel.section, ...drawer.elements);

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
        if (ring.at.getTime() < staleBefore) continue;
        startRinging(ringSourceText(ring, text), ringsUntilDismissed(ring));
        if (ring.source === 'timer') timerRinging = true;
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
    const text = textFor(settings);
    const moment = chosen ? describeMoment(now, schoolYears, { division: settings.division }) : null;
    prompt.hidden = chosen;
    timerPanel.render(now);
    drawer.render();
    bellsControl.setAttribute('aria-pressed', String(settings.bells.on));
    for (const control of [timerControl, bellsControl, settingsControl, divisionChip]) control.hidden = !chosen;
    divisionChip.replaceChildren(
      el('span', { className: 'visually-hidden', textContent: 'Division: ' }),
      String(settings.division),
      el('span', { className: 'visually-hidden', textContent: ', switch Division' }),
    );
    banner.replaceChildren(icon('clock'), el('span', {
      textContent: `Simulated time · ${formatShortDate(now)}, ${text.now(now)} · this tab only`,
    }));
    renderStageText(now, moment);
    renderMini(now, moment, renderReadouts(now, moment), text);
    drawer.showRings(chosen ? nextRingLines(now, schoolYears, settings, text) : []);
  }

  /** "All Day · Tue, Oct 27", with the dot spaced apart. @param {string} day */
  function showDay(day) {
    const [label, date] = day.split(' · ');
    dayLine.replaceChildren(...(date ? [
      label, ' ', el('span', { className: 'clock-day__dot', 'aria-hidden': 'true', textContent: '·' }), ' ', date,
    ] : [label]));
  }

  /**
   * The Day Label, the heading and the line under the Readouts.
   * @param {Date} now @param {import('./clock-model.js').Moment | null} moment
   */
  function renderStageText(now, moment) {
    if (!moment) {
      showDay(formatShortDate(now));
      heading.replaceChildren(el('span', { className: 'visually-hidden', textContent: 'School Clock' }));
      underLine.replaceChildren();
      return;
    }
    const words = displayText(now, moment, settings);
    showDay(words.day);
    heading.replaceChildren(words.title, ...(words.tag ? [
      ' ', el('span', { className: 'clock-title__dot', 'aria-hidden': 'true', textContent: '·' }), ' ',
      el('span', { className: 'clock-title__tag', textContent: words.tag }),
    ] : []));
    if (words.upNext) {
      underLine.className = 'clock-next';
      underLine.replaceChildren(
        el('span', { className: 'clock-next__label', textContent: 'Up next' }), ' ',
        el('span', { textContent: words.upNext.name }), ' ',
        el('span', { className: 'clock-next__at', textContent: words.upNext.at }),
      );
    } else {
      underLine.className = 'clock-line';
      underLine.textContent = words.line ?? '';
    }
  }

  /**
   * Show the Readouts for `moment`: the tab's layout (with the timer in the
   * big spot while it shows), or just the time before a Division is chosen
   * or on a date the clock knows nothing about.
   * @param {Date} now @param {import('./clock-model.js').Moment | null} moment
   * @returns {string} the big Readout's text
   */
  function renderReadouts(now, moment) {
    const options = textFor(settings).readout;
    const timeOnly = !moment || moment.state === 'unknown';
    readoutsControl.hidden = timeOnly;
    if (timeOnly) {
      editing = false;
      const parts = readoutParts({ kind: 'time', at: now }, options);
      readoutsView.show({ count: 1, cyclable: false, timer: false, editing: false, canAdd: false }, [parts], '');
      showEditing();
      return parts.amount;
    }
    lastMoment = moment;
    if (!layout) {
      layout = newLayout(moment);
      layoutStore.keepInTab(layout);
    }
    const timer = timerText(settings, now.getTime());
    const withTimer = timer !== '' || timerRinging;
    const values = layout.readouts.map(({ mode }) => readoutValue(mode, moment, now));
    readoutsView.show(
      { count: values.length, cyclable: true, timer: withTimer, editing, canAdd: canAddReadout(layout) },
      values.map((value) => readoutParts(value, options)),
      timer || "Time's up",
    );
    showEditing();
    return withTimer ? (timer || "Time's up") : readoutText(values[0], options);
  }

  /** The Readouts control's pressed state, and the screen's edit-mode look. */
  function showEditing() {
    readoutsControl.setAttribute('aria-pressed', String(editing));
    readoutsControl.setLabel(editing ? 'Done' : 'Readouts');
    editNote.hidden = !editing;
    mainScreen.classList.toggle('is-editing', editing);
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
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);
    globalThis.removeEventListener('pagehide', mini.close);
    stopWatchingFullscreen?.();
    wakeLock.release();
    mini.close();
    drawer.destroy();
    soundPlayer.close();
    if (destroyActiveApp === destroy) destroyActiveApp = null;
  }
  destroyActiveApp = destroy;
  return { destroy };
}

if (typeof document !== 'undefined' && document.getElementById('clockApp')) {
  initClockApp({ search: window.location.search });
}
