// @ts-check
// The teacher's School Clock settings, saved on their own device. One
// versioned localStorage key holds them all; whatever is missing, corrupt or
// of the wrong shape falls back to its default (field by field, and Alarm by
// Alarm), so a bad save never stops the clock. Nothing here listens for
// cross-tab storage events: open tabs never change each other.
import { createStorageAdapter } from '../storage.js';
import { SOUNDS } from './sound.js';
import { DEFAULT_THEME, isFont, isPalette, isTheme, migrateFlipped } from './themes.js';
import { QUICK_PICKS, cleanTimerName } from './timer.js';

/** @typedef {import('./clock-settings.js').ClockSettings} ClockSettings */
/** @typedef {import('./clock-settings.js').Alarm} Alarm */

/** Bump the version (and migrate) if the saved shape ever changes incompatibly. */
export const SETTINGS_KEY = 'school-clock-settings-v1';

/** @type {Readonly<ClockSettings>} */
export const DEFAULT_SETTINGS = Object.freeze(/** @type {ClockSettings} */ ({
  division: null,
  use24Hour: false,
  periodLabels: {},
  bells: { on: true, sound: 'softBell', assemblyEnds: false, untilDismissed: false },
  alarms: [],
  volume: 0.8,
  timerEndsAt: null,
  timerPausedMs: null,
  timerTotalMs: null,
  timerName: null,
  timerSound: 'beep',
  quickPicks: [],
  showSeconds: true,
  dayStrip: true,
  showPeriodEnd: false,
  // The dark muted blue theme, in its own version.
  theme: DEFAULT_THEME,
  fontSwap: null,
  paletteSwap: null,
  flipped: false,
  themeHint: true,
}));

/** @param {unknown} v @returns {v is Record<string, any>} */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/**
 * Voices saved under a key they no longer have: the gentle bell was
 * `schoolBell` until the loud hallway bell was added as School bell.
 */
const RENAMED_SOUNDS = Object.freeze({ schoolBell: 'softBell' });
/**
 * A saved voice as it is now named, or the saved value as is.
 * @param {unknown} v @returns {unknown}
 */
const savedSound = (v) => (typeof v === 'string' && Object.hasOwn(RENAMED_SOUNDS, v) ? RENAMED_SOUNDS[v] : v);
/**
 * A saved Bells or Alarm object with its voice as it is now named.
 * @param {unknown} v @returns {unknown}
 */
const withSavedSound = (v) => (isObject(v) ? { ...v, sound: savedSound(v.sound) } : v);
/** @param {unknown} v @returns {v is import('./clock-settings.js').SoundName} */
const isSound = (v) => SOUNDS.includes(/** @type {import('./clock-settings.js').SoundName} */ (v));
/** @param {unknown} v */
const isStringList = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
/** @param {unknown} v @returns {v is number} */
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * The saved quick picks: each `{ ms, name? }` (`label` in place of `name` in
 * an older save), or a bare length in ms as saved (as `recentDurations`)
 * before timers had names.
 * @param {Record<string, any>} s the saved settings
 * @returns {import('./timer.js').QuickPick[]}
 */
function parseQuickPicks(s) {
  const saved = Array.isArray(s.quickPicks) ? s.quickPicks : s.recentDurations;
  if (!Array.isArray(saved)) return [];
  return saved.map((p) => (isObject(p) ? p : { ms: p }))
    .filter((p) => isFiniteNumber(p.ms) && p.ms > 0)
    .slice(0, QUICK_PICKS)
    .map((p) => {
      const name = savedName(p.name, p.label);
      return name ? { ms: p.ms, name } : { ms: p.ms };
    });
}

/**
 * A saved timer name, cleaned: `name` when it's a string, else the older
 * save's `label` (timers' names were saved as labels); null for none.
 * @param {unknown} name @param {unknown} label
 */
function savedName(name, label) {
  const saved = typeof name === 'string' ? name : label;
  return typeof saved === 'string' ? cleanTimerName(saved) : null;
}

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
  const bells = withSavedSound(s.bells);
  const timerSound = savedSound(s.timerSound);
  const timerEndsAt = isFiniteNumber(s.timerEndsAt) ? s.timerEndsAt : d.timerEndsAt;
  const isPositive = (v) => isFiniteNumber(v) && v > 0;
  // One timer at a time: a running one wins over a paused one.
  const timerPausedMs = timerEndsAt === null && isPositive(s.timerPausedMs) ? s.timerPausedMs : d.timerPausedMs;
  const hasTimer = timerEndsAt !== null || timerPausedMs !== null;
  return {
    division: s.division === 'MS' || s.division === 'HS' ? s.division : d.division,
    use24Hour: typeof s.use24Hour === 'boolean' ? s.use24Hour : d.use24Hour,
    periodLabels,
    bells: isObject(bells) && typeof bells.on === 'boolean' && isSound(bells.sound)
      ? { on: bells.on, sound: bells.sound, assemblyEnds: bells.assemblyEnds === true, untilDismissed: bells.untilDismissed === true }
      : { ...d.bells },
    alarms: Array.isArray(s.alarms) ? s.alarms.map(withSavedSound).filter(isAlarm) : [],
    volume: isFiniteNumber(s.volume) && s.volume >= 0 && s.volume <= 1 ? s.volume : d.volume,
    timerEndsAt,
    timerPausedMs,
    timerTotalMs: hasTimer && isPositive(s.timerTotalMs) ? s.timerTotalMs : d.timerTotalMs,
    // An older save named it `timerLabel`.
    timerName: hasTimer ? savedName(s.timerName, s.timerLabel) : d.timerName,
    timerSound: isSound(timerSound) ? timerSound : d.timerSound,
    quickPicks: parseQuickPicks(s),
    showSeconds: typeof s.showSeconds === 'boolean' ? s.showSeconds : d.showSeconds,
    dayStrip: typeof s.dayStrip === 'boolean' ? s.dayStrip : d.dayStrip,
    showPeriodEnd: typeof s.showPeriodEnd === 'boolean' ? s.showPeriodEnd : d.showPeriodEnd,
    // The earlier 'default' theme (and any id the set doesn't have) is the default.
    theme: isTheme(s.theme) ? s.theme : d.theme,
    fontSwap: isFont(s.fontSwap) ? s.fontSwap : d.fontSwap,
    paletteSwap: isPalette(s.paletteSwap) ? s.paletteSwap : d.paletteSwap,
    // An earlier version saved light / dark / auto as `colorScheme`; it becomes the flip.
    flipped: typeof s.flipped === 'boolean' ? s.flipped : migrateFlipped(s),
    themeHint: typeof s.themeHint === 'boolean' ? s.themeHint : d.themeHint,
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
  return {
    load: () => parseSettings(adapter.load()),
    save: (settings) => adapter.save(settings),
  };
}

/** Which one-time tips this device has already seen. */
export const HINTS_KEY = 'school-clock-hints-v1';

/**
 * The one-time tips this device has seen (the "Click to change what this
 * shows" tooltip, once on the page and once in the mini player), in their own
 * key so seeing one doesn't save the settings (or say a save failed). It never
 * throws: storage that can't be read means nothing seen yet, and a tip that
 * can't be remembered just shows again next time.
 * @param {import('../storage.js').StorageLike} storage
 * @returns {{ seen: (name: string) => boolean, markSeen: (name: string) => void }}
 */
export function createHintStore(storage) {
  const adapter = createStorageAdapter(HINTS_KEY, storage, { quiet: true });
  const read = () => {
    const saved = adapter.load();
    return isObject(saved) ? saved : {};
  };
  return {
    seen: (name) => read()[name] === true,
    markSeen: (name) => { adapter.save({ ...read(), [name]: true }); },
  };
}
