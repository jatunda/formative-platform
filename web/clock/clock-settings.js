// @ts-check
// The shapes of a teacher's device settings: Division, Period Labels, time
// format, and what rings (Bells and Alarms). Plain JSON-friendly data that
// `clock-storage.js` saves in localStorage; the clock model's "rings in a
// window" query reads the ring fields.

/** @typedef {import('./school-years.js').Division} Division */

/**
 * A named generated voice (the sound engine synthesises each one).
 * @typedef {'chime' | 'schoolBell' | 'beep' | 'buzzer'} SoundName
 */

/**
 * The built-in Bells, turned on or off as a whole.
 * @typedef {{ on: boolean, sound: SoundName }} BellsSettings
 */

/**
 * Fields every Alarm has.
 * - `id`: stable within the device's list of Alarms.
 * - `label`: the teacher's optional name for it ("Exit tickets").
 * - `enabled`: false turns it off without deleting it; it never rings.
 * - `bellSchedules`: keys of `SchoolYear.bellSchedules` (e.g. 'even') it is
 *   limited to; null means every Bell Schedule (and, for a Clock Alarm, any
 *   day at all). `BLOCK_DAYS` is the Block Days shortcut.
 * @typedef {{
 *   id: string,
 *   label?: string,
 *   enabled: boolean,
 *   sound: SoundName,
 *   bellSchedules: string[] | null,
 * }} AlarmBase
 */

/**
 * An Alarm at a fixed time of day. `time` is a 24-hour "HH:MM" local
 * wall-clock time. `repeat: 'once'` rings only on `date` ("YYYY-MM-DD"), on
 * any kind of day; `'everySchoolDay'` rings on every School Day (never days
 * off or Experience Week) and ignores `date`.
 * @typedef {AlarmBase & {
 *   kind: 'clock',
 *   time: string,
 *   repeat: 'once' | 'everySchoolDay',
 *   date?: string,
 * }} ClockAlarm
 */

/**
 * Where in a Period a Period Alarm rings: `minutes` after its start ("at
 * minute 40"), `minutes` before its end, or halfway through.
 * @typedef {{ from: 'start', minutes: number }
 *   | { from: 'end', minutes: number }
 *   | { from: 'halfway' }} PeriodAnchor
 */

/**
 * An Alarm at a point within every Period it applies to. `periods` names the
 * Periods ("Period 3", "Seminar", "Super Seminar"); `DEFAULT_ALARM_PERIODS`
 * is Periods 1–7. Never rings in a Break or Assembly.
 * @typedef {AlarmBase & {
 *   kind: 'period',
 *   anchor: PeriodAnchor,
 *   periods: string[],
 * }} PeriodAlarm
 */

/** @typedef {ClockAlarm | PeriodAlarm} Alarm */

/**
 * Everything "rings in a window" reads. `division` defaults to HS.
 * `timerEndsAt` is the running classroom timer's end (epoch ms), or
 * null/missing when none is running, and `timerTotalMs` its length (for the
 * ring card); `timerSound` is its voice (beep when missing).
 * @typedef {{
 *   division?: Division,
 *   bells: BellsSettings,
 *   alarms: Alarm[],
 *   timerEndsAt?: number | null,
 *   timerTotalMs?: number | null,
 *   timerSound?: SoundName,
 * }} RingSettings
 */

/**
 * Everything a teacher sets on their device (saved by `clock-storage.js`).
 * - `division`: null until the teacher has been asked on their first visit.
 * - `use24Hour`: show clock times as "13:05" rather than "1:05 PM".
 * - `periodLabels`: Period name ("Period 3") -> the teacher's label ("AP CSA").
 * - `volume`: 0–1, for every sound.
 * - `timerPausedMs`: a paused timer's time left (null unless paused; then
 *   `timerEndsAt` is null). See `timer.js`.
 * - `timerTotalMs`: the length the timer was started with (its ring's whole),
 *   or null with no timer.
 * - `recentDurations`: the last 3 distinct custom timer durations (ms), most
 *   recent first: the timer's quick picks.
 * - `showSeconds`: clock times and countdowns show seconds (a countdown's
 *   last minute and the timer always do).
 * - `dayStrip`: the bar along the bottom shows the whole day (true) or just
 *   this Segment (false). See `day-bar.js`.
 * - `theme`: the theme's id (`themes.js`); `fontSwap` / `paletteSwap` swap its
 *   font or palette for another pre-checked one (null keeps the theme's own).
 * - `flipped`: false follows the theme (its palette's own light or dark
 *   version); true shows its other version. There is no "auto".
 * - `themeHint`: the "Pick a theme" hint still shows (until a theme is picked
 *   or the hint is dismissed).
 * The rest are the RingSettings fields.
 * @typedef {{
 *   division: Division | null,
 *   use24Hour: boolean,
 *   periodLabels: Record<string, string>,
 *   bells: BellsSettings,
 *   alarms: Alarm[],
 *   volume: number,
 *   timerEndsAt: number | null,
 *   timerPausedMs: number | null,
 *   timerTotalMs: number | null,
 *   timerSound: SoundName,
 *   recentDurations: number[],
 *   showSeconds: boolean,
 *   dayStrip: boolean,
 *   theme: string,
 *   fontSwap: string | null,
 *   paletteSwap: string | null,
 *   flipped: boolean,
 *   themeHint: boolean,
 * }} ClockSettings
 */

/** The Divisions a teacher can be with: key and full name. @type {readonly (readonly [Division, string])[]} */
export const DIVISIONS = Object.freeze([['MS', 'Middle School'], ['HS', 'High School']]);

/** The Block Days shortcut: Bell Schedules with long (~85-minute) Periods. */
export const BLOCK_DAYS = Object.freeze(['even', 'odd', 'lateStartEven', 'hsSuperSeminar']);

/** Periods a new Period Alarm applies to; Seminar and Super Seminar are opt-in. */
export const DEFAULT_ALARM_PERIODS = Object.freeze(
  ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'],
);

/** Every Period a teacher can give a Period Label, in the order the page lists them. */
export const LABELLED_PERIODS = Object.freeze([...DEFAULT_ALARM_PERIODS, 'Seminar', 'Super Seminar']);
