import { describe, it, expect } from 'vitest';
import { lineIcon } from '../../line-icons.js';
import { icon } from '../../clock/icons.js';

describe('lineIcon', () => {
  it('draws a decorative 24-unit SVG with the caller\'s class', () => {
    const svg = lineIcon('plus', 'schedule-icon');
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.getAttribute('class')).toBe('schedule-icon');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.innerHTML).toBe('<path d="M12 5v14M5 12h14"></path>');
  });

  it('gives each call its own element', () => {
    expect(lineIcon('check', 'a')).not.toBe(lineIcon('check', 'a'));
  });
});

describe('School Clock icon', () => {
  it('is the shared line icon with the clock\'s class', () => {
    const svg = icon('close');
    expect(svg.getAttribute('class')).toBe('clock-icon');
    expect(svg.outerHTML).toBe(lineIcon('close', 'clock-icon').outerHTML);
  });
});
