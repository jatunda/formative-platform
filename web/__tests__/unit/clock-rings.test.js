import { describe, it, expect } from 'vitest';
import { alarmsAfterRinging, ringsInWindow } from '../../clock/clock-model.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';
import { BLOCK_DAYS, DEFAULT_ALARM_PERIODS } from '../../clock/clock-settings.js';

// Tue 2026-10-27 is an All Day; Wed 10/28 an Even Day; Thu 10/29 an Odd Day.
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);
const wed = (h, m, s = 0) => new Date(2026, 9, 28, h, m, s);

const BELLS_ONLY = { bells: { on: true, sound: 'schoolBell' }, alarms: [] };
const times = (rings) => rings.map((r) => r.at);

describe('ringsInWindow: Bells', () => {
  it('rings at the start and end of every Period and Break, once where Segments touch', () => {
    const rings = ringsInWindow(tue(0, 0), tue(23, 59), SCHOOL_YEARS, BELLS_ONLY);

    expect(times(rings)).toEqual([
      tue(8, 30), tue(9, 20), // Period 1
      tue(9, 25), tue(10, 10), // Period 2, ending as Nutrition begins
      tue(10, 25), // Nutrition ends
      tue(10, 30), tue(11, 15), // Period 3
      tue(11, 20), tue(12, 5), // Period 4
      tue(12, 10), tue(12, 55), // Period 5, ending as Lunch begins
      tue(13, 30), // Lunch ends
      tue(13, 35), tue(14, 20), // Period 6
      tue(14, 25), tue(15, 10), // Period 7
    ]);
    expect(rings.every((r) => r.source === 'bell' && r.sound === 'schoolBell')).toBe(true);
  });

  it('names the Segments a shared-edge Bell ends and starts', () => {
    const [bell] = ringsInWindow(tue(10, 10), tue(10, 11), SCHOOL_YEARS, BELLS_ONLY);
    expect(bell.ends.name).toBe('Period 2');
    expect(bell.starts.name).toBe('Nutrition');
  });

  it('never rings for an Assembly (HS Even Day Chapel 10:15–10:55)', () => {
    const rings = ringsInWindow(wed(10, 0), wed(11, 30), SCHOOL_YEARS, BELLS_ONLY);
    expect(times(rings)).toEqual([wed(10, 10), wed(11, 0)]);
  });

  it('follows the Division: MS Even Day has Period 4 before Chapel', () => {
    const rings = ringsInWindow(wed(10, 0), wed(11, 50), SCHOOL_YEARS, { ...BELLS_ONLY, division: 'MS' });
    expect(times(rings)).toEqual([wed(10, 10), wed(10, 15), wed(11, 40)]);
  });

  it('rings nothing with Bells off, or on a day off', () => {
    expect(ringsInWindow(tue(0, 0), tue(23, 59), SCHOOL_YEARS, {
      bells: { on: false, sound: 'schoolBell' }, alarms: [],
    })).toEqual([]);
    // Sat 10/31 is a Weekend; Fri 10/9 is Teacher In-Service.
    expect(ringsInWindow(new Date(2026, 9, 31), new Date(2026, 10, 1), SCHOOL_YEARS, BELLS_ONLY)).toEqual([]);
    expect(ringsInWindow(new Date(2026, 9, 9), new Date(2026, 9, 10), SCHOOL_YEARS, BELLS_ONLY)).toEqual([]);
  });
});

const NO_BELLS = { on: false, sound: 'schoolBell' };
const withAlarms = (...alarms) => ({ bells: NO_BELLS, alarms });
const clockAlarm = (fields) => ({
  id: 'a1', kind: 'clock', enabled: true, sound: 'chime', bellSchedules: null,
  time: '15:00', repeat: 'everySchoolDay', ...fields,
});

describe('ringsInWindow: Clock Alarms', () => {
  // Thu 10/8/26 is a Wed/Thu All day; Fri 10/9 Teacher In-Service; Sat 10/10 a Weekend.
  const oct = (d, h = 0, m = 0) => new Date(2026, 9, d, h, m);

  it('every School Day: rings at its time on School Days only, never days off', () => {
    const rings = ringsInWindow(oct(8), oct(13), SCHOOL_YEARS, withAlarms(clockAlarm({})));
    expect(times(rings)).toEqual([oct(8, 15), oct(12, 15)]);
    expect(rings[0]).toMatchObject({ source: 'clockAlarm', sound: 'chime', alarm: { id: 'a1' } });
  });

  it('every School Day: never rings during HS Experience Week, but does for MS', () => {
    // Wed 1/20/27 is HS Experience Week; MS is on All Day.
    const day = [new Date(2027, 0, 20), new Date(2027, 0, 21)];
    const alarm = clockAlarm({});
    expect(ringsInWindow(...day, SCHOOL_YEARS, withAlarms(alarm))).toEqual([]);
    expect(times(ringsInWindow(...day, SCHOOL_YEARS, { ...withAlarms(alarm), division: 'MS' })))
      .toEqual([new Date(2027, 0, 20, 15, 0)]);
  });

  it('once: rings only on its day, whatever kind of day it is', () => {
    const alarm = clockAlarm({ repeat: 'once', date: '2026-10-10', time: '09:15' });
    const rings = ringsInWindow(oct(8), oct(13), SCHOOL_YEARS, withAlarms(alarm));
    expect(times(rings)).toEqual([oct(10, 9, 15)]);
  });

  it('a disabled Alarm never rings', () => {
    const rings = ringsInWindow(oct(8), oct(13), SCHOOL_YEARS, withAlarms(
      clockAlarm({ enabled: false }),
      clockAlarm({ enabled: false, repeat: 'once', date: '2026-10-10' }),
    ));
    expect(rings).toEqual([]);
  });

  it('limited to Bell Schedules: rings only on School Days following one of them', () => {
    // Mon 10/26 All, Tue 10/27 All, Wed 10/28 Even, Thu 10/29 Odd, Fri 10/30 All.
    const alarm = clockAlarm({ bellSchedules: ['odd'] });
    const rings = ringsInWindow(new Date(2026, 9, 26), new Date(2026, 9, 31), SCHOOL_YEARS, withAlarms(alarm));
    expect(times(rings)).toEqual([new Date(2026, 9, 29, 15, 0)]);
  });
});

const periodAlarm = (fields) => ({
  id: 'p1', kind: 'period', enabled: true, sound: 'beep', bellSchedules: null,
  anchor: { from: 'end', minutes: 5 }, periods: [...DEFAULT_ALARM_PERIODS], ...fields,
});
const day = (d) => [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)];

describe('ringsInWindow: Period Alarms', () => {
  it('minutes before the end, on every 45-minute Period of an All Day and never a Break', () => {
    const rings = ringsInWindow(...day(tue(0, 0)), SCHOOL_YEARS, withAlarms(periodAlarm({})));
    expect(times(rings)).toEqual([
      tue(9, 15), tue(10, 5), tue(11, 10), tue(12, 0), tue(12, 50), tue(14, 15), tue(15, 5),
    ]);
    expect(rings[0]).toMatchObject({ source: 'periodAlarm', sound: 'beep', alarm: { id: 'p1' } });
    expect(rings[0].period).toMatchObject({ name: 'Period 1', start: tue(8, 30), end: tue(9, 20) });
  });

  it('minutes from the start, on 85-minute Periods, never Chapel and not Seminar by default', () => {
    const alarm = periodAlarm({ anchor: { from: 'start', minutes: 40 } });
    const rings = ringsInWindow(...day(wed(0, 0)), SCHOOL_YEARS, withAlarms(alarm));
    expect(times(rings)).toEqual([wed(9, 10), wed(11, 40), wed(14, 25)]);
  });

  it('halfway lands mid-Period on both 45- and 85-minute Periods', () => {
    const alarm = periodAlarm({ anchor: { from: 'halfway' }, periods: ['Period 2'] });
    // All Day Period 2 9:25–10:10; Even Day Period 2 8:30–9:55.
    expect(times(ringsInWindow(...day(tue(0, 0)), SCHOOL_YEARS, withAlarms(alarm)))).toEqual([tue(9, 47, 30)]);
    expect(times(ringsInWindow(...day(wed(0, 0)), SCHOOL_YEARS, withAlarms(alarm)))).toEqual([wed(9, 12, 30)]);
  });

  it('skips a Period too short for its anchor', () => {
    // Minute 48 fits All Day Period 1 (50 min) but no 45-minute Period.
    const alarm = periodAlarm({ anchor: { from: 'start', minutes: 48 } });
    expect(times(ringsInWindow(...day(tue(0, 0)), SCHOOL_YEARS, withAlarms(alarm)))).toEqual([tue(9, 18)]);
    const before = periodAlarm({ anchor: { from: 'end', minutes: 48 } });
    expect(times(ringsInWindow(...day(tue(0, 0)), SCHOOL_YEARS, withAlarms(before)))).toEqual([tue(8, 32)]);
  });

  it('rings in Seminar and Super Seminar only when ticked', () => {
    const alarm = periodAlarm({ anchor: { from: 'halfway' }, periods: ['Seminar', 'Super Seminar'] });
    // HS Even Day Seminar 12:30–13:05.
    expect(times(ringsInWindow(...day(wed(0, 0)), SCHOOL_YEARS, withAlarms(alarm)))).toEqual([wed(12, 47, 30)]);
    // Wed 4/28/27: HS Super Seminar Even, Super Seminar 11:45–13:05.
    expect(times(ringsInWindow(...day(new Date(2027, 3, 28)), SCHOOL_YEARS, withAlarms(alarm))))
      .toEqual([new Date(2027, 3, 28, 12, 25)]);
  });

  it('applies only to the chosen Periods', () => {
    const alarm = periodAlarm({ periods: ['Period 4'] });
    expect(times(ringsInWindow(...day(tue(0, 0)), SCHOOL_YEARS, withAlarms(alarm)))).toEqual([tue(12, 0)]);
  });

  it('the Block Days shortcut limits it to Even, Odd, Late Start Even and HS Super Seminar Even', () => {
    expect([...BLOCK_DAYS].sort()).toEqual(['even', 'hsSuperSeminar', 'lateStartEven', 'odd']);
    const alarm = periodAlarm({ anchor: { from: 'halfway' }, periods: ['Period 2'], bellSchedules: [...BLOCK_DAYS] });
    const ringDays = (d) => ringsInWindow(...day(d), SCHOOL_YEARS, withAlarms(alarm)).length;
    expect(ringDays(tue(0, 0))).toBe(0); // All Day
    expect(ringDays(wed(0, 0))).toBe(1); // Even Day
    expect(ringDays(new Date(2026, 10, 4))).toBe(1); // Late Start Even
    expect(ringDays(new Date(2027, 3, 28))).toBe(1); // HS Super Seminar Even
    // Thu 10/29 Odd Day has no Period 2; the Odd Day is in scope for its own Periods.
    expect(ringsInWindow(...day(new Date(2026, 9, 29)), SCHOOL_YEARS, withAlarms({ ...alarm, periods: ['Period 1'] })))
      .toHaveLength(1);
    expect(ringDays(new Date(2026, 9, 30))).toBe(0); // Fri All Day
  });

  it('a disabled Period Alarm never rings', () => {
    expect(ringsInWindow(...day(tue(0, 0)), SCHOOL_YEARS, withAlarms(periodAlarm({ enabled: false })))).toEqual([]);
  });
});

describe('ringsInWindow: the timer', () => {
  it('a running timer\'s end time comes back as a ring, on any day, with the timer sound', () => {
    const endsAt = new Date(2026, 9, 31, 10, 4, 30).getTime(); // a Saturday
    const settings = { ...withAlarms(), timerEndsAt: endsAt, timerSound: 'buzzer' };
    const rings = ringsInWindow(new Date(2026, 9, 31, 10, 0), new Date(2026, 9, 31, 10, 5), SCHOOL_YEARS, settings);
    expect(rings).toEqual([{ at: new Date(endsAt), source: 'timer', sound: 'buzzer', totalMs: null }]);
  });

  it('carries the length the timer was started with', () => {
    const endsAt = tue(10, 0).getTime();
    const settings = { ...withAlarms(), timerEndsAt: endsAt, timerTotalMs: 5 * 60 * 1000 };
    expect(ringsInWindow(tue(9, 0), tue(11, 0), SCHOOL_YEARS, settings)[0].totalMs).toBe(5 * 60 * 1000);
  });

  it('defaults to the beep, and is outside a window that ends at its end time', () => {
    const endsAt = tue(10, 0).getTime();
    expect(ringsInWindow(tue(9, 0), tue(11, 0), SCHOOL_YEARS, { ...withAlarms(), timerEndsAt: endsAt })[0].sound)
      .toBe('beep');
    expect(ringsInWindow(tue(9, 0), tue(10, 0), SCHOOL_YEARS, { ...withAlarms(), timerEndsAt: endsAt })).toEqual([]);
  });

  it('no timer running, no ring', () => {
    expect(ringsInWindow(tue(9, 0), tue(11, 0), SCHOOL_YEARS, { ...withAlarms(), timerEndsAt: null })).toEqual([]);
  });
});

describe('alarmsAfterRinging', () => {
  const once = clockAlarm({ id: 'once', repeat: 'once', date: '2026-10-27', time: '10:00' });
  const daily = clockAlarm({ id: 'daily', time: '10:00' });
  const ringsAtTen = (alarms) => ringsInWindow(tue(9, 59), tue(10, 1), SCHOOL_YEARS, withAlarms(...alarms));

  it('turns a "once" Clock Alarm off once it has rung, leaving the rest alone', () => {
    const alarms = [once, daily];
    const after = alarmsAfterRinging(alarms, ringsAtTen(alarms), { simulated: false });
    expect(after).toEqual([{ ...once, enabled: false }, daily]);
    expect(alarms[0].enabled).toBe(true); // not mutated
  });

  it('returns the same list when nothing needs turning off', () => {
    const alarms = [once, daily];
    expect(alarmsAfterRinging(alarms, [], { simulated: false })).toBe(alarms);
  });

  it('leaves a "once" Clock Alarm on when it rang in simulated time', () => {
    const alarms = [once];
    expect(alarmsAfterRinging(alarms, ringsAtTen(alarms), { simulated: true })).toBe(alarms);
  });
});

describe('ringsInWindow: half-open windows', () => {
  it('puts a ring exactly on a shared window edge in exactly one of the two windows', () => {
    const before = ringsInWindow(tue(9, 0), tue(9, 20), SCHOOL_YEARS, BELLS_ONLY);
    const after = ringsInWindow(tue(9, 20), tue(9, 22), SCHOOL_YEARS, BELLS_ONLY);
    expect(times(before)).toEqual([]);
    expect(times(after)).toEqual([tue(9, 20)]);
  });

  it('spans several days, skipping the weekend', () => {
    // Fri 10/30 08:00 to Mon 11/2 08:31.
    const rings = ringsInWindow(new Date(2026, 9, 30, 15, 0), new Date(2026, 10, 2, 8, 31), SCHOOL_YEARS, BELLS_ONLY);
    expect(times(rings)).toEqual([new Date(2026, 9, 30, 15, 10), new Date(2026, 10, 2, 8, 30)]);
  });

  it('is empty when the window is empty', () => {
    expect(ringsInWindow(tue(9, 20), tue(9, 20), SCHOOL_YEARS, BELLS_ONLY)).toEqual([]);
  });
});
