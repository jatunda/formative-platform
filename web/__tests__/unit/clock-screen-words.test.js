import { describe, it, expect } from 'vitest';
import { describeMoment } from '../../clock/clock-model.js';
import { screenWords } from '../../clock/screen-words.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';
import { startTimer, timerRingView } from '../../clock/timer.js';

// Tue 2026-10-27 is an All Day: Period 3 10:30–11:15, Lunch 12:55–13:30, Period 7 ends 15:10.
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);
const SETTINGS = { use24Hour: false, showSeconds: true, periodLabels: {}, showPeriodEnd: false };

/** A 5:00 Timer started 1:00 before `now`, as it shows. */
const timerAt = (now) => timerRingView(startTimer(5 * 60 * 1000, now.getTime() - 60 * 1000), now.getTime());

/**
 * The screen's words at `now`, for HS with the given settings.
 * @param {Date} now
 * @param {{ settings?: object, timer?: object | null, readouts?: string[] | null, division?: string | null }} [state]
 */
function wordsAt(now, { settings = {}, timer = null, readouts = ['countdown'], division = 'HS' } = {}) {
  const moment = division ? describeMoment(now, SCHOOL_YEARS, { division }) : null;
  return screenWords({ now, moment, settings: { ...SETTINGS, ...settings }, timer, readouts });
}

const captions = (words) => words.readouts.map((parts) => parts.caption);

describe('the stage', () => {
  it('names the School Day and the current Period with its Period Label, apart', () => {
    expect(wordsAt(tue(10, 39), { settings: { periodLabels: { 'Period 3': 'AP CSA' } } }).stage).toEqual({
      day: { dayLabel: 'All Day', date: 'Tue, Oct 27' },
      heading: { title: 'Period 3', tag: 'AP CSA', hidden: false },
      under: { kind: 'line', text: '', namesNextDay: false },
    });
  });

  it('says when the current Segment ends with "Show period end time" on, in the time format', () => {
    expect(wordsAt(tue(10, 39), { settings: { showPeriodEnd: true } }).stage.under)
      .toEqual({ kind: 'next', label: 'Ends', name: '', at: '11:15 AM' });
    expect(wordsAt(tue(14, 30), { settings: { showPeriodEnd: true, use24Hour: true } }).stage.under.at).toBe('15:10');
    // A Break too.
    expect(wordsAt(tue(13, 0), { settings: { showPeriodEnd: true } }).stage.under.at).toBe('1:30 PM');
  });

  it('says what is up next in a Passing Period and before school, whatever the end-time setting', () => {
    const passing = wordsAt(tue(10, 28), { settings: { showPeriodEnd: true, periodLabels: { 'Period 3': 'AP CSA' } } });
    expect(passing.stage.heading.title).toBe('Passing Period');
    expect(passing.stage.under).toEqual({ kind: 'next', label: 'Up next', name: 'Period 3 · AP CSA', at: '10:30 AM' });
    const before = wordsAt(tue(7, 0), { settings: { showPeriodEnd: true } }).stage;
    expect(before.heading.title).toBe('Before school');
    expect(before.under).toMatchObject({ kind: 'next', name: 'Period 1' });
  });

  it('names the Next School Day after school, as a line that can step aside for the bar', () => {
    expect(wordsAt(tue(16, 0), { settings: { showPeriodEnd: true } }).stage).toMatchObject({
      day: { dayLabel: 'All Day' },
      heading: { title: 'After school' },
      under: { kind: 'line', text: 'Next: Wed, Oct 28 · Even Day', namesNextDay: true },
    });
  });

  it('gives a day off just the date, since the heading names the day', () => {
    const { stage } = wordsAt(new Date(2026, 9, 31, 10, 0));
    expect(stage.day).toEqual({ dayLabel: '', date: 'Sat, Oct 31' });
    expect(stage.heading.title).toBe('Weekend');
    expect(stage.under).toMatchObject({ kind: 'line', namesNextDay: true });
    expect(stage.under.text).toMatch(/^Back Mon, Nov 2 · /);
  });

  it("names a date it doesn't know in full", () => {
    const { stage } = wordsAt(new Date(2030, 0, 1, 9, 0));
    expect(stage.day).toEqual({ dayLabel: '', date: 'Tue, Jan 1, 2030' });
    expect(stage.heading.title).toBe('Tue, Jan 1, 2030');
    expect(stage.under.text).toBe('No school calendar for this date yet');
  });

  it('before a Division is chosen: just the date, and a heading only screen readers hear', () => {
    expect(wordsAt(tue(10, 39), { division: null, readouts: null }).stage).toEqual({
      day: { dayLabel: '', date: 'Tue, Oct 27' },
      heading: { title: 'School Clock', tag: '', hidden: true },
      under: { kind: 'none' },
    });
  });
});

describe('the Readouts', () => {
  it("are the layout's, in order", () => {
    const words = wordsAt(tue(10, 32), { readouts: ['countdown', 'countup', 'clock'] });
    expect(words.readouts.map((parts) => parts.amount)).toEqual(['43:00', '2:00', '10:32:00 AM']);
    expect(captions(words)).toEqual(['until end', 'since start', '']);
  });

  it('follow the seconds and 24-hour settings', () => {
    const words = wordsAt(tue(13, 45), { settings: { showSeconds: false, use24Hour: true }, readouts: ['countdown', 'clock'] });
    expect(words.readouts.map((parts) => parts.amount)).toEqual(['35 min', '13:45']);
  });

  it('are just the time with no layout to show, or before a Division is chosen', () => {
    expect(wordsAt(tue(10, 32), { readouts: null }).readouts.map((parts) => parts.amount)).toEqual(['10:32:00 AM']);
    expect(wordsAt(tue(10, 32), { division: null }).readouts.map((parts) => parts.amount)).toEqual(['10:32:00 AM']);
  });
});

describe('the Timer caption: beside the ring, the big Readout names its Segment', () => {
  const labels = { 'Period 3': 'AP CSA' };

  it("names the Segment, with its Period Label, on the big Readout's time left", () => {
    const now = tue(10, 32);
    const words = wordsAt(now, { settings: { periodLabels: labels }, timer: timerAt(now), readouts: ['countdown', 'countdown'] });
    // The small one keeps its short caption.
    expect(captions(words)).toEqual(['until end of Period 3 · AP CSA', 'until end']);
  });

  it('leaves the caption alone with no Timer', () => {
    expect(captions(wordsAt(tue(10, 32), { settings: { periodLabels: labels } }))).toEqual(['until end']);
  });

  it('leaves any other big Readout alone', () => {
    const now = tue(10, 32);
    expect(captions(wordsAt(now, { timer: timerAt(now), readouts: ['countup', 'countdown'] })))
      .toEqual(['since start', 'until end']);
    // A Passing Period's countdown already names the Segment up next.
    const passing = tue(10, 28);
    expect(captions(wordsAt(passing, { timer: timerAt(passing) }))).toEqual(['until Period 3']);
  });
});

describe('the mini player', () => {
  it('heads with the heading in one line, the big Readout and its mode, and how far through the Segment', () => {
    const { mini } = wordsAt(tue(10, 39), { settings: { periodLabels: { 'Period 3': 'AP CSA' } }, readouts: ['countup', 'clock'] });
    expect(mini).toMatchObject({
      timer: false,
      head: { lead: 'Period 3 · AP CSA', tail: '' },
      mode: 'countup',
      foot: { kind: 'progress', label: 'Period 3 progress', percent: 20, text: 'ends 11:15 AM' },
    });
    expect(mini.readout.amount).toBe('9:00');
  });

  it('says what is up next in a Passing Period, and nothing in Off-Hours', () => {
    expect(wordsAt(tue(10, 28)).mini).toMatchObject({ head: { lead: 'Passing Period' }, foot: { kind: 'next', name: 'Period 3' } });
    expect(wordsAt(tue(16, 0)).mini.foot).toEqual({ kind: 'none' });
  });

  it('has no mode to cycle and no head before a Division is chosen', () => {
    expect(wordsAt(tue(10, 39), { division: null, readouts: null }).mini).toMatchObject({
      head: { lead: '', tail: '' }, mode: null, foot: { kind: 'none' },
    });
  });

  it("under a Timer: the Timer's heading, time left and bar, and the Segment's time left", () => {
    const now = tue(10, 32);
    const { mini } = wordsAt(now, { settings: { periodLabels: { 'Period 3': 'AP CSA' } }, timer: timerAt(now) });
    expect(mini).toMatchObject({
      timer: true,
      head: { lead: '', tail: '5:00 timer' },
      mode: null,
      // The foot names the Period without its Period Label.
      foot: { kind: 'progress', label: 'Timer progress', percent: 80, text: '43:00 until end of Period 3' },
    });
    expect(mini.readout).toMatchObject({ amount: '4:00', caption: 'left' });
  });
});

describe('the Simulated time banner', () => {
  it('gives the date and the time, in the time format', () => {
    expect(wordsAt(tue(13, 4, 9)).banner).toBe('Simulated time · Tue, Oct 27, 1:04:09 PM · this tab only');
    expect(wordsAt(tue(13, 4, 9), { settings: { use24Hour: true, showSeconds: false } }).banner)
      .toBe('Simulated time · Tue, Oct 27, 13:04 · this tab only');
  });
});
