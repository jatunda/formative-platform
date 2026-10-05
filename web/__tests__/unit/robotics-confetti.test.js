import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { launchConfetti, prefersReducedMotion } from '../../robotics/confetti.js';

function mockReducedMotion(matches) {
  window.matchMedia = vi.fn().mockReturnValue({ matches });
}

describe('launchConfetti', () => {
  let target;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="target"></div>';
    target = document.getElementById('target');
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('bursts colored confetti pieces out of the target, then cleans them up', () => {
    mockReducedMotion(false);
    launchConfetti(target);
    const burst = target.querySelector('.robotics-confetti');
    expect(burst.getAttribute('aria-hidden')).toBe('true');
    const pieces = burst.querySelectorAll('.robotics-confetti-piece');
    expect(pieces.length).toBeGreaterThan(20);
    expect(pieces[0].style.getPropertyValue('--dx')).toMatch(/px$/);

    vi.runAllTimers();
    expect(target.querySelector('.robotics-confetti')).toBeNull();
  });

  it('launches nothing under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    launchConfetti(target);
    expect(target.querySelector('.robotics-confetti')).toBeNull();
  });

  it('ignores a missing target', () => {
    mockReducedMotion(false);
    expect(() => launchConfetti(null)).not.toThrow();
  });
});

describe('prefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('reads the media query', () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('assumes motion is fine when matchMedia is unavailable', () => {
    window.matchMedia = undefined;
    expect(prefersReducedMotion()).toBe(false);
  });
});
