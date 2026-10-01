import { describe, it, expect } from 'vitest';
import { createDslCheatSheetPanel } from '../../dsl-cheat-sheet.js';

describe('createDslCheatSheetPanel', () => {
  it('builds a native <details> disclosure, closed by default', () => {
    const panel = createDslCheatSheetPanel();
    expect(panel.tagName).toBe('DETAILS');
    expect(panel.open).toBe(false);
    expect(panel.className).toBe('dsl-cheat-sheet');
  });

  it('has a summary toggle', () => {
    const panel = createDslCheatSheetPanel();
    const summary = panel.querySelector('summary');
    expect(summary).toBeTruthy();
    expect(summary.textContent).toContain('Cheat Sheet');
  });

  it('documents the Page Link and Section Link syntax', () => {
    const panel = createDslCheatSheetPanel();
    const codeCells = [...panel.querySelectorAll('td code')].map((el) => el.textContent);
    expect(codeCells.some((text) => text.includes('[[slug]]'))).toBe(true);
    expect(codeCells.some((text) => text.includes('[[#Header Text]]'))).toBe(true);
  });

  it('documents the Question Link syntax, but not the full Question grammar', () => {
    const panel = createDslCheatSheetPanel();
    const codeCells = [...panel.querySelectorAll('td code')].map((el) => el.textContent);
    expect(codeCells.some((text) => text.includes('[[q:slug]]'))).toBe(true);
    expect(codeCells.some((text) => text.includes('Explanation:'))).toBe(false);
  });

  it('creates a fresh element each call rather than sharing one node', () => {
    const first = createDslCheatSheetPanel();
    const second = createDslCheatSheetPanel();
    expect(first).not.toBe(second);
  });
});
