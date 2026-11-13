import { describe, it, expect } from 'vitest';
import {
  RING_BOX, RING_GAP, RING_R, RING_SLACK, RING_STROKE, ringClears, ringObstacles, ringTouches,
} from '../../clock/ring-geometry.js';

const box = (left, top, right, bottom) => ({ left, top, right, bottom });
const named = (name, b) => ({ name, box: b });
// A ring 400 across, centred at (500, 300).
const ring = box(300, 100, 700, 500);

describe('the ring geometry', () => {
  it('draws its circle, stroke and all, inside the box that is kept clear', () => {
    expect(RING_R + RING_STROKE / 2).toBeLessThanOrEqual(RING_BOX / 2);
  });

  it('a ring clears a box when its edge is at least the gap away, measured to the box\'s nearest point', () => {
    // Straight above: the ring's top is at y=100.
    expect(ringClears(500, 300, 400, [box(400, 0, 600, 100 - RING_GAP)], RING_GAP)).toBe(true);
    expect(ringClears(500, 300, 400, [box(400, 0, 600, 100 - RING_GAP + 1)], RING_GAP)).toBe(false);
    // In the corner, measured to the box's corner: 200 + 12 along the diagonal.
    const d = (200 + RING_GAP) / Math.SQRT2 + 0.5;
    expect(ringClears(500, 300, 400, [box(0, 0, 500 - d, 300 - d)], RING_GAP)).toBe(true);
  });

  it('names what a ring touches, using the shorter side of its box and the shared gap', () => {
    const obstacles = [
      named('Day Label', box(400, 0, 600, 95)), // 5px above the ring: inside the gap
      named('"Timer"', box(900, 0, 1000, 40)), // far off in the corner
      named('small Readout 1', box(706, 280, 800, 320)), // 6px beside it
    ];
    expect(ringTouches(ring, obstacles)).toEqual(['Day Label', 'small Readout 1']);
    expect(ringTouches(ring, obstacles, 0)).toEqual([]);
    // A box taller than it is wide keeps its circle to its width: 400 across, its bottom at y=500, 20px above the box.
    expect(ringTouches(box(300, 0, 700, 600), [named('below', box(400, 520, 600, 540))])).toEqual([]);
  });

  it('lets a measured ring fall short of the gap by layout rounding, and no more', () => {
    // The ring's top is at y=100.
    const above = (bottom) => [named('Day Label', box(400, 0, 600, bottom))];
    expect(ringTouches(ring, above(100 - RING_GAP + RING_SLACK))).toEqual([]);
    expect(ringTouches(ring, above(100 - RING_GAP + RING_SLACK + 0.1))).toEqual(['Day Label']);
  });

  it('leaves out hidden pieces, whose boxes are empty', () => {
    expect(ringTouches(ring, [named('hidden', box(500, 300, 500, 300))])).toEqual([]);
  });

  it('finds the top bar\'s Day Label and buttons and the small Readouts\' values, by name', () => {
    document.body.innerHTML = `
      <header class="clock-top"><p class="clock-day">All Day</p><button>Timer</button><button aria-label="Settings"></button></header>
      <div class="clock-readouts"><div class="clock-smalls">
        <div class="clock-readout"><span class="clock-readout__value">42:17</span></div>
        <div class="clock-readout"><span class="clock-readout__value">10:40</span></div>
      </div></div>
      <button>Not in the top bar</button>`;
    const obstacles = ringObstacles(document);
    expect(obstacles.map((o) => o.name)).toEqual(['Day Label', '"Timer"', '"Settings"', 'small Readout 1', 'small Readout 2']);
    expect(obstacles[0].box).toEqual(document.querySelector('.clock-day').getBoundingClientRect());
  });
});
