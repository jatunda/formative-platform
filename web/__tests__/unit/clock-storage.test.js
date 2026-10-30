import { describe, it, expect } from 'vitest';
import { createSettingsStore, DEFAULT_SETTINGS, SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';

const clockAlarm = {
  id: 'c1', kind: 'clock', label: 'Exit tickets', enabled: true, sound: 'chime', bellSchedules: null,
  time: '10:05', repeat: 'everySchoolDay',
};
const onceAlarm = {
  id: 'c2', kind: 'clock', enabled: false, sound: 'beep', bellSchedules: ['even'],
  time: '07:45', repeat: 'once', date: '2026-10-27',
};
const periodAlarm = {
  id: 'p1', kind: 'period', enabled: true, sound: 'buzzer', bellSchedules: null,
  anchor: { from: 'end', minutes: 5 }, periods: ['Period 2'],
};

/** A store over fake storage holding `saved` (raw string, or a value saved as JSON). */
function storeHolding(saved) {
  const raw = typeof saved === 'string' ? saved : JSON.stringify(saved);
  return createSettingsStore(createFakeStorage({ [SETTINGS_KEY]: raw }));
}

describe('clock settings store', () => {
  it('uses a versioned key', () => {
    expect(SETTINGS_KEY).toBe('school-clock-settings-v1');
  });

  it('gives the defaults on a first visit: no Division yet, 12-hour time, Bells on, no Alarms', () => {
    const settings = createSettingsStore(createFakeStorage()).load();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings).toMatchObject({
      division: null, use24Hour: false, periodLabels: {}, bells: { on: true, sound: 'schoolBell' },
      alarms: [], timerEndsAt: null, timerSound: 'beep',
    });
    expect(settings.volume).toBeGreaterThan(0);
  });

  it('round-trips every setting', () => {
    const storage = createFakeStorage();
    const settings = {
      division: 'MS', use24Hour: true, periodLabels: { 'Period 3': 'AP CSA', Seminar: 'Advisory' },
      bells: { on: false, sound: 'chime' }, alarms: [clockAlarm, onceAlarm, periodAlarm],
      volume: 0.25, timerEndsAt: 1793000000000, timerPausedMs: null, timerSound: 'buzzer',
      recentDurations: [450000, 900000],
      showSeconds: false, dayStrip: false, theme: 'chalkboard', fontSwap: 'serif-1', paletteSwap: 'ocean',
      colorScheme: 'light',
    };
    createSettingsStore(storage).save(settings);
    expect(createSettingsStore(storage).load()).toEqual(settings);
  });

  it('starts with seconds on, the Day Strip on and the dark default theme, with no swaps', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      showSeconds: true, dayStrip: true, theme: 'default', fontSwap: null, paletteSwap: null, colorScheme: 'dark',
    });
  });

  it.each(['light', 'dark', 'auto'])('keeps the %s colour scheme', (colorScheme) => {
    expect(storeHolding({ colorScheme }).load().colorScheme).toBe(colorScheme);
  });

  it('defaults each display preference that is corrupt', () => {
    const settings = storeHolding({
      division: 'HS', showSeconds: 'no', dayStrip: 0, theme: '', fontSwap: 5, paletteSwap: { id: 'x' },
      colorScheme: 'sepia',
    }).load();
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, division: 'HS' });
  });

  it('round-trips a paused timer, and has no timer or quick picks on a first visit', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ timerPausedMs: null, recentDurations: [] });
    expect(storeHolding({ timerPausedMs: 180000 }).load().timerPausedMs).toBe(180000);
  });

  it('a running timer wins over a paused one saved alongside it', () => {
    const settings = storeHolding({ timerEndsAt: 1793000000000, timerPausedMs: 180000 }).load();
    expect(settings).toMatchObject({ timerEndsAt: 1793000000000, timerPausedMs: null });
  });

  it.each([
    ['not a list', 'soon', []],
    ['with bad entries dropped', [450000, -5, 'x', 0, 900000], [450000, 900000]],
    ['to the 3 most recent', [1000, 2000, 3000, 4000], [1000, 2000, 3000]],
  ])('keeps the quick picks %s', (_, saved, kept) => {
    expect(storeHolding({ recentDurations: saved }).load().recentDurations).toEqual(kept);
  });

  it.each([0, -1000, 'soon'])('defaults a paused timer of %s', (saved) => {
    expect(storeHolding({ timerPausedMs: saved }).load().timerPausedMs).toBeNull();
  });

  it('accepts every Period Alarm anchor', () => {
    const alarms = [
      { ...periodAlarm, id: 'a', anchor: { from: 'start', minutes: 40 } },
      { ...periodAlarm, id: 'b', anchor: { from: 'halfway' } },
    ];
    expect(storeHolding({ alarms }).load().alarms).toEqual(alarms);
  });

  it.each([
    ['corrupt JSON', '{not json'],
    ['a non-object', '[1, 2]'],
    ['null', 'null'],
  ])('falls back to the defaults when the saved data is %s', (_, raw) => {
    expect(storeHolding(raw).load()).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the good fields and defaults each bad one', () => {
    const settings = storeHolding({
      division: 'K12', use24Hour: 'yes', periodLabels: { 'Period 1': 'Prep', 'Period 2': 7 },
      bells: { on: true, sound: 'kazoo' }, volume: 3, timerEndsAt: 'soon', timerSound: 'kazoo',
    }).load();
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, periodLabels: { 'Period 1': 'Prep' } });
  });

  it('defaults Period Labels and Alarms that are not the right container', () => {
    const settings = storeHolding({ division: 'HS', periodLabels: ['AP CSA'], alarms: { a: clockAlarm } }).load();
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, division: 'HS' });
  });

  it('defaults Bells that are missing a field', () => {
    expect(storeHolding({ bells: { sound: 'chime' } }).load().bells).toEqual(DEFAULT_SETTINGS.bells);
  });

  it.each([
    ['no id', { ...clockAlarm, id: undefined }],
    ['an unknown kind', { ...clockAlarm, kind: 'egg' }],
    ['a non-boolean enabled', { ...clockAlarm, enabled: 1 }],
    ['an unknown sound', { ...clockAlarm, sound: 'kazoo' }],
    ['a non-string label', { ...clockAlarm, label: 5 }],
    ['bellSchedules that are not a list of keys', { ...clockAlarm, bellSchedules: 'even' }],
    ['bellSchedules holding a non-string', { ...clockAlarm, bellSchedules: [1] }],
    ['a malformed time', { ...clockAlarm, time: '8:05' }],
    ['an unknown repeat', { ...clockAlarm, repeat: 'weekly' }],
    ['"once" with no date', { ...onceAlarm, date: undefined }],
    ['an unknown anchor', { ...periodAlarm, anchor: { from: 'middle' } }],
    ['an anchor with no minutes', { ...periodAlarm, anchor: { from: 'start' } }],
    ['no anchor', { ...periodAlarm, anchor: null }],
    ['periods that are not a list', { ...periodAlarm, periods: 'Period 2' }],
    ['a null entry', null],
  ])('drops an Alarm with %s and keeps the rest', (_, bad) => {
    expect(storeHolding({ alarms: [clockAlarm, bad, periodAlarm] }).load().alarms).toEqual([clockAlarm, periodAlarm]);
  });

  it('does not throw when saving fails (storage full or blocked)', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => createSettingsStore(full).save(DEFAULT_SETTINGS)).not.toThrow();
  });
});
