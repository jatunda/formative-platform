import { describe, it, expect } from 'vitest';
import {
  MAX_NAME_LENGTH, PRESET_MINUTES, QUICK_PICKS, cancelTimer, cleanTimerName, createTabTimer, durationLabel, nameQuickPick, nameTimer,
  parseDuration, parseMinutesSeconds, pauseTimer, quickPickName, quickPickText, rememberQuickPick, resumeTimer, settleTimer,
  startTimer, fullTimerName, timerProgress, timerRingView, timerStatus,
} from '../../clock/timer.js';

const MIN = 60 * 1000;
const t0 = new Date(2026, 9, 27, 10, 0).getTime();

describe('the classroom timer', () => {
  it('a started timer is its end time, and its time left comes from the current time', () => {
    const timer = startTimer(5 * MIN, t0);
    expect(timer).toEqual({ timerEndsAt: t0 + 5 * MIN, timerPausedMs: null, timerTotalMs: 5 * MIN, timerName: null });
    expect(timerStatus(timer, t0 + 90 * 1000)).toEqual({ status: 'running', remainingMs: 210 * 1000 });
  });

  it('pausing keeps the time left, however long it stays paused; resuming ends that much later', () => {
    const paused = pauseTimer(startTimer(5 * MIN, t0), t0 + 2 * MIN);
    expect(paused).toEqual({ timerEndsAt: null, timerPausedMs: 3 * MIN, timerTotalMs: 5 * MIN, timerName: null });
    expect(timerStatus(paused, t0 + 60 * MIN)).toEqual({ status: 'paused', remainingMs: 3 * MIN });

    const resumed = resumeTimer(paused, t0 + 60 * MIN);
    expect(resumed).toEqual({ timerEndsAt: t0 + 63 * MIN, timerPausedMs: null, timerTotalMs: 5 * MIN, timerName: null });
    expect(timerStatus(resumed, t0 + 61 * MIN)).toEqual({ status: 'running', remainingMs: 2 * MIN });
  });

  it('pausing twice or resuming a running timer changes nothing', () => {
    const running = startTimer(5 * MIN, t0);
    const paused = pauseTimer(running, t0 + MIN);
    expect(pauseTimer(paused, t0 + 2 * MIN)).toBe(paused);
    expect(resumeTimer(running, t0 + 2 * MIN)).toBe(running);
  });

  it('a timer is over once its end has passed: at its end it still shows 0:00 left, so it can ring', () => {
    const timer = startTimer(MIN, t0);
    expect(settleTimer(timer, t0 + MIN)).toBe(timer);
    expect(timerStatus(timer, t0 + MIN)).toEqual({ status: 'running', remainingMs: 0 });
    expect(settleTimer(timer, t0 + MIN + 1)).toEqual(cancelTimer());
  });

  it('settling never touches a paused timer or no timer', () => {
    const paused = pauseTimer(startTimer(MIN, t0), t0);
    expect(settleTimer(paused, t0 + 99 * MIN)).toBe(paused);
    const none = cancelTimer();
    expect(settleTimer(none, t0)).toBe(none);
  });

  describe('typing a custom duration', () => {
    it.each([
      ['7', 7 * MIN],
      [' 7 ', 7 * MIN],
      ['1.5', 90 * 1000],
      ['7:30', 7 * MIN + 30 * 1000],
      ['0:45', 45 * 1000],
      ['90:00', 90 * MIN],
      ['1:05:00', 65 * MIN],
      ['24:00:00', 24 * 60 * MIN],
    ])('"%s" is %d ms', (text, ms) => {
      expect(parseDuration(text)).toEqual({ ok: true, ms });
    });

    it.each(['', '   ', 'abc', '5 min', '-3', '7:60', '1:60:00', '1:2:3:4', ':30', '7:', '1e3'])(
      '"%s" is not a duration and says how to type one', (text) => {
        expect(parseDuration(text)).toEqual({
          ok: false, error: 'Type minutes (like 7) or minutes:seconds (like 7:30).',
        });
      },
    );

    it.each(['0', '0:00', '0.001'])('"%s" is too short', (text) => {
      expect(parseDuration(text)).toEqual({ ok: false, error: 'The timer needs at least 1 second.' });
    });

    it('more than 24 hours is too long', () => {
      expect(parseDuration('24:00:01')).toEqual({ ok: false, error: 'The timer can run for 24 hours at most.' });
      expect(parseDuration('1441')).toEqual({ ok: false, error: 'The timer can run for 24 hours at most.' });
    });
  });

  describe('quick picks', () => {
    it('keeps the last 5 distinct custom durations, most recent first', () => {
      let recent = [];
      for (const minutes of [3, 7, 15, 7, 20, 25, 30, 45]) recent = rememberQuickPick(recent, minutes * MIN);
      expect(QUICK_PICKS).toBe(5);
      expect(recent).toEqual([{ ms: 45 * MIN }, { ms: 30 * MIN }, { ms: 25 * MIN }, { ms: 20 * MIN }, { ms: 7 * MIN }]);
    });

    it('a named preset takes one of the 5 slots', () => {
      const recent = [3, 7, 15, 20, 25].map((minutes) => ({ ms: minutes * MIN }));
      expect(nameQuickPick(recent, 5 * MIN, 'Warm-up')).toEqual([
        { ms: 5 * MIN, name: 'Warm-up' }, { ms: 3 * MIN }, { ms: 7 * MIN }, { ms: 15 * MIN }, { ms: 20 * MIN },
      ]);
    });

    it('a custom duration that is already a preset is not kept again', () => {
      const recent = [{ ms: 7 * MIN }];
      expect(rememberQuickPick(recent, 5 * MIN)).toBe(recent);
      expect(PRESET_MINUTES).toEqual([1, 2, 5, 10]);
    });

    it('a quick pick keeps its name when it is used again', () => {
      const recent = [{ ms: 3 * MIN }, { ms: 20 * MIN, name: 'Quiz' }];
      expect(rememberQuickPick(recent, 20 * MIN)).toEqual([{ ms: 20 * MIN, name: 'Quiz' }, { ms: 3 * MIN }]);
      expect(quickPickName(recent, 20 * MIN)).toBe('Quiz');
      expect(quickPickName(recent, 3 * MIN)).toBeNull();
      expect(quickPickName(recent, 4 * MIN)).toBeNull();
    });

    it('naming a duration saves the name on its quick pick, at the front', () => {
      const recent = [{ ms: 3 * MIN }, { ms: 20 * MIN }];
      expect(nameQuickPick(recent, 20 * MIN, 'Quiz')).toEqual([{ ms: 20 * MIN, name: 'Quiz' }, { ms: 3 * MIN }]);
      // A named preset is worth a quick pick: the name is what's new.
      expect(nameQuickPick(recent, 5 * MIN, 'Warm-up')).toEqual([{ ms: 5 * MIN, name: 'Warm-up' }, ...recent]);
      expect(nameQuickPick([1, 2, 3, 4, 6].map((m) => ({ ms: m * MIN })), 7 * MIN, 'Read')).toHaveLength(5);
    });

    it('clearing the name leaves an unnamed quick pick, or none for a preset', () => {
      const recent = [{ ms: 20 * MIN, name: 'Quiz' }, { ms: 5 * MIN, name: 'Warm-up' }];
      expect(nameQuickPick(recent, 20 * MIN, null)).toEqual([{ ms: 20 * MIN }, { ms: 5 * MIN, name: 'Warm-up' }]);
      expect(nameQuickPick(recent, 5 * MIN, null)).toEqual([{ ms: 20 * MIN, name: 'Quiz' }]);
    });

    it.each([
      [MIN, '1 min'],
      [90 * MIN, '90 min'],
      [7 * MIN + 30 * 1000, '7:30'],
      [45 * 1000, '0:45'],
      [65 * MIN + 5 * 1000, '1:05:05'],
    ])('%d ms is labelled "%s"', (ms, label) => {
      expect(durationLabel(ms)).toBe(label);
    });
  });

  it('cancelling leaves no timer', () => {
    const none = cancelTimer();
    expect(none).toEqual({ timerEndsAt: null, timerPausedMs: null, timerTotalMs: null, timerName: null });
    expect(timerStatus(none, t0)).toEqual({ status: 'idle', remainingMs: null });
    expect(timerStatus(cancelTimer(), t0)).toEqual(timerStatus(pauseTimer(none, t0), t0));
  });

  describe('the ring', () => {
    const SEC = 1000;
    it('shows the share of time left, from the whole length, through a pause and resume', () => {
      const timer = startTimer(5 * MIN, t0);
      expect(timerProgress(timer, t0)).toBe(1);
      expect(timerProgress(timer, t0 + 48 * SEC)).toBeCloseTo(252 / 300);
      const paused = pauseTimer(timer, t0 + 3 * MIN);
      expect(timerProgress(paused, t0 + 50 * MIN)).toBeCloseTo(0.4);
      expect(timerProgress(resumeTimer(paused, t0 + 50 * MIN), t0 + 51 * MIN)).toBeCloseTo(0.2);
      expect(timerProgress(timer, t0 + 6 * MIN)).toBe(0);
      expect(timerProgress(cancelTimer(), t0)).toBe(0);
    });

    it('is full when the length is unknown (a timer saved before the ring), through a pause and resume', () => {
      const old = { timerEndsAt: t0 + MIN, timerPausedMs: null };
      expect(timerProgress(old, t0 + 10 * SEC)).toBe(1);
      const paused = pauseTimer(old, t0 + 10 * SEC);
      expect(paused.timerTotalMs).toBeNull();
      expect(resumeTimer(paused, t0 + MIN).timerTotalMs).toBeNull();
      expect(timerProgress(resumeTimer(paused, t0 + MIN), t0 + MIN)).toBe(1);
    });

    it('says what the ring shows: running, paused, and rung', () => {
      const timer = startTimer(5 * MIN, t0);
      const byLength = { lead: '', tail: '5:00 timer' };
      expect(timerRingView(timer, t0 + 48 * SEC)).toEqual({
        status: 'running', remainingMs: 252 * SEC, left: '4:12', title: byLength, heading: byLength, name: null,
        fullName: '5:00 timer', progress: 252 / 300, label: '5:00 timer, running, 4:12 to go',
      });
      const paused = pauseTimer(timer, t0 + 175 * SEC);
      expect(timerRingView(paused, t0 + 10 * MIN)).toMatchObject({
        status: 'paused', left: '2:05', title: { lead: '', tail: '5:00 timer · paused' },
        heading: { lead: '', tail: '5:00 timer · paused' }, label: '5:00 timer, paused, 2:05 to go',
      });
      expect(timerRingView(cancelTimer(), t0, { totalMs: 5 * MIN, name: null })).toEqual({
        status: 'done', remainingMs: 0, left: '0:00', title: byLength, heading: byLength, name: null,
        fullName: '5:00 timer', progress: 0, label: "5:00 timer, time's up",
      });
    });

    it('rounds the time left up, and is just "Timer" when the length is unknown', () => {
      const view = timerRingView({ timerEndsAt: t0 + MIN, timerPausedMs: null }, t0 + 100);
      expect(view).toMatchObject({
        remainingMs: MIN, left: '1:00', fullName: 'Timer', title: { lead: '', tail: 'Timer' },
        label: 'Timer, running, 1:00 to go',
      });
      expect(timerRingView(cancelTimer(), t0)).toMatchObject({ fullName: 'Timer', label: "Timer, time's up" });
    });
  });

  describe('a name', () => {
    it('comes before the length wherever the timer is named', () => {
      expect(fullTimerName(20 * MIN, 'Quiz')).toBe('Quiz · 20:00 timer');
      expect(fullTimerName(20 * MIN, null)).toBe('20:00 timer');
      expect(fullTimerName(null, 'Quiz')).toBe('Quiz');
      expect(fullTimerName(null)).toBe('Timer');
    });

    it('is trimmed and capped; an empty one is no name', () => {
      expect(cleanTimerName('  Quiz  ')).toBe('Quiz');
      expect(cleanTimerName('   ')).toBeNull();
      expect(cleanTimerName('x'.repeat(50))).toBe('x'.repeat(MAX_NAME_LENGTH));
      expect(MAX_NAME_LENGTH).toBe(40);
    });

    it('starts with the timer, is kept through a pause and resume, and goes when it is cancelled', () => {
      const timer = startTimer(5 * MIN, t0, 'Quiz');
      expect(timer.timerName).toBe('Quiz');
      const paused = pauseTimer(timer, t0 + MIN);
      expect(paused.timerName).toBe('Quiz');
      expect(resumeTimer(paused, t0 + 2 * MIN).timerName).toBe('Quiz');
      expect(cancelTimer().timerName).toBeNull();
    });

    it('naming the running timer names it and its quick pick', () => {
      const settings = { ...startTimer(20 * MIN, t0), quickPicks: [{ ms: 3 * MIN }] };
      expect(nameTimer(settings, ' Quiz ')).toEqual({
        timerName: 'Quiz', quickPicks: [{ ms: 20 * MIN, name: 'Quiz' }, { ms: 3 * MIN }],
      });
      // A timer of unknown length has no quick pick to name.
      const old = { timerEndsAt: t0 + MIN, timerPausedMs: null, quickPicks: [] };
      expect(nameTimer(old, 'Quiz')).toEqual({ timerName: 'Quiz' });
    });

    it('shows on the ring with its length: "Quiz · 5:00" (and "· paused"), the label says it all', () => {
      const timer = startTimer(5 * MIN, t0, 'Quiz');
      expect(timerRingView(timer, t0)).toMatchObject({
        title: { lead: 'Quiz', tail: ' · 5:00' }, name: 'Quiz', fullName: 'Quiz · 5:00 timer',
        label: 'Quiz · 5:00 timer, running, 5:00 to go',
      });
      expect(timerRingView(pauseTimer(timer, t0), t0)).toMatchObject({
        status: 'paused', title: { lead: 'Quiz', tail: ' · 5:00 · paused' },
      });
      expect(timerRingView(cancelTimer(), t0, { totalMs: 5 * MIN, name: 'Quiz' })).toMatchObject({
        title: { lead: 'Quiz', tail: ' · 5:00' }, label: "Quiz · 5:00 timer, time's up",
      });
      // With its length unknown, the name is all there is.
      expect(timerRingView({ timerEndsAt: t0 + MIN, timerPausedMs: null, timerName: 'Quiz' }, t0).title)
        .toEqual({ lead: 'Quiz', tail: '' });
    });

    it('heads the mini player in full, the name first: "Quiz · 5:00 timer" (and "· paused")', () => {
      const timer = startTimer(5 * MIN, t0, 'Quiz');
      expect(timerRingView(timer, t0).heading).toEqual({ lead: 'Quiz', tail: ' · 5:00 timer' });
      expect(timerRingView(pauseTimer(timer, t0), t0).heading).toEqual({ lead: 'Quiz', tail: ' · 5:00 timer · paused' });
    });

    it('lists a quick pick by its length, then its name', () => {
      expect(quickPickText({ ms: 20 * MIN, name: 'Quiz' })).toBe('20:00 · Quiz');
      expect(quickPickText({ ms: 7.5 * MIN })).toBe('7:30');
    });
  });

  describe('the picker\'s minutes and seconds', () => {
    it.each([
      ['12', '00', 12 * MIN],
      ['7', '30', 7.5 * MIN],
      ['', '45', 45 * 1000],
      ['90', '5', 90 * MIN + 5000],
      ['1.5', '', 1.5 * MIN],
      ['7:30', '', 7.5 * MIN],
    ])('%s : %s is a timer of %d ms', (minutes, seconds, ms) => {
      expect(parseMinutesSeconds(minutes, seconds)).toEqual({ ok: true, ms });
    });

    it.each([
      ['', '', 'Type the minutes (and seconds) to time.'],
      ['5', '60', 'Seconds go from 0 to 59.'],
      ['5', 'x', 'Seconds go from 0 to 59.'],
      ['1.5', '30', 'Use whole minutes with seconds, like 7 : 30.'],
      ['soon', '', 'Type minutes (like 7) or minutes:seconds (like 7:30).'],
      ['0', '0', 'The timer needs at least 1 second.'],
      ['1441', '00', 'The timer can run for 24 hours at most.'],
    ])('%s : %s is refused', (minutes, seconds, error) => {
      expect(parseMinutesSeconds(minutes, seconds)).toEqual({ ok: false, error });
    });
  });
});

describe("the tab's timer", () => {
  const saved = { division: 'HS', volume: 0.5, ...startTimer(5 * MIN, t0, 'Quiz') };

  it('in real time is the saved timer: loaded, saved as it is, and cleared once its end has passed', () => {
    const tab = createTabTimer(saved, { simulated: false });
    expect(tab.settings).toBe(saved);
    const paused = { ...saved, ...pauseTimer(saved, t0 + MIN) };
    expect(tab.toSave(paused)).toBe(paused);
    expect(tab.settle(saved, t0 + 5 * MIN)).toBe(saved);
    expect(tab.settle(saved, t0 + 5 * MIN + 1)).toEqual({ division: 'HS', volume: 0.5, ...cancelTimer() });
  });

  it("in simulated time belongs to this tab: it starts with none, and every save keeps the real one as loaded", () => {
    const tab = createTabTimer(saved, { simulated: true });
    expect(tab.settings).toEqual({ division: 'HS', volume: 0.5, ...cancelTimer() });
    const own = { ...tab.settings, ...startTimer(MIN, t0 + 60 * MIN), volume: 1 };
    expect(tab.toSave(own)).toEqual({ ...saved, volume: 1 });
    // Its own timer settles as any does, and the saved one is still kept.
    const settled = tab.settle(own, t0 + 62 * MIN);
    expect(settled).toEqual({ ...own, ...cancelTimer() });
    expect(tab.toSave(settled)).toEqual({ ...saved, volume: 1 });
  });
});
