import { describe, it, expect, afterEach, vi } from 'vitest';
import { celebrate, playCorrectSound } from '../../celebration.js';

// getAudioContext() caches its AudioContext in a module-level variable, so
// tests that care about AudioContext construction need their own fresh
// module instance via resetModules() + dynamic import - otherwise an
// earlier test's cached context would leak into a later one.
async function freshCelebrationModule() {
  vi.resetModules();
  return import('../../celebration.js');
}

function mockAudioContext({ state = 'running' } = {}) {
  const gainNode = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  const oscNode = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const ctx = {
    state,
    currentTime: 0,
    resume: vi.fn(),
    createOscillator: vi.fn(() => ({ ...oscNode })),
    createGain: vi.fn(() => ({ ...gainNode })),
    destination: {},
  };
  const Ctor = vi.fn(() => ctx);
  return { ctx, Ctor };
}

describe('playCorrectSound', () => {
  afterEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  it('does nothing when the browser has no AudioContext (defensive no-op)', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;

    expect(() => playCorrectSound()).not.toThrow();
  });

  it('plays a three-note arpeggio through a mocked AudioContext', async () => {
    const { playCorrectSound: play } = await freshCelebrationModule();
    const { ctx, Ctor } = mockAudioContext();
    window.AudioContext = Ctor;

    play();

    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    expect(ctx.createGain).toHaveBeenCalledTimes(3);
  });

  it('resumes a suspended AudioContext before playing', async () => {
    const { playCorrectSound: play } = await freshCelebrationModule();
    const { ctx, Ctor } = mockAudioContext({ state: 'suspended' });
    window.AudioContext = Ctor;

    play();

    expect(ctx.resume).toHaveBeenCalled();
  });

  it('reuses the same AudioContext across calls instead of creating a new one each time', async () => {
    const { playCorrectSound: play } = await freshCelebrationModule();
    const { Ctor } = mockAudioContext();
    window.AudioContext = Ctor;

    play();
    play();

    expect(Ctor).toHaveBeenCalledTimes(1);
  });

  it('swallows errors from the Web Audio API without throwing', async () => {
    const { playCorrectSound: play } = await freshCelebrationModule();
    window.AudioContext = vi.fn(() => {
      throw new Error('Web Audio unavailable');
    });

    expect(() => play()).not.toThrow();
  });
});

describe('celebrate', () => {
  afterEach(() => {
    delete window.matchMedia;
  });

  it('does nothing when targetEl is null', () => {
    expect(() => celebrate(null)).not.toThrow();
  });

  it('skips the confetti burst under prefers-reduced-motion, but still marks the option correct', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    const el = document.createElement('div');

    celebrate(el);

    expect(el.classList.contains('question-widget-celebrate')).toBe(true);
    expect(el.querySelector('.confetti-burst')).toBeNull();
  });

  it('bursts confetti when motion is not reduced', () => {
    window.matchMedia = vi.fn(() => ({ matches: false }));
    const el = document.createElement('div');

    celebrate(el);

    expect(el.querySelector('.confetti-burst')).not.toBeNull();
  });
});
