// @ts-check
// The shapes of a teacher's device settings that decide what rings: Bells and
// Alarms. Plain JSON-friendly data (ticket 10 saves it in localStorage); the
// clock model's "rings in a window" query reads it.

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
 * null/missing when none is running; `timerSound` is its voice (beep when
 * missing).
 * @typedef {{
 *   division?: Division,
 *   bells: BellsSettings,
 *   alarms: Alarm[],
 *   timerEndsAt?: number | null,
 *   timerSound?: SoundName,
 * }} RingSettings
 */

/** The Block Days shortcut: Bell Schedules with long (~85-minute) Periods. */
export const BLOCK_DAYS = Object.freeze(['even', 'odd', 'lateStartEven', 'hsSuperSeminar']);

/** Periods a new Period Alarm applies to; Seminar and Super Seminar are opt-in. */
export const DEFAULT_ALARM_PERIODS = Object.freeze(
  ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'],
);

/**
 * A hard-coded sample the page shows until saved settings exist (ticket 10).
 * @type {RingSettings}
 */
export const SAMPLE_SETTINGS = {
  bells: { on: true, sound: 'schoolBell' },
  alarms: [
    {
      id: 'sample-check-email', kind: 'clock', label: 'Check email', enabled: true, sound: 'chime',
      bellSchedules: null, time: '08:20', repeat: 'everySchoolDay',
    },
    {
      id: 'sample-wrap-up', kind: 'period', enabled: true, sound: 'beep', bellSchedules: null,
      anchor: { from: 'end', minutes: 5 }, periods: [...DEFAULT_ALARM_PERIODS],
    },
    {
      id: 'sample-walk', kind: 'period', label: 'Mid-period walk', enabled: true, sound: 'buzzer',
      bellSchedules: [...BLOCK_DAYS], anchor: { from: 'halfway' }, periods: [...DEFAULT_ALARM_PERIODS],
    },
  ],
};
