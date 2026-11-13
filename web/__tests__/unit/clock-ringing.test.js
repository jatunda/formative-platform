import { describe, it, expect, beforeEach } from 'vitest';
import { BELL_AUTO_DISMISS_SECONDS, createRinging } from '../../clock/ringing.js';
import { DEFAULT_SETTINGS } from '../../clock/clock-storage.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';
import { TEST_RING_WORDS } from '../../clock/ring-words.js';
import { startTimer } from '../../clock/timer.js';

// Tue 2026-10-27 is an All Day: Period 3 runs 10:30–11:15.
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);
const SEC = 1000;
const settingsWith = (change = {}) => ({
  ...DEFAULT_SETTINGS, division: 'HS', bells: { on: true, sound: 'clockTower' }, alarms: [], ...change,
});
const lunchDuty = {
  id: 'a1', kind: 'clock', enabled: true, label: 'Lunch duty', time: '10:45', repeat: 'once', date: '2026-10-27',
  sound: 'chime', bellSchedules: null,
};

let real;
let ringing;
const open = ({ speed = 1 } = {}) => {
  ringing = createRinging({ realNow: () => real, speed, schoolYears: SCHOOL_YEARS });
};
beforeEach(() => {
  real = 1_000_000;
  open();
});

describe('ringing: the sound window', () => {
  it('hands over the coming Rings on the audio clock, each with a key that stays the same', () => {
    const sounds = ringing.soundWindow(tue(10, 29), settingsWith(), 100);
    expect(sounds).toEqual([{ key: `${tue(10, 30).getTime()}|bell|`, at: 160, sound: 'clockTower', repeat: true, seconds: 5 }]);
    expect(ringing.soundWindow(tue(10, 29), settingsWith(), 100)[0].key).toBe(sounds[0].key);
  });

  it('keeps a Ring that just started, and leaves out what is more than 5 minutes off', () => {
    const at = (now) => ringing.soundWindow(now, settingsWith(), 0).map((s) => s.at);
    expect(at(new Date(tue(10, 30).getTime() + 500))).toEqual([-0.5]);
    expect(at(tue(10, 30, 2))).toEqual([]);
    expect(at(tue(10, 19, 59))).toEqual([]);
  });

  it('maps clock time onto the audio clock at the clock speed', () => {
    open({ speed: 60 });
    // Five and ten clock minutes ahead are five and ten real seconds at &speed=60.
    expect(ringing.soundWindow(tue(10, 20), settingsWith(), 0).map((s) => s.at).slice(0, 2)).toEqual([5, 10]);
  });

  it('lets an Alarm, the Timer and a kept Bell ring until dismissed: no end of their own', () => {
    const settings = settingsWith({
      bells: { on: true, sound: 'chime', untilDismissed: true }, alarms: [{ ...lunchDuty, time: '10:31' }],
      ...startTimer(4 * 60 * SEC, tue(10, 28).getTime()),
    });
    const sounds = ringing.soundWindow(tue(10, 28), settings, 0);
    expect(sounds.map((s) => s.key.split('|')[1])).toEqual(['bell', 'clockAlarm', 'timer']);
    expect(sounds.every((s) => s.repeat && !('seconds' in s))).toBe(true);
    expect(sounds[1].key).toBe(`${tue(10, 31).getTime()}|clockAlarm|a1`);
  });

  it('hands over nothing while the player is not playing or before a Division is chosen', () => {
    expect(ringing.soundWindow(tue(10, 29), settingsWith(), null)).toEqual([]);
    expect(ringing.soundWindow(tue(10, 29), settingsWith({ division: null }), 0)).toEqual([]);
  });

  it('is due again halfway through the window, after a stall, and before it was ever handed over', () => {
    const settings = settingsWith();
    expect(ringing.advance(tue(9, 0), tue(9, 0, 1), settings).soundWindowDue).toBe(true);
    // Rolling forward even while the player waits, so it isn't redone every tick.
    ringing.soundWindow(tue(9, 0), settings, null);
    expect(ringing.advance(tue(9, 0), tue(9, 0, 1), settings).soundWindowDue).toBe(false);
    expect(ringing.advance(tue(9, 2, 29), tue(9, 2, 30), settings).soundWindowDue).toBe(true);
    // A tick 6 s after the last one: the tab stalled.
    expect(ringing.advance(tue(9, 0), tue(9, 0, 6), settings).soundWindowDue).toBe(true);
  });
});

describe('ringing: what rings on a tick', () => {
  it('starts a Ring that came due, with its words, and stops a Bell when its sound ends', () => {
    const { rang } = ringing.advance(tue(10, 29, 59), tue(10, 30), settingsWith());
    expect(rang).toEqual([]);
    ringing.advance(tue(10, 30), tue(10, 30, 1), settingsWith());
    expect(ringing.current().words).toEqual({ kind: 'Bell', title: 'Period 3 starts', detail: '' });
    // Clock tower's one pass lasts 7.4 s, counted from when the Bell came due (1 s ago).
    real += 6.3 * SEC;
    ringing.advance(tue(10, 30, 1), tue(10, 30, 2), settingsWith());
    expect(ringing.current()).not.toBeNull();
    real += 0.2 * SEC;
    ringing.advance(tue(10, 30, 2), tue(10, 30, 3), settingsWith());
    expect(ringing.current()).toBeNull();
  });

  it('counts a late Bell from when it came due in real time, at the clock speed', () => {
    open({ speed: 60 });
    // Due 60 clock seconds (1 real second) before this tick.
    ringing.advance(tue(10, 29, 30), tue(10, 31), settingsWith());
    expect(ringing.current()).not.toBeNull();
    real += 6.5 * SEC;
    ringing.advance(tue(10, 31), tue(10, 31, 1), settingsWith());
    expect(ringing.current()).toBeNull();
  });

  it('rings an Alarm for a minute unless dismissed', () => {
    const settings = settingsWith({ bells: { on: false, sound: 'chime' }, alarms: [lunchDuty] });
    const { rang } = ringing.advance(tue(10, 45), tue(10, 45, 1), settings);
    expect(rang.map((r) => r.source)).toEqual(['clockAlarm']);
    expect(ringing.current().words.title).toBe('Lunch duty');
    real += 59.9 * SEC;
    ringing.advance(tue(10, 46), tue(10, 46, 1), settings);
    expect(ringing.current().words.title).toBe('Lunch duty');
    ringing.dismiss();
    expect(ringing.current()).toBeNull();
  });

  it('keeps a kept Bell ringing for a minute, like an Alarm', () => {
    const settings = settingsWith({ bells: { on: true, sound: 'chime', untilDismissed: true } });
    ringing.advance(tue(10, 30), tue(10, 30, 1), settings);
    real += 30 * SEC;
    ringing.advance(tue(10, 30, 1), tue(10, 30, 2), settings);
    expect(ringing.current()).not.toBeNull();
  });

  it("doesn't ring late what was missed while the tab slept, but still reports it", () => {
    const settings = settingsWith({ alarms: [lunchDuty] });
    const { rang, soundWindowDue } = ringing.advance(tue(10, 0), tue(10, 50), settings);
    expect(rang.map((r) => r.source)).toEqual(['bell', 'bell', 'bell', 'clockAlarm']);
    expect(soundWindowDue).toBe(true);
    expect(ringing.current()).toBeNull();
  });

  it('rings nothing before a Division is chosen', () => {
    expect(ringing.advance(tue(10, 30), tue(10, 30, 1), settingsWith({ division: null })).rang).toEqual([]);
    expect(ringing.current()).toBeNull();
  });

  it('shows the newest Ring, and goes back to one still ringing when it stops', () => {
    const settings = settingsWith({ alarms: [{ ...lunchDuty, time: '10:30' }] });
    ringing.advance(tue(10, 30), tue(10, 30, 1), settings);
    // The Bell and the Alarm both came due; the Alarm sorts after it.
    expect(ringing.current().words.kind).toBe('Clock Alarm');
    ringing.advance(tue(10, 30, 1), tue(10, 30, 2), settings);
    const alarm = ringing.current();
    real += 10 * SEC;
    ringing.advance(tue(10, 30, 2), tue(10, 30, 3), settings);
    expect(ringing.current()).toBe(alarm);
  });
});

describe('ringing: the test Ring', () => {
  it('rings a Bell now, as Bells ring under these settings', () => {
    const play = ringing.testRing({ on: true, sound: 'clockTower' });
    expect(play).toEqual({ sound: 'clockTower', repeat: true, seconds: BELL_AUTO_DISMISS_SECONDS });
    expect(ringing.current().words).toBe(TEST_RING_WORDS);
    real += 7.5 * SEC;
    ringing.advance(tue(9, 0), tue(9, 0, 1), settingsWith());
    expect(ringing.current()).toBeNull();
  });

  it('a kept Bell rings until dismissed, and each test is a Ring of its own', () => {
    expect(ringing.testRing({ on: true, sound: 'chime', untilDismissed: true })).toEqual({ sound: 'chime', repeat: true });
    const first = ringing.current();
    ringing.testRing({ on: true, sound: 'chime', untilDismissed: true });
    expect(ringing.current()).not.toBe(first);
    expect(BELL_AUTO_DISMISS_SECONDS).toBe(5);
  });
});

describe('ringing: the Timer', () => {
  const timer = startTimer(5 * 60 * SEC, tue(10, 0).getTime(), 'Quiz');

  it('shows while it runs, and not with none', () => {
    expect(ringing.shownTimer(settingsWith(timer), tue(10, 1)).status).toBe('running');
    expect(ringing.shownTimer(settingsWith(), tue(10, 1))).toBeNull();
  });

  it('once rung, shows 0:00 of the Timer that rang until its Ring stops', () => {
    const settings = settingsWith(timer);
    ringing.advance(tue(10, 5), tue(10, 5, 1), settings);
    expect(ringing.current().words).toEqual({ kind: 'Timer', title: 'Time is up', detail: 'Quiz · 5:00 timer' });
    // The page has cleared the Timer by now; the Ring remembers it.
    const shown = ringing.shownTimer(settingsWith(), tue(10, 5, 1));
    expect(shown).toMatchObject({ status: 'done', left: '0:00', fullName: 'Quiz · 5:00 timer' });
    ringing.dismiss();
    expect(ringing.shownTimer(settingsWith(), tue(10, 5, 2))).toBeNull();
  });

  it('stops showing once only other Rings are left', () => {
    const kept = { on: true, sound: 'chime', untilDismissed: true };
    ringing.advance(tue(10, 5), tue(10, 5, 1), settingsWith({ ...timer, bells: kept }));
    // 30 s on, a Bell comes due (Period 2 ends at 10:10); both ring their minute.
    real += 30 * SEC;
    ringing.advance(tue(10, 10), tue(10, 10, 1), settingsWith({ bells: kept }));
    expect(ringing.shownTimer(settingsWith(), tue(10, 10, 1))).not.toBeNull();
    real += 31 * SEC;
    ringing.advance(tue(10, 10, 1), tue(10, 10, 2), settingsWith({ bells: kept }));
    expect(ringing.current().words.kind).toBe('Bell');
    expect(ringing.shownTimer(settingsWith(), tue(10, 10, 2))).toBeNull();
  });
});
