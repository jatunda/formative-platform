import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';

// What appears on top of the main screen: the first-visit Division prompt,
// the "turn sound on" prompt, the ring card and the error toast. These tests
// check behaviour (focus, dismissing, what's announced), not the look.

const SEC = 1000;
const mount = () => document.getElementById('clockApp');
const visible = (node) => !node.closest('[hidden]');
const button = (name, within = mount()) => [...within.querySelectorAll('button')]
  .find((b) => (b.getAttribute('aria-label') ?? b.textContent.trim()) === name && visible(b));
const ringCard = () => mount().querySelector('[role="alertdialog"]');
const byId = (id) => document.getElementById(id);
const liveRegions = () => [...mount().querySelectorAll('[aria-live], [role="status"], [role="alert"]')];
const announced = () => liveRegions().filter(visible).map((r) => r.textContent.trim()).filter(Boolean);
const keyDown = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

// Tue 2026-10-27 is an All Day: Period 3 runs 10:30–11:15, then a Passing Period.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);
const wrapUp = {
  id: 'w', label: 'Wrap-up time', kind: 'period', anchor: { from: 'end', minutes: 5 },
  periods: ['Period 3'], enabled: true, sound: 'chime', bellSchedules: null,
};

describe('School Clock overlays', () => {
  let app;
  let t;
  let player;
  let storage;

  function advance(ms) {
    t += ms;
    vi.advanceTimersByTime(ms);
  }

  /** Open the page at `when` with `settings` saved (an HS device unless told otherwise). */
  function open({ when = at(10, 40), settings = {}, sound = {}, store, ...options } = {}) {
    t = when.getTime();
    player = createFakeSoundPlayer(sound);
    storage = store ?? createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', ...settings }) });
    app = initClockApp({
      realNow: () => t, storage, tabStorage: createFakeStorage(), soundPlayer: player,
      prefersReducedMotion: () => false, ...options,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<button id="outside">Somewhere else</button><div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  describe('the ring card', () => {
    /** Ring the "Wrap-up time" Period Alarm (5 min before Period 3 ends at 11:15). */
    function ringWrapUp(options = {}) {
      open({ when: at(11, 9, 59), settings: { alarms: [wrapUp] }, ...options });
      advance(2 * SEC);
    }

    it("names what rang: the kind, the Alarm's name and when it rings", () => {
      ringWrapUp();
      const card = ringCard();
      expect(visible(card)).toBe(true);
      expect(card.textContent).toContain('Ringing · Period Alarm');
      expect(byId(card.getAttribute('aria-labelledby')).textContent).toBe('Wrap-up time');
      expect(byId(card.getAttribute('aria-describedby')).textContent).toBe('5 min before the end of Period 3');
    });

    it.each([
      ['a Bell', at(11, 14, 59), {}, 'Bell', 'Period 3 ends'],
      ['an unnamed Period Alarm', at(10, 52, 29), {
        bells: { on: false, sound: 'schoolBell' },
        alarms: [{ ...wrapUp, label: undefined, anchor: { from: 'halfway' } }],
      }, 'Period Alarm', 'Period 3', 'halfway through Period 3'],
      ['a Period Alarm counted from the start', at(10, 39, 59), {
        alarms: [{ ...wrapUp, anchor: { from: 'start', minutes: 10 } }],
      }, 'Period Alarm', 'Wrap-up time', 'minute 10 of Period 3'],
      ['a Clock Alarm', at(10, 59, 59), {
        alarms: [{ id: 'c', label: 'Hand out quiz', kind: 'clock', time: '11:00', repeat: 'everySchoolDay', enabled: true, sound: 'chime', bellSchedules: null }],
      }, 'Clock Alarm', 'Hand out quiz', '11:00 AM · every School Day'],
      ['an unnamed one-time Clock Alarm', at(10, 59, 59), {
        alarms: [{ id: 'c', kind: 'clock', time: '11:00', repeat: 'once', date: '2026-10-27', enabled: true, sound: 'chime', bellSchedules: null }],
      }, 'Clock Alarm', '11:00 AM', 'once'],
    ])('names %s', (_, when, settings, kind, title, detail = '') => {
      open({ when, settings });
      advance(2 * SEC);
      const card = ringCard();
      expect(card.textContent).toContain(`Ringing · ${kind}`);
      expect(byId(card.getAttribute('aria-labelledby')).textContent).toBe(title);
      expect(byId(card.getAttribute('aria-describedby')).textContent).toBe(detail);
    });

    it.each([
      ['starts after a Passing Period', at(11, 19, 59), 'Period 4 starts', ''],
      ['starts as another ends', at(10, 9, 59), 'Nutrition starts', 'Period 2 ends'],
    ])('names the Segment a Bell %s', (_, when, title, detail) => {
      open({ when });
      advance(2 * SEC);
      expect(byId(ringCard().getAttribute('aria-labelledby')).textContent).toBe(title);
      expect(byId(ringCard().getAttribute('aria-describedby')).textContent).toBe(detail);
    });

    it('names a test ring, and shows over the Settings drawer it came from', () => {
      open();
      button('Settings').click();
      const testRing = button('Test ring');
      testRing.focus();
      testRing.click();
      expect(byId(ringCard().getAttribute('aria-labelledby')).textContent).toBe('Test ring');
      expect(ringCard().closest('[inert]')).toBeNull();
      expect(ringCard().contains(document.activeElement)).toBe(true);
      button('Dismiss', ringCard()).click();
      expect(document.activeElement).toBe(testRing);
    });

    it('takes focus when it shows, and gives it back when dismissed', () => {
      open({ when: at(11, 9, 59), settings: { alarms: [wrapUp] } });
      byId('outside').focus();
      advance(2 * SEC);
      expect(ringCard().contains(document.activeElement)).toBe(true);

      button('Dismiss', ringCard()).click();

      expect(visible(ringCard())).toBe(false);
      expect(document.activeElement).toBe(byId('outside'));
    });

    it('gives focus back when it stops on its own', () => {
      open({ when: at(11, 14, 59) });
      byId('outside').focus();
      advance(2 * SEC);
      expect(ringCard().contains(document.activeElement)).toBe(true);
      advance(4 * SEC);
      expect(visible(ringCard())).toBe(false);
      expect(document.activeElement).toBe(byId('outside'));
    });

    it('leaves focus alone if the teacher moved it elsewhere while it rang', () => {
      ringWrapUp();
      const settings = button('Settings');
      settings.focus();
      button('Dismiss', ringCard()).click();
      expect(document.activeElement).toBe(settings);
    });

    it('is dismissed with Escape, which stops the sound', () => {
      ringWrapUp();
      keyDown('Escape');
      expect(player.dismissals).toBe(1);
      expect(visible(ringCard())).toBe(false);
    });

    it('leaves Escape alone when nothing rings', () => {
      open();
      keyDown('Escape');
      expect(player.dismissals).toBe(0);
    });

    it('is announced once, and the ticking Readouts never are', () => {
      ringWrapUp();
      expect(announced()).toEqual(['Ringing · Period Alarm: Wrap-up time, 5 min before the end of Period 3']);
      advance(5 * SEC);
      expect(announced()).toEqual(['Ringing · Period Alarm: Wrap-up time, 5 min before the end of Period 3']);
      for (const region of liveRegions()) {
        expect(region.querySelector('.clock-readouts, .clock-readout')).toBeNull();
      }
      button('Dismiss', ringCard()).click();
      expect(announced()).toEqual([]);
    });

    it('flashes behind a frame that is not just colour: the card names it in text', () => {
      ringWrapUp();
      const flash = mount().querySelector('.clock-ring-flash');
      expect(visible(flash)).toBe(true);
      expect(flash.getAttribute('aria-hidden')).toBe('true');
      button('Dismiss', ringCard()).click();
      expect(visible(flash)).toBe(false);
    });
  });

  describe('the first-visit Division prompt', () => {
    const prompt = () => [...mount().querySelectorAll('[role="dialog"][aria-modal="true"]')]
      .find((d) => byId(d.getAttribute('aria-labelledby'))?.textContent === 'Which Division are you with?');

    it('is a dialog asking the Division that takes focus, with the page behind it out of reach', () => {
      open({ store: createFakeStorage() });
      const dialog = prompt();
      expect(visible(dialog)).toBe(true);
      expect(byId(dialog.getAttribute('aria-labelledby')).textContent).toBe('Which Division are you with?');
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(button('Middle School', dialog));
      expect(mount().querySelector('main').hasAttribute('inert')).toBe(true);
      expect(dialog.querySelector('a[href^="mailto:"]').textContent).toBe('Feedback? Email Eric');
    });

    it('hands focus back and the page back once a Division is chosen', () => {
      open({ store: createFakeStorage() });
      button('High School', prompt()).click();
      expect(visible(prompt())).toBe(false);
      expect(prompt().contains(document.activeElement)).toBe(false);
      expect(mount().querySelector('main').hasAttribute('inert')).toBe(false);
    });

    it('does not take focus when a Division is already saved', () => {
      byId('outside').focus();
      open();
      expect(visible(prompt())).toBe(false);
      expect(document.activeElement).toBe(byId('outside'));
    });
  });

  describe('the "turn sound on" prompt', () => {
    const soundPrompt = () => mount().querySelector('.clock-sound-prompt');

    it('says sound is off, that the tab must stay open, and turns it on', async () => {
      open();
      expect(soundPrompt().textContent).toContain('Sound is off');
      expect(soundPrompt().textContent).toContain('Keep this tab open for Bells and Alarms');
      button('Turn sound on', soundPrompt()).click();
      await Promise.resolve();
      expect(visible(soundPrompt())).toBe(false);
    });

    it('waits until the first-visit question is answered', () => {
      open({ store: createFakeStorage() });
      expect(visible(soundPrompt())).toBe(false);
      button('High School').click();
      expect(visible(soundPrompt())).toBe(true);
    });

    it('steps aside while something rings, and comes back after', () => {
      open({ when: at(11, 14, 59) });
      advance(2 * SEC);
      expect(visible(soundPrompt())).toBe(false);
      button('Dismiss', ringCard()).click();
      expect(visible(soundPrompt())).toBe(true);
    });
  });

  describe("the \"couldn't save\" toast", () => {
    const toast = () => mount().querySelector('.clock-toast--error');
    function brokenStorage() {
      const s = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS' }) });
      s.setItem = () => { throw new Error('QuotaExceededError'); };
      return s;
    }

    it('says so once when a change cannot be saved, and the change still applies', () => {
      open({ store: brokenStorage() });
      expect(visible(toast())).toBe(false);
      button('Bells').click();
      expect(visible(toast())).toBe(true);
      expect(toast().getAttribute('role')).toBe('alert');
      expect(toast().textContent).toContain("Couldn't save on this device. Changes last until this tab closes.");
      expect(button('Bells').getAttribute('aria-pressed')).toBe('false');

      button('Dismiss', toast()).click();
      expect(visible(toast())).toBe(false);
      button('Bells').click();
      expect(visible(toast())).toBe(false);
    });

    it('does not show when saving works', () => {
      open();
      button('Bells').click();
      expect(visible(toast())).toBe(false);
    });
  });
});
