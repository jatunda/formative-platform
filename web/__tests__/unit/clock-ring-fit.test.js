import { describe, it, expect, afterEach, vi } from 'vitest';
import { RING_GAP, keepRingClear, ringRoom, ringShift } from '../../clock/ring-fit.js';

const box = (left, top, right, bottom) => ({ left, top, right, bottom });
// A 1000 × 600 region: the ring's centre is at x=500, and y=300 in the middle.
const region = box(0, 0, 1000, 600);

describe('the room the timer ring has', () => {
  it('with nothing in the way, the ring is as tall as the region', () => {
    expect(ringRoom(region, [], RING_GAP)).toBe(600);
  });

  it('with the top bar in the far corners, the ring is still as tall as the region', () => {
    const corners = [box(0, 0, 150, 40), box(850, 0, 1000, 40)];
    expect(ringRoom(region, corners, 10)).toBe(600);
    expect(ringShift(region, corners, 10, 600)).toBe(0);
  });

  it('a box straight above leaves the space under it, less the gap, and the ring sits at the bottom', () => {
    // The box ends at y=100; with a 20px gap the ring has 600 - 100 - 20 = 480.
    const above = [box(400, 0, 600, 100)];
    expect(ringRoom(region, above, 20)).toBeCloseTo(480);
    expect(ringShift(region, above, 20, 480)).toBeCloseTo(60); // centre at 360, not 300
  });

  it('a box reaching in from the side is measured to its corner, so the ring reaches up past it', () => {
    const controls = [box(620, 0, 1000, 60)];
    const room = ringRoom(region, controls, 0);
    expect(room).toBeGreaterThan(540); // more than the space under the box
    expect(room).toBeLessThan(600);
    // At that size, sitting at the bottom, it just touches the corner (620, 60).
    expect(Math.hypot(620 - 500, 60 - (600 - room / 2))).toBeCloseTo(room / 2);
  });

  it('a smaller ring (its width caps it) moves down only as far as it must', () => {
    const above = [box(400, 0, 600, 100)];
    // 400 across: in the middle its top is at 100, touching the box; 20 lower clears the 20px gap.
    expect(ringShift(region, above, 20, 400)).toBeCloseTo(20);
    // 300 across clears in the middle.
    expect(ringShift(region, above, 20, 300)).toBe(0);
  });

  it('a box over the whole region leaves no room at all', () => {
    expect(ringRoom(region, [box(0, 0, 1000, 600)], RING_GAP)).toBe(0);
  });
});

describe('keeping the ring clear of the top bar', () => {
  let observed;
  let callback;
  class FakeResizeObserver {
    constructor(cb) { callback = cb; }
    observe(node) { observed.push(node); }
  }
  const rect = (node, [left, top, right, bottom]) => {
    node.getBoundingClientRect = () => ({ left, top, right, bottom, width: right - left, height: bottom - top });
  };

  /** A region sharing the top bar's row, with the Day Label straight above the middle. */
  function setUp() {
    observed = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const area = document.createElement('div');
    const ring = document.createElement('div');
    const top = document.createElement('header');
    const day = document.createElement('p');
    day.className = 'clock-day';
    const button = document.createElement('button');
    const hidden = document.createElement('button');
    top.append(day, button, hidden);
    rect(area, [0, 0, 1000, 600]);
    rect(ring, [0, 0, 0, 0]);
    rect(top, [0, 0, 1000, 100]);
    rect(day, [400, 0, 600, 100]);
    rect(button, [950, 0, 1000, 40]);
    rect(hidden, [0, 0, 0, 0]);
    keepRingClear(area, ring, top);
    return { area, ring, top, day, button };
  }
  const px = (area, name) => Number.parseFloat(area.style.getPropertyValue(name));

  afterEach(() => vi.unstubAllGlobals());

  it('watches the region, the ring, the top bar and each piece of it for size changes', () => {
    const { area, ring, top, day, button } = setUp();
    expect(observed).toEqual(expect.arrayContaining([area, ring, top, day, button]));
  });

  it('while the timer shows, gives the ring the room the top bar leaves and where to sit', () => {
    const { area } = setUp();
    area.classList.add('has-timer');
    callback();
    expect(px(area, '--ring-room')).toBeCloseTo(600 - 100 - RING_GAP);
    expect(px(area, '--ring-shift')).toBeCloseTo(50 + RING_GAP / 2);
  });

  it('places the ring by the size it is drawn at, when its width caps it below the room', () => {
    const { area, ring } = setUp();
    area.classList.add('has-timer');
    rect(ring, [300, 0, 700, 400]);
    callback();
    expect(px(area, '--ring-shift')).toBeCloseTo(RING_GAP);
  });

  it('with no timer it measures nothing', () => {
    const { area } = setUp();
    callback();
    expect(area.style.getPropertyValue('--ring-room')).toBe('');
  });

  it('where the ring keeps under the top bar (short and portrait screens) it sets nothing', () => {
    const { area } = setUp();
    area.classList.add('has-timer');
    callback();
    rect(area, [0, 120, 1000, 600]);
    callback();
    expect(area.style.getPropertyValue('--ring-room')).toBe('');
    expect(area.style.getPropertyValue('--ring-shift')).toBe('');
  });

  it('does nothing where the browser has no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const area = document.createElement('div');
    expect(() => keepRingClear(area, area, document.createElement('header'))).not.toThrow();
  });
});
