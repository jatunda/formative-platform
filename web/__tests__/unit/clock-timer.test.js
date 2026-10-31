import { describe, it, expect } from 'vitest';
import {
  PRESET_MINUTES, cancelTimer, durationLabel, parseDuration, parseMinutesSeconds, pauseTimer, rememberDuration,
  resumeTimer, settleTimer, startTimer, timerProgress, timerRingView, timerStatus,
} from '../../clock/timer.js';

const MIN = 60 * 1000;
const t0 = new Date(2026, 9, 27, 10, 0).getTime();

describe('the classroom timer', () => {
  it('a started timer is its end time, and its time left comes from the current time', () => {
    const timer = startTimer(5 * MIN, t0);
    expect(timer).toEqual({ timerEndsAt: t0 + 5 * MIN, timerPausedMs: null, timerTotalMs: 5 * MIN });
    expect(timerStatus(timer, t0 + 90 * 1000)).toEqual({ status: 'running', remainingMs: 210 * 1000 });
  });

  it('pausing keeps the time left, however long it stays paused; resuming ends that much later', () => {
    const paused = pauseTimer(startTimer(5 * MIN, t0), t0 + 2 * MIN);
    expect(paused).toEqual({ timerEndsAt: null, timerPausedMs: 3 * MIN, timerTotalMs: 5 * MIN });
    expect(timerStatus(paused, t0 + 60 * MIN)).toEqual({ status: 'paused', remainingMs: 3 * MIN });

    const resumed = resumeTimer(paused, t0 + 60 * MIN);
    expect(resumed).toEqual({ timerEndsAt: t0 + 63 * MIN, timerPausedMs: null, timerTotalMs: 5 * MIN });
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
    it('keeps the last 3 distinct custom durations, most recent first', () => {
      let recent = [];
      for (const minutes of [3, 7, 15, 7, 20]) recent = rememberDuration(recent, minutes * MIN);
      expect(recent).toEqual([20 * MIN, 7 * MIN, 15 * MIN]);
    });

    it('a custom duration that is already a preset is not kept again', () => {
      const recent = [7 * MIN];
      expect(rememberDuration(recent, 5 * MIN)).toBe(recent);
      expect(PRESET_MINUTES).toEqual([1, 2, 5, 10]);
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
    expect(none).toEqual({ timerEndsAt: null, timerPausedMs: null, timerTotalMs: null });
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
      expect(timerRingView(timer, t0 + 48 * SEC)).toEqual({
        status: 'running', left: '4:12', total: '5:00', progress: 252 / 300,
        label: 'Timer, 4:12 left of 5:00',
      });
      const paused = pauseTimer(timer, t0 + 175 * SEC);
      expect(timerRingView(paused, t0 + 10 * MIN)).toMatchObject({
        status: 'paused', left: '2:05', label: 'Timer, paused, 2:05 left of 5:00',
      });
      expect(timerRingView(cancelTimer(), t0, { rangTotalMs: 5 * MIN })).toEqual({
        status: 'done', left: '0:00', total: '5:00', progress: 0, label: "Timer, time's up, 0:00 left of 5:00",
      });
    });

    it('rounds the time left up, and leaves out the length when unknown', () => {
      const view = timerRingView({ timerEndsAt: t0 + MIN, timerPausedMs: null }, t0 + 100);
      expect(view).toMatchObject({ left: '1:00', total: null, label: 'Timer, 1:00 left' });
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
