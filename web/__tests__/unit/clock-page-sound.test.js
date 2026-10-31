import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { field, setValue } from '../helpers/clock-dom.js';

/** A real clock the test moves by hand; the page's ticks come from fake timers. */
function fakeRealClock(date) {
  let t = date.getTime();
  return {
    now: () => t,
    advance: (ms) => { t += ms; vi.advanceTimersByTime(ms); },
    /** Time passes with no timers firing, like a sleeping or throttled tab. */
    jump: (ms) => { t += ms; },
  };
}

const SEC = 1000;
const mount = () => document.getElementById('clockApp');
const pageText = () => mount().textContent.replace(/\s+/g, ' ');
const button = (name) => [...mount().querySelectorAll('button')]
  .find((b) => (b.getAttribute('aria-label') ?? b.textContent.trim()) === name && !b.closest('[hidden]'));
/** Open the Settings drawer from the top bar, where the sound settings are. */
const openSettings = () => button('Settings').click();
const checkbox = (name) => field(name);
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));
const ringing = () => mount().querySelector('[role="alertdialog"]');

// Tue 2026-10-27 is an All Day: Period 3 ends 11:15, Period 4 runs 11:20–12:05.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);

describe('School Clock sound', () => {
  let app;
  let real;
  let player;
  let storage;

  /** Open the page on an HS device with `settings` saved, at `when` (real time). */
  function open({ when = at(11, 12), settings = {}, sound = {}, ...options } = {}) {
    real = fakeRealClock(when);
    player = createFakeSoundPlayer(sound);
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', ...settings }) });
    app = initClockApp({
      realNow: real.now, storage, tabStorage: createFakeStorage(), soundPlayer: player,
      prefersReducedMotion: () => false, ...options,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  describe('the "turn sound on" control', () => {
    it('shows after load while sound is suspended, and one click turns sound on', async () => {
      open();
      expect(button('Turn sound on')).toBeDefined();

      button('Turn sound on').click();
      await Promise.resolve();

      expect(player.state()).toBe('running');
      expect(button('Turn sound on')).toBeUndefined();
    });

    it('shows again whenever the browser suspends sound', () => {
      open({ sound: { state: 'running' } });
      expect(button('Turn sound on')).toBeUndefined();
      player.setState('suspended');
      expect(button('Turn sound on')).toBeDefined();
    });

    it('says plainly when the browser has no sound at all', () => {
      open({ sound: { state: 'unavailable' } });
      expect(button('Turn sound on')).toBeUndefined();
      expect(pageText()).toContain("Sound isn't available in this browser");
    });

    it('says the tab must stay open for sounds', () => {
      open();
      expect(pageText()).toContain('Keep this tab open for Bells and Alarms to play. Minimised is fine.');
    });
  });

  describe('scheduling ahead on the audio clock', () => {
    it('schedules the coming Bells once sound is on, at their times on the audio clock', async () => {
      open({ sound: { time: 100 } });
      expect(player.scheduled).toEqual([]);

      button('Turn sound on').click();
      await Promise.resolve();

      // 11:15 is 3 minutes away: 180 s after the audio clock's 100.
      expect(player.scheduled).toEqual([
        expect.objectContaining({ at: 280, sound: 'schoolBell', repeat: false }),
      ]);
    });

    it('rolls the window forward as time passes, each ring keeping its key and audio time', () => {
      open({ sound: { state: 'running', time: 100 } });
      expect(player.scheduled).toEqual([expect.objectContaining({ at: 280 })]);
      const bellKey = player.scheduled[0].key;

      // Six minutes pass; the audio clock keeps pace with real time.
      for (let i = 0; i < 6 * 60; i += 1) {
        player.time += 1;
        real.advance(SEC);
      }

      expect(player.schedules.length).toBeGreaterThan(2);
      // Wherever the 11:15 Bell shows up it's the same ring at the same audio
      // time, so the player keeps the one it has instead of adding a second.
      const seen = player.schedules.flat().filter((r) => r.key === bellKey);
      expect(seen.length).toBeGreaterThan(1);
      expect(new Set(seen.map((r) => r.at))).toEqual(new Set([280]));
      // 11:20 (Period 4 starts) has come into the window, 5 minutes after 11:15.
      expect(player.scheduled.map((r) => r.at)).toContain(580);
    });

    it('rings Alarms until dismissed, in the Alarm\'s own sound', () => {
      open({
        sound: { state: 'running', time: 0 },
        settings: {
          bells: { on: false, sound: 'schoolBell' },
          alarms: [{ id: 'a', kind: 'clock', time: '11:14', repeat: 'everySchoolDay', enabled: true, sound: 'chime', bellSchedules: null }],
        },
      });
      expect(player.scheduled).toEqual([expect.objectContaining({ at: 120, sound: 'chime', repeat: true })]);
    });

    it('the Bells control in the top bar is pressed while Bells are on, and toggles them, saved', () => {
      open({ sound: { state: 'running' } });
      expect(button('Bells').getAttribute('aria-pressed')).toBe('true');
      button('Bells').click();
      expect(button('Bells').getAttribute('aria-pressed')).toBe('false');
      expect(checkbox('Bells').checked).toBe(false);
      expect(player.scheduled).toEqual([]);
      expect(saved(storage).bells.on).toBe(false);
      button('Bells').click();
      expect(player.scheduled).toHaveLength(1);
    });

    it('reschedules when the Bells toggle changes, and the toggle is saved', () => {
      open({ sound: { state: 'running' } });
      expect(player.scheduled).toHaveLength(1);

      checkbox('Bells').click();

      expect(player.scheduled).toEqual([]);
      expect(saved(storage).bells.on).toBe(false);
      expect(button('Bells').getAttribute('aria-pressed')).toBe('false');
      checkbox('Bells').click();
      expect(player.scheduled).toHaveLength(1);
    });

    it('reschedules when the tab becomes visible again', () => {
      open({ sound: { state: 'running', time: 100 } });
      const before = player.schedules.length;
      player.time = 150;

      document.dispatchEvent(new Event('visibilitychange'));

      expect(player.schedules.length).toBe(before + 1);
      expect(player.scheduled[0].at).toBe(330);
    });

    it('maps simulated time onto the audio clock using the speed factor', () => {
      open({
        when: new Date(2026, 9, 28, 20, 0),
        search: '?at=2026-10-27T11:12&speed=60',
        sound: { state: 'running', time: 100 },
      });
      // 3 simulated minutes at 60x is 3 real seconds.
      expect(player.scheduled[0].at).toBe(103);
      expect(player.scheduled.length).toBeGreaterThan(1);
    });

    it('schedules nothing before a Division is chosen', () => {
      open({ sound: { state: 'running' }, settings: { division: null } });
      expect(player.scheduled).toEqual([]);
    });
  });

  describe('ringing', () => {
    it('flashes the screen and says what rang when a Bell comes due, and stops after about 3 s', () => {
      open({ when: at(11, 14, 59) });
      expect(mount().classList.contains('clock-ringing')).toBe(false);
      expect(ringing().hidden).toBe(true);

      real.advance(2 * SEC);

      expect(mount().classList.contains('clock-ringing--flash')).toBe(true);
      expect(ringing().hidden).toBe(false);
      expect(ringing().textContent).toContain('Period 3 ends');

      real.advance(3 * SEC);
      expect(mount().classList.contains('clock-ringing')).toBe(false);
      expect(ringing().hidden).toBe(true);
    });

    it('rings an Alarm until Dismiss is pressed, which stops its sound', () => {
      open({
        when: at(11, 13, 59),
        settings: { alarms: [{ id: 'a', label: 'Wrap up', kind: 'clock', time: '11:14', repeat: 'everySchoolDay', enabled: true, sound: 'chime', bellSchedules: null }] },
      });
      for (let i = 0; i < 30; i += 1) real.advance(SEC);
      expect(mount().classList.contains('clock-ringing')).toBe(true);
      expect(ringing().textContent).toContain('Wrap up');

      button('Dismiss').click();

      expect(player.dismissals).toBe(1);
      expect(mount().classList.contains('clock-ringing')).toBe(false);
      expect(ringing().hidden).toBe(true);
    });

    it('stops ringing an Alarm on its own after 60 s', () => {
      open({
        when: at(11, 13, 59),
        settings: { bells: { on: false, sound: 'schoolBell' }, alarms: [{ id: 'a', kind: 'clock', time: '11:14', repeat: 'everySchoolDay', enabled: true, sound: 'chime', bellSchedules: null }] },
      });
      real.advance(2 * SEC);
      real.advance(55 * SEC);
      expect(mount().classList.contains('clock-ringing')).toBe(true);
      real.advance(5 * SEC);
      expect(mount().classList.contains('clock-ringing')).toBe(false);
    });

    it('shows a steady highlight instead of a flash under reduced motion', () => {
      open({ when: at(11, 14, 59), prefersReducedMotion: () => true });
      real.advance(2 * SEC);
      expect(mount().classList.contains('clock-ringing--steady')).toBe(true);
      expect(mount().classList.contains('clock-ringing--flash')).toBe(false);
    });

    it('reads reduced motion from the browser by default', () => {
      const original = window.matchMedia;
      window.matchMedia = vi.fn(() => ({ matches: true }));
      try {
        open({ when: at(11, 14, 59), prefersReducedMotion: undefined });
        real.advance(2 * SEC);
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        expect(mount().classList.contains('clock-ringing--steady')).toBe(true);
      } finally {
        window.matchMedia = original;
      }
    });

    it('flashes without reduced motion where the browser cannot tell', () => {
      open({ when: at(11, 14, 59), prefersReducedMotion: undefined });
      real.advance(2 * SEC);
      expect(mount().classList.contains('clock-ringing--flash')).toBe(true);
    });

    it('flashes without reduced motion where asking the browser fails', () => {
      const original = window.matchMedia;
      window.matchMedia = () => { throw new Error('blocked'); };
      try {
        open({ when: at(11, 14, 59), prefersReducedMotion: undefined });
        real.advance(2 * SEC);
        expect(mount().classList.contains('clock-ringing--flash')).toBe(true);
      } finally {
        window.matchMedia = original;
      }
    });

    describe('after the tab sleeps or is throttled', () => {
      const onceAt = (time) => ({
        id: 'once', kind: 'clock', time, repeat: 'once', date: '2026-10-27',
        enabled: true, sound: 'chime', bellSchedules: null,
      });

      it('does not ring for Bells and Alarms that came due while it slept', () => {
        open({ when: at(11, 12), settings: { alarms: [{ ...onceAt('11:13'), repeat: 'everySchoolDay' }] } });
        real.jump(10 * 60 * SEC);
        real.advance(SEC);
        expect(mount().classList.contains('clock-ringing')).toBe(false);
        expect(ringing().hidden).toBe(true);
      });

      it('still turns off a one-time Clock Alarm it slept through', () => {
        open({ when: at(11, 12), settings: { alarms: [onceAt('11:13')] } });
        real.jump(10 * 60 * SEC);
        real.advance(SEC);
        expect(ringing().hidden).toBe(true);
        expect(saved(storage).alarms[0].enabled).toBe(false);
      });

      it('still rings for a ring only a few seconds late', () => {
        // The 11:15 Bell is 2 s old when the stalled tick finally runs.
        open({ when: at(11, 14, 58) });
        real.jump(3 * SEC);
        real.advance(SEC);
        expect(ringing().hidden).toBe(false);
        expect(ringing().textContent).toContain('Period 3 ends');
      });

      it('drops a missed ring from the sound schedule, even when the audio clock slept too', () => {
        open({ when: at(11, 14), sound: { state: 'running', time: 0 } });
        expect(player.scheduled).toEqual([expect.objectContaining({ at: 60 })]);
        // 90 s asleep; the audio clock stood still meanwhile.
        real.jump(90 * SEC);
        real.advance(SEC);
        expect(player.scheduled.map((r) => r.at)).not.toContain(60);
      });
    });

    it('a test ring plays the Bells sound now and flashes like a Bell', () => {
      open({ settings: { bells: { on: true, sound: 'buzzer' } } });
      openSettings();

      button('Test ring').click();

      expect(player.played).toEqual([{ sound: 'buzzer', repeat: false }]);
      expect(mount().classList.contains('clock-ringing--flash')).toBe(true);
      expect(ringing().textContent).toContain('Test ring');
      real.advance(4 * SEC);
      expect(mount().classList.contains('clock-ringing')).toBe(false);
    });
  });

  describe('sound settings', () => {
    it('sets the saved volume on load, and the volume control changes and saves it', () => {
      open({ settings: { volume: 0.5 } });
      expect(player.volume).toBe(0.5);

      const volume = mount().querySelector('input[type="range"]');
      expect(volume.value).toBe('50');
      volume.value = '20';
      volume.dispatchEvent(new Event('input'));

      expect(player.volume).toBe(0.2);
      expect(saved(storage).volume).toBe(0.2);
    });

    it('previews each voice', () => {
      open();
      openSettings();
      for (const sound of ['chime', 'schoolBell', 'beep', 'buzzer']) {
        setValue('Bell sound', sound);
        button('Preview Bell sound').click();
      }
      expect(player.played.map((p) => p.sound)).toEqual(['chime', 'schoolBell', 'beep', 'buzzer']);
    });

    it('chooses the Bells sound, which is saved and used for the coming Bells', () => {
      open({ sound: { state: 'running' } });
      const select = field('Bell sound');
      expect(select.value).toBe('schoolBell');

      select.value = 'chime';
      select.dispatchEvent(new Event('change'));

      expect(saved(storage).bells).toEqual({ on: true, sound: 'chime' });
      expect(player.scheduled[0].sound).toBe('chime');
    });
  });

  it('stops listening for visibility and closes the player when destroyed', () => {
    open({ sound: { state: 'running' } });
    app.destroy();
    const before = player.schedules.length;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(player.schedules.length).toBe(before);
    expect(player.closed).toBe(true);
    app = null;
  });
});
