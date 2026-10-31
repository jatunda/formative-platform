// @ts-check
// The teacher's School Clock settings, saved on their own device. One
// versioned localStorage key holds them all; whatever is missing, corrupt or
// of the wrong shape falls back to its default (field by field, and Alarm by
// Alarm), so a bad save never stops the clock. Nothing here listens for
// cross-tab storage events: open tabs never change each other.
import { createStorageAdapter } from '../storage.js';
import { SOUNDS } from './sound.js';
import { QUICK_PICKS } from './timer.js';

/** @typedef {import('./clock-settings.js').ClockSettings} ClockSettings */
/** @typedef {import('./clock-settings.js').Alarm} Alarm */

/** Bump the version (and migrate) if the saved shape ever changes incompatibly. */
export const SETTINGS_KEY = 'school-clock-settings-v1';

/** @type {Readonly<ClockSettings>} */
export const DEFAULT_SETTINGS = Object.freeze(/** @type {ClockSettings} */ ({
  division: null,
  use24Hour: false,
  periodLabels: {},
  bells: { on: true, sound: 'schoolBell' },
  alarms: [],
  volume: 0.8,
  timerEndsAt: null,
  timerPausedMs: null,
  timerSound: 'beep',
  recentDurations: [],
  showSeconds: true,
  dayStrip: true,
  // Ticket 02's default: a dark muted blue look (ticket 21 names the theme set).
  theme: 'default',
  fontSwap: null,
  paletteSwap: null,
  colorScheme: 'dark',
}));

/** @type {readonly import('./clock-settings.js').ColorScheme[]} */
const COLOR_SCHEMES = Object.freeze(['light', 'dark', 'auto']);
/** A theme, font or palette id: the set itself isn't known until ticket 21. @param {unknown} v */
const isId = (v) => typeof v === 'string' && v !== '';

/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {unknown} v */
const isSound = (v) => SOUNDS.includes(/** @type {import('./clock-settings.js').SoundName} */ (v));
/** @param {unknown} v */
const isStringList = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
/** @param {unknown} v @returns {v is number} */
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** @param {unknown} anchor */
function isAnchor(anchor) {
  if (!isObject(anchor)) return false;
  if (anchor.from === 'halfway') return true;
  return (anchor.from === 'start' || anchor.from === 'end') && isFiniteNumber(anchor.minutes);
}

/**
 * @param {unknown} a
 * @returns {a is Alarm}
 */
function isAlarm(a) {
  if (!isObject(a)) return false;
  const base = typeof a.id === 'string' && typeof a.enabled === 'boolean' && isSound(a.sound)
    && (a.label === undefined || typeof a.label === 'string')
    && (a.bellSchedules === null || isStringList(a.bellSchedules));
  if (!base) return false;
  if (a.kind === 'period') return isAnchor(a.anchor) && isStringList(a.periods);
  return a.kind === 'clock' && /^\d\d:\d\d$/.test(a.time)
    && (a.repeat === 'everySchoolDay' || (a.repeat === 'once' && typeof a.date === 'string'));
}

/**
 * Saved data (anything) to settings: each field that isn't valid becomes its default.
 * @param {unknown} saved
 * @returns {ClockSettings}
 */
function parseSettings(saved) {
  const s = isObject(saved) ? saved : {};
  const d = DEFAULT_SETTINGS;
  /** @type {Record<string, string>} */
  const periodLabels = {};
  if (isObject(s.periodLabels)) {
    for (const [name, label] of Object.entries(s.periodLabels)) {
      if (typeof label === 'string') periodLabels[name] = label;
    }
  }
  const bells = s.bells;
  const timerEndsAt = isFiniteNumber(s.timerEndsAt) ? s.timerEndsAt : d.timerEndsAt;
  const isPositive = (v) => isFiniteNumber(v) && v > 0;
  return {
    division: s.division === 'MS' || s.division === 'HS' ? s.division : d.division,
    use24Hour: typeof s.use24Hour === 'boolean' ? s.use24Hour : d.use24Hour,
    periodLabels,
    bells: isObject(bells) && typeof bells.on === 'boolean' && isSound(bells.sound)
      ? { on: bells.on, sound: bells.sound } : { ...d.bells },
    alarms: Array.isArray(s.alarms) ? s.alarms.filter(isAlarm) : [],
    volume: isFiniteNumber(s.volume) && s.volume >= 0 && s.volume <= 1 ? s.volume : d.volume,
    timerEndsAt,
    // One timer at a time: a running one wins over a paused one.
    timerPausedMs: timerEndsAt === null && isPositive(s.timerPausedMs) ? s.timerPausedMs : d.timerPausedMs,
    timerSound: isSound(s.timerSound) ? s.timerSound : d.timerSound,
    recentDurations: Array.isArray(s.recentDurations)
      ? s.recentDurations.filter(isPositive).slice(0, QUICK_PICKS) : [],
    showSeconds: typeof s.showSeconds === 'boolean' ? s.showSeconds : d.showSeconds,
    dayStrip: typeof s.dayStrip === 'boolean' ? s.dayStrip : d.dayStrip,
    theme: isId(s.theme) ? s.theme : d.theme,
    fontSwap: isId(s.fontSwap) ? s.fontSwap : d.fontSwap,
    paletteSwap: isId(s.paletteSwap) ? s.paletteSwap : d.paletteSwap,
    colorScheme: COLOR_SCHEMES.includes(s.colorScheme) ? s.colorScheme : d.colorScheme,
  };
}

/**
 * The settings saved in `storage` (localStorage on the real page; a fake in tests).
 * @param {import('../storage.js').StorageLike} storage
 * @returns {{ load: () => ClockSettings, save: (settings: ClockSettings) => boolean }}
 *   `save` never throws: if storage is full or blocked the change just isn't
 *   kept, and it returns false (so the page can say so).
 */
export function createSettingsStore(storage) {
  const adapter = createStorageAdapter(SETTINGS_KEY, storage, { quiet: true });
  const writer = createStorageAdapter(SETTINGS_KEY, storage);
  return {
    load: () => parseSettings(adapter.load()),
    save: (settings) => {
      try {
        writer.save(settings);
        return true;
      } catch {
        return false;
      }
    },
  };
}
