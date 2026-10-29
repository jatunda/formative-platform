import { describe, it, expect } from 'vitest';
import {
  LAYOUT_KEY, addReadout, createLayoutStore, cycleReadout, newLayout, removeReadout,
} from '../../clock/readout-layout.js';
import { describeMoment } from '../../clock/clock-model.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';
import { createFakeStorage } from '../helpers/fake-storage.js';

const momentAt = (date) => describeMoment(date, SCHOOL_YEARS);
const afterSchool = momentAt(new Date(2026, 9, 27, 16, 0));
const inPeriod = momentAt(new Date(2026, 9, 27, 10, 32));
const modes = (layout) => layout.readouts.map((r) => r.mode);

describe('layout changes', () => {
  it('a new layout is one Readout in the default mode', () => {
    expect(modes(newLayout(afterSchool))).toEqual(['countup']);
    expect(modes(newLayout(inPeriod))).toEqual(['countdown']);
  });

  it('adds a Readout at the end, in the default mode for now', () => {
    const layout = { readouts: [{ mode: 'clock' }] };
    expect(modes(addReadout(layout, afterSchool))).toEqual(['clock', 'countup']);
    expect(modes(layout)).toEqual(['clock']);
  });

  it('cycles just the one Readout tapped', () => {
    const layout = { readouts: [{ mode: 'countdown' }, { mode: 'countdown' }] };
    expect(modes(cycleReadout(layout, 1))).toEqual(['countdown', 'countup']);
  });

  it('removes a Readout, but never the last one', () => {
    const two = { readouts: [{ mode: 'countdown' }, { mode: 'clock' }] };
    const one = removeReadout(two, 0);
    expect(modes(one)).toEqual(['clock']);
    expect(removeReadout(one, 0)).toBe(one);
  });
});

describe('createLayoutStore', () => {
  const layoutA = { readouts: [{ mode: 'clock' }] };
  const layoutB = { readouts: [{ mode: 'countup' }, { mode: 'countdown' }] };
  const raw = (layout) => JSON.stringify(layout);

  it('has nothing to load in a new tab on a new device', () => {
    const store = createLayoutStore({ session: createFakeStorage(), local: createFakeStorage() });
    expect(store.load()).toBeNull();
  });

  it("loads the tab's own layout before the last used one", () => {
    const store = createLayoutStore({
      session: createFakeStorage({ [LAYOUT_KEY]: raw(layoutA) }),
      local: createFakeStorage({ [LAYOUT_KEY]: raw(layoutB) }),
    });
    expect(store.load()).toEqual(layoutA);
  });

  it('starts a tab with no layout of its own from the last used one', () => {
    const store = createLayoutStore({
      session: createFakeStorage(), local: createFakeStorage({ [LAYOUT_KEY]: raw(layoutB) }),
    });
    expect(store.load()).toEqual(layoutB);
  });

  it('saves to the tab and as the last used layout', () => {
    const session = createFakeStorage();
    const local = createFakeStorage();
    createLayoutStore({ session, local }).save(layoutB);
    expect(JSON.parse(session.getItem(LAYOUT_KEY))).toEqual(layoutB);
    expect(JSON.parse(local.getItem(LAYOUT_KEY))).toEqual(layoutB);
  });

  it('keeps a layout in the tab only, leaving the last used one alone', () => {
    const session = createFakeStorage();
    const local = createFakeStorage({ [LAYOUT_KEY]: raw(layoutB) });
    createLayoutStore({ session, local }).keepInTab(layoutA);
    expect(JSON.parse(session.getItem(LAYOUT_KEY))).toEqual(layoutA);
    expect(JSON.parse(local.getItem(LAYOUT_KEY))).toEqual(layoutB);
  });

  it('ignores a saved layout of the wrong shape, falling through to the next', () => {
    const bad = [
      'not json', raw(null), raw([]), raw({ readouts: [] }), raw({ readouts: 'x' }),
      raw({ readouts: [{ mode: 'sideways' }] }), raw({ readouts: [null] }),
    ];
    for (const item of bad) {
      const store = createLayoutStore({
        session: createFakeStorage({ [LAYOUT_KEY]: item }),
        local: createFakeStorage({ [LAYOUT_KEY]: raw(layoutB) }),
      });
      expect(store.load()).toEqual(layoutB);
    }
  });

  it('keeps only the modes of a saved layout', () => {
    const store = createLayoutStore({
      session: createFakeStorage({ [LAYOUT_KEY]: raw({ readouts: [{ mode: 'clock', extra: 1 }], v: 9 }) }),
      local: createFakeStorage(),
    });
    expect(store.load()).toEqual({ readouts: [{ mode: 'clock' }] });
  });

  it('never throws when storage is full or blocked', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const store = createLayoutStore({ session: full, local: full });
    expect(() => store.save(layoutA)).not.toThrow();
  });

  it('still saves the last used layout when the tab storage is blocked', () => {
    const blocked = { getItem: () => null, setItem: () => { throw new Error('blocked'); } };
    const local = createFakeStorage();
    createLayoutStore({ session: blocked, local }).save(layoutA);
    expect(JSON.parse(local.getItem(LAYOUT_KEY))).toEqual(layoutA);
  });
});
