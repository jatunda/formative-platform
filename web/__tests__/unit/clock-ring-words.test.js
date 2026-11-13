import { describe, it, expect } from 'vitest';
import { ringWords } from '../../clock/ring-words.js';

const settings = { use24Hour: false, periodLabels: {} };
const at = new Date(2026, 9, 27, 10, 0);

describe('what the ring card says about the timer', () => {
  it('names the length it was started with', () => {
    expect(ringWords({ at, source: 'timer', sound: 'beep', totalMs: 5 * 60 * 1000 }, settings))
      .toEqual({ kind: 'Timer', title: 'Time is up', detail: '5:00 timer' });
  });

  it('has no detail line when the length is unknown', () => {
    expect(ringWords({ at, source: 'timer', sound: 'beep', totalMs: null }, settings).detail).toBe('');
  });

  it("puts the teacher's name for it first", () => {
    expect(ringWords({ at, source: 'timer', sound: 'beep', totalMs: 20 * 60 * 1000, name: 'Quiz' }, settings).detail)
      .toBe('Quiz · 20:00 timer');
    expect(ringWords({ at, source: 'timer', sound: 'beep', totalMs: null, name: 'Quiz' }, settings).detail).toBe('Quiz');
  });
});
