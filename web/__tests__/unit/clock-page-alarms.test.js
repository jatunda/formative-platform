import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { accessibleName, field, isShown, setValue, toggle } from '../helpers/clock-dom.js';

const mount = () => document.getElementById('clockApp');
const drawer = () => mount().querySelector('#clock-settings');
const section = () => document.getElementById('clock-settings-alarms');
/** A shown button in the drawer by its accessible name. */
const button = (name, root = mount()) => [...root.querySelectorAll('button')]
  .find((b) => accessibleName(b) === name && isShown(b));
/** The open Alarm form. */
const form = () => section().querySelector('form');
const inForm = (name) => field(name, form());
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));
const savedAlarms = (storage) => saved(storage).alarms ?? [];
/** The Alarm list: each item's name and hint line. */
const listed = () => [...section().querySelectorAll('.clock-alarm-item')].map((item) => ({
  name: item.querySelector('.clock-alarm-item__name').textContent,
  hint: item.querySelector('.clock-hint').textContent,
}));
const nextRings = () => [...document.querySelectorAll('#clock-settings-today li')].map((li) => li.textContent);

// Tue 2026-10-27 is an All Day: Period 3 runs 10:30–11:15.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);

const PERIOD_ALARM = {
  id: 'alarm-1', kind: 'period', label: 'Wrap-up time', enabled: true, sound: 'chime',
  bellSchedules: ['even', 'odd', 'lateStartEven', 'hsSuperSeminar'],
  anchor: { from: 'end', minutes: 5 },
  periods: ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'],
};
const CLOCK_ALARM = {
  id: 'alarm-2', kind: 'clock', label: 'Morning duty', enabled: true, sound: 'schoolBell',
  bellSchedules: null, time: '07:55', repeat: 'everySchoolDay',
};

describe('School Clock Alarm editor', () => {
  let app;
  let storage;
  let player;
  let t;

  /** Open the page on an HS device with `settings` saved, at `when`, with Settings open. */
  function open({ when = at(10, 32), settings = {} } = {}) {
    app?.destroy();
    t = when.getTime();
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', ...settings }) });
    player = createFakeSoundPlayer({ state: 'running' });
    app = initClockApp({ realNow: () => t, storage, tabStorage: createFakeStorage(), soundPlayer: player, capabilities: {} });
    button('Settings').click();
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

  it('is a drawer section after Period Labels, with an add button for each kind of Alarm', () => {
    open();
    const names = [...drawer().querySelectorAll('section')].map((s) => accessibleName(s));
    expect(names.indexOf('Alarms')).toBe(names.indexOf('Period Labels') + 1);
    expect(button('Clock Alarm', section())).toBeDefined();
    expect(button('Period Alarm', section())).toBeDefined();
    expect(form()).toBeNull();
  });

  describe('a Clock Alarm', () => {
    it('is added with its time, repeat and sound, saved, and shows in the list, Next rings and the sound schedule', () => {
      open();
      button('Clock Alarm', section()).click();
      expect(accessibleName(form())).toBe('New Clock Alarm');
      expect(inForm('Every School Day').checked).toBe(true);
      setValue('Name', 'Stretch', form());
      setValue('Hour', '10', form());
      setValue('Minute', '35', form());
      inForm('AM').click();
      setValue('Sound', 'chime', form());
      button('Save Alarm', form()).click();

      expect(saved(storage).alarms).toEqual([{
        id: 'alarm-1', kind: 'clock', label: 'Stretch', enabled: true, sound: 'chime',
        bellSchedules: null, time: '10:35', repeat: 'everySchoolDay',
      }]);
      expect(form()).toBeNull();
      expect(listed()).toEqual([{ name: 'Stretch', hint: '10:35 AM · every School Day · Chime' }]);
      expect(nextRings()[0]).toBe('10:35 AM · Clock Alarm · Stretch, every School Day · Chime');
      expect(player.scheduled.map((ring) => ring.sound)).toContain('chime');
    });

    it('rings once today when its time is still to come, or tomorrow when it has passed', () => {
      open();
      button('Clock Alarm', section()).click();
      inForm('Once').click();
      setValue('Hour', '2', form());
      setValue('Minute', '05', form());
      inForm('PM').click();
      button('Save Alarm', form()).click();
      button('Clock Alarm', section()).click();
      inForm('Once').click();
      setValue('Hour', '9', form());
      setValue('Minute', '00', form());
      button('Save Alarm', form()).click();

      expect(saved(storage).alarms.map((a) => [a.time, a.repeat, a.date])).toEqual([
        ['14:05', 'once', '2026-10-27'], ['09:00', 'once', '2026-10-28']]);
      expect(listed().map((a) => a.hint)).toEqual(['2:05 PM · once, Tue, Oct 27 · Chime', '9:00 AM · once, Wed, Oct 28 · Chime']);
      expect(listed()[0].name).toBe('Clock Alarm');
    });

    it('takes a 24-hour time, with no AM or PM, when clock times are 24-hour', () => {
      open({ settings: { use24Hour: true } });
      button('Clock Alarm', section()).click();
      expect(inForm('AM')).toBeUndefined();
      setValue('Hour', '15', form());
      setValue('Minute', '20', form());
      button('Save Alarm', form()).click();
      expect(saved(storage).alarms[0].time).toBe('15:20');
      expect(listed()[0].hint).toBe('15:20 · every School Day · Chime');
      button('Edit Clock Alarm').click();
      expect([inForm('Hour').value, inForm('Minute').value]).toEqual(['15', '20']);
    });

    it('follows a switch to or from 24-hour time while its form is open, keeping the time typed', () => {
      open();
      button('Clock Alarm', section()).click();
      setValue('Hour', '3', form());
      setValue('Minute', '20', form());
      field('PM', form()).click();

      toggle('24-hour time');

      expect(inForm('AM')).toBeUndefined();
      expect([inForm('Hour').value, inForm('Minute').value]).toEqual(['15', '20']);

      toggle('24-hour time');

      expect([inForm('Hour').value, inForm('Minute').value]).toEqual(['3', '20']);
      expect(inForm('PM').checked).toBe(true);
      button('Save Alarm', form()).click();
      expect(saved(storage).alarms[0].time).toBe('15:20');
    });

    it('leaves a time it cannot read as typed when 24-hour time is switched', () => {
      open();
      button('Clock Alarm', section()).click();
      setValue('Hour', '99', form());
      toggle('24-hour time');
      expect(inForm('Hour').value).toBe('99');
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Enter a time from 00:00 to 23:59.');
    });

    it('opens a morning time as two-digit 24-hour', () => {
      open({ settings: { use24Hour: true, alarms: [CLOCK_ALARM] } });
      button('Edit Morning duty').click();
      expect(inForm('Hour').value).toBe('07');
    });

    it('can be limited to some Bell Schedules, with the Block Days shortcut', () => {
      open();
      button('Clock Alarm', section()).click();
      expect(isShown(inForm('Even Day'))).toBe(false);
      toggle('Only on some Bell Schedules', form());
      expect(isShown(inForm('Even Day'))).toBe(true);
      expect(inForm('All Day').checked).toBe(true);
      button('Block Days', form()).click();
      expect(button('Block Days', form()).getAttribute('aria-pressed')).toBe('true');
      expect(button('Every schedule', form()).getAttribute('aria-pressed')).toBe('false');
      expect(inForm('All Day').checked).toBe(false);
      expect(inForm('HS Super Seminar Even').checked).toBe(true);
      setValue('Hour', '10', form());
      setValue('Minute', '45', form());
      button('Save Alarm', form()).click();

      expect(saved(storage).alarms[0].bellSchedules).toEqual(['even', 'odd', 'lateStartEven', 'hsSuperSeminar']);
      expect(listed()[0].hint).toBe('10:45 AM · every School Day · Block Days · Chime');
      // Today is an All Day, so it doesn't ring today.
      expect(nextRings().join(' | ')).not.toContain('Clock Alarm');
    });

    it('is edited in place of its list item, and Cancel keeps it as it was', () => {
      open({ settings: { alarms: [CLOCK_ALARM, PERIOD_ALARM] } });
      expect(listed()[0]).toEqual({ name: 'Morning duty', hint: '7:55 AM · every School Day · School bell' });
      button('Edit Morning duty').click();

      const item = section().querySelector('.clock-alarm-item--editing');
      expect(item.contains(form())).toBe(true);
      expect(accessibleName(form())).toBe('Edit Clock Alarm');
      expect(document.activeElement).toBe(inForm('Name'));
      expect([inForm('Name').value, inForm('Hour').value, inForm('Minute').value]).toEqual(['Morning duty', '7', '55']);
      expect(inForm('AM').checked).toBe(true);
      expect(inForm('Sound').value).toBe('schoolBell');
      expect(field('Only on some Bell Schedules', form()).checked).toBe(false);

      setValue('Hour', '8', form());
      button('Cancel', form()).click();
      expect(form()).toBeNull();
      expect(saved(storage).alarms[0].time).toBe('07:55');
      expect(document.activeElement).toBe(button('Edit Morning duty'));

      button('Edit Morning duty').click();
      setValue('Name', 'Gate duty', form());
      setValue('Hour', '8', form());
      button('Save Alarm', form()).click();
      expect(saved(storage).alarms).toEqual([{ ...CLOCK_ALARM, label: 'Gate duty', time: '08:55' }, PERIOD_ALARM]);
      expect(listed().map((a) => a.name)).toEqual(['Gate duty', 'Wrap-up time']);
      expect(document.activeElement).toBe(button('Edit Gate duty'));
    });

    it('keeps what is being typed through the ticks', () => {
      open();
      button('Clock Alarm', section()).click();
      setValue('Name', 'Stretch', form());
      inForm('Name').focus();
      t += 3000;
      vi.advanceTimersByTime(3000);
      expect(inForm('Name').value).toBe('Stretch');
      expect(document.activeElement).toBe(inForm('Name'));
    });

    it('says what is wrong with a time it cannot use, and saves nothing', () => {
      open();
      button('Clock Alarm', section()).click();
      setValue('Hour', '13', form());
      setValue('Minute', '00', form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Enter a time from 1:00 to 12:59.');
      expect(savedAlarms(storage)).toEqual([]);

      toggle('Only on some Bell Schedules', form());
      button('Block Days', form()).click();
      for (const name of ['Even Day', 'Odd Day', 'Late Start Even', 'HS Super Seminar Even']) toggle(name, form());
      setValue('Hour', '12', form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Tick at least one Bell Schedule.');
      expect(savedAlarms(storage)).toEqual([]);
    });

    it('opens a noon or afternoon time as 12-hour with PM, and Cancel on a new one goes back to its add button', () => {
      open({ settings: { alarms: [{ ...CLOCK_ALARM, time: '12:30' }, { ...CLOCK_ALARM, id: 'alarm-3', label: 'Bus', time: '15:05' }] } });
      button('Edit Morning duty').click();
      expect([inForm('Hour').value, inForm('Minute').value, inForm('PM').checked]).toEqual(['12', '30', true]);
      button('Edit Bus').click();
      expect([inForm('Hour').value, inForm('PM').checked]).toEqual(['3', true]);
      button('Clock Alarm', section()).click();
      button('Cancel', form()).click();
      expect(document.activeElement).toBe(button('Clock Alarm', section()));
    });

    it('rejects minutes past 59 or a time that is not a number', () => {
      open();
      button('Clock Alarm', section()).click();
      setValue('Hour', '9', form());
      setValue('Minute', '60', form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').hidden).toBe(false);
      setValue('Minute', '', form());
      button('Save Alarm', form()).click();
      setValue('Hour', '0', form());
      setValue('Minute', '15', form());
      button('Save Alarm', form()).click();
      expect(savedAlarms(storage)).toEqual([]);
    });

    it('rejects a 24-hour time past 23:59', () => {
      open({ settings: { use24Hour: true } });
      button('Clock Alarm', section()).click();
      setValue('Hour', '24', form());
      setValue('Minute', '00', form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Enter a time from 00:00 to 23:59.');
    });
  });

  describe('a Period Alarm', () => {
    it('is added with its point in the Period, the Periods (by their labels) and Block Days, and rings on a Block Day', () => {
      // Wed 2026-10-28 is an Even Day: Period 4 ends at 12:25 for HS.
      open({ when: new Date(2026, 9, 28, 10, 32), settings: { periodLabels: { 'Period 4': 'AP CSA' } } });
      button('Period Alarm', section()).click();
      expect(accessibleName(form())).toBe('New Period Alarm');
      expect(button('Period Alarm', section()).getAttribute('aria-expanded')).toBe('true');
      expect(inForm('Before the end').checked).toBe(true);
      expect(inForm('minutes before the end').value).toBe('5');
      // Periods 1–7 by default; Seminar and Super Seminar can be ticked.
      expect(inForm('Period 4 · AP CSA').checked).toBe(true);
      expect(inForm('Seminar').checked).toBe(false);
      expect(inForm('Super Seminar').checked).toBe(false);
      expect(button('Every schedule', form()).getAttribute('aria-pressed')).toBe('true');

      setValue('Name', 'Exit ticket', form());
      setValue('minutes before the end', '10', form());
      toggle('Period 1', form());
      toggle('Seminar', form());
      button('Block Days', form()).click();
      setValue('Sound', 'buzzer', form());
      button('Save Alarm', form()).click();

      expect(savedAlarms(storage)).toEqual([{
        id: 'alarm-1', kind: 'period', label: 'Exit ticket', enabled: true, sound: 'buzzer',
        bellSchedules: ['even', 'odd', 'lateStartEven', 'hsSuperSeminar'],
        anchor: { from: 'end', minutes: 10 },
        periods: ['Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Seminar'],
      }]);
      expect(listed()).toEqual([{
        name: 'Exit ticket', hint: '10 min before the end · Periods 2–7, Seminar · Block Days · Buzzer',
      }]);
      expect(nextRings()).toContain('12:15 PM · Period Alarm · Exit ticket · Period 4 · AP CSA, 10 min before the end · Buzzer');
    });

    it('can ring from the start or halfway (with no minutes to type), on chosen Bell Schedules', () => {
      open({ settings: { alarms: [PERIOD_ALARM] } });
      expect(listed()[0].hint).toBe('5 min before the end · Periods 1–7 · Block Days · Chime');
      button('Edit Wrap-up time').click();
      expect(accessibleName(form())).toBe('Edit Period Alarm');
      expect(button('Block Days', form()).getAttribute('aria-pressed')).toBe('true');
      inForm('From the start').click();
      expect(inForm('minutes from the start').value).toBe('5');
      setValue('minutes from the start', '40', form());
      button('Every schedule', form()).click();
      toggle('Finals', form());
      button('Save Alarm', form()).click();
      expect(savedAlarms(storage)[0].anchor).toEqual({ from: 'start', minutes: 40 });
      expect(savedAlarms(storage)[0].bellSchedules).toEqual(
        ['all', 'even', 'odd', 'lateStartEven', 'convocation', 'pepRally', 'hsSuperSeminar']);
      expect(listed()[0].hint).toBe('Minute 40 · Periods 1–7 · All Day, Even Day, Odd Day, Late Start Even, '
        + 'All School Convocation, Pep Rally, HS Super Seminar Even · Chime');

      button('Edit Wrap-up time').click();
      expect(inForm('Finals').checked).toBe(false);
      inForm('Halfway').click();
      expect(form().querySelector('.clock-field--inline').hidden).toBe(true);
      button('Every schedule', form()).click();
      for (const p of ['Period 1', 'Period 2', 'Period 4', 'Period 5', 'Period 7']) toggle(p, form());
      button('Save Alarm', form()).click();
      expect(savedAlarms(storage)[0]).toMatchObject({
        anchor: { from: 'halfway' }, bellSchedules: null, periods: ['Period 3', 'Period 6'],
      });
      expect(listed()[0].hint).toBe('Halfway · Period 3, Period 6 · Chime');
      expect(nextRings()).toContain('10:52:30 AM · Period Alarm · Wrap-up time · Period 3, halfway · Chime');
    });

    it('says what is missing (minutes, a Period) and saves nothing', () => {
      open();
      button('Period Alarm', section()).click();
      setValue('minutes before the end', '0', form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Enter a number of minutes from 1 to 240.');
      setValue('minutes before the end', 'ten', form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').hidden).toBe(false);

      setValue('minutes before the end', '10', form());
      for (const p of ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7']) toggle(p, form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Tick at least one Period.');

      toggle('Period 3', form());
      button('Block Days', form()).click();
      for (const name of ['Even Day', 'Odd Day', 'Late Start Even', 'HS Super Seminar Even']) toggle(name, form());
      button('Save Alarm', form()).click();
      expect(form().querySelector('[role="alert"]').textContent).toBe('Tick at least one Bell Schedule.');
      expect(savedAlarms(storage)).toEqual([]);
    });

    it('opens a halfway one with 5 minutes ready for a switch to before the end', () => {
      open({ settings: { alarms: [{ ...PERIOD_ALARM, label: undefined, anchor: { from: 'halfway' } }] } });
      expect(listed()[0].name).toBe('Period Alarm');
      button('Edit Period Alarm').click();
      expect(inForm('Halfway').checked).toBe(true);
      inForm('Before the end').click();
      expect(inForm('minutes before the end').value).toBe('5');
    });

    it('shows Period Labels typed while its form is open', () => {
      open();
      button('Period Alarm', section()).click();
      setValue('Period 3', 'AP CSA');
      expect(inForm('Period 3 · AP CSA')).toBeDefined();
    });
  });

  describe('every Alarm', () => {
    it('has an on/off switch: off is saved and leaves the Next rings and the sound schedule', () => {
      open({ settings: { alarms: [{ ...CLOCK_ALARM, time: '10:35' }, PERIOD_ALARM] } });
      const ringsNow = () => player.scheduled.filter((ring) => ring.sound === 'schoolBell' && ring.repeat);
      expect(field('Morning duty on').getAttribute('role')).toBe('switch');
      expect(field('Morning duty on').checked).toBe(true);
      expect(ringsNow()).toHaveLength(1);

      toggle('Morning duty on');

      expect(savedAlarms(storage)[0].enabled).toBe(false);
      expect(nextRings().join(' | ')).not.toContain('Morning duty');
      expect(ringsNow()).toHaveLength(0);
      toggle('Morning duty on');
      expect(savedAlarms(storage)[0].enabled).toBe(true);
      expect(ringsNow()).toHaveLength(1);
    });

    it('a "once" Clock Alarm turned back on rings at its next chance', () => {
      const rang = { ...CLOCK_ALARM, enabled: false, repeat: 'once', date: '2026-10-20', time: '11:00' };
      open({ settings: { alarms: [rang] } });
      toggle('Morning duty on');
      expect(savedAlarms(storage)[0]).toEqual({ ...rang, enabled: true, date: '2026-10-27' });
      expect(listed()[0].hint).toBe('11:00 AM · once, Tue, Oct 27 · School bell');
    });

    it('has its own sound, with a Preview of the sound chosen', () => {
      open();
      button('Clock Alarm', section()).click();
      expect(inForm('Sound').value).toBe('chime');
      setValue('Sound', 'buzzer', form());
      button('Preview Sound', form()).click();
      expect(player.played).toEqual([{ sound: 'buzzer', repeat: false }]);
    });

    it('is deleted at once from its form, with an Undo that puts it back', () => {
      open({ settings: { alarms: [CLOCK_ALARM, PERIOD_ALARM] } });
      const toast = () => section().querySelector('[role="status"]');
      button('Edit Morning duty').click();
      button('Delete', form()).click();

      expect(savedAlarms(storage)).toEqual([PERIOD_ALARM]);
      expect(listed().map((a) => a.name)).toEqual(['Wrap-up time']);
      expect(form()).toBeNull();
      expect(isShown(toast())).toBe(true);
      expect(toast().textContent).toContain('Morning duty deleted');
      expect(document.activeElement).toBe(button('Undo'));

      button('Undo').click();
      expect(savedAlarms(storage)).toEqual([CLOCK_ALARM, PERIOD_ALARM]);
      expect(isShown(toast())).toBe(false);
      expect(document.activeElement).toBe(button('Edit Morning duty'));
    });

    it('drops the Undo after about 6 seconds, keeping focus in the drawer', () => {
      const wait = (ms) => { t += ms; vi.advanceTimersByTime(ms); };
      const toast = () => section().querySelector('[role="status"]');
      open({ settings: { alarms: [PERIOD_ALARM] } });
      button('Edit Wrap-up time').click();
      button('Delete', form()).click();
      wait(6000);
      expect(isShown(toast())).toBe(false);
      expect(document.activeElement).toBe(button('Clock Alarm', section()));
      expect(savedAlarms(storage)).toEqual([]);
      expect(section().querySelector('ul').hidden).toBe(true);

      // With focus moved on, it stays where it is.
      open({ settings: { alarms: [PERIOD_ALARM] } });
      button('Edit Wrap-up time').click();
      button('Delete', form()).click();
      button('Period Alarm', section()).focus();
      wait(6000);
      expect(isShown(toast())).toBe(false);
      expect(document.activeElement).toBe(button('Period Alarm', section()));
    });

    it('opens one form at a time', () => {
      open({ settings: { alarms: [CLOCK_ALARM] } });
      button('Edit Morning duty').click();
      button('Period Alarm', section()).click();
      expect(section().querySelectorAll('form')).toHaveLength(1);
      expect(accessibleName(form())).toBe('New Period Alarm');
      expect(listed().map((a) => a.name)).toEqual(['Morning duty']);
      button('Cancel', form()).click();
      expect(document.activeElement).toBe(button('Period Alarm', section()));
    });

    it('every control is labelled', () => {
      open({ settings: { alarms: [CLOCK_ALARM, PERIOD_ALARM] } });
      const unnamed = () => [...section().querySelectorAll('input, select, button')].filter((c) => accessibleName(c) === '');
      button('Edit Morning duty').click();
      expect(unnamed()).toEqual([]);
      button('Period Alarm', section()).click();
      expect(unnamed()).toEqual([]);
    });
  });
});
