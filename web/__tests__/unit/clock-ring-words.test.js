import { describe, it, expect } from 'vitest';
import { ringWords } from '../../clock/ring-words.js';

const text = { name: (segment) => segment.name, time: () => '10:00 AM' };
const at = new Date(2026, 9, 27, 10, 0);

describe('what the ring card says about the timer', () => {
  it('names the length it was started with', () => {
    expect(ringWords({ at, source: 'timer', sound: 'beep', totalMs: 5 * 60 * 1000 }, text))
      .toEqual({ kind: 'Timer', title: 'Time is up', detail: '5:00 timer' });
  });

  it('has no detail line when the length is unknown', () => {
    expect(ringWords({ at, source: 'timer', sound: 'beep', totalMs: null }, text).detail).toBe('');
  });
});
