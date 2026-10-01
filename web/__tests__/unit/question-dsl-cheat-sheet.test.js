import { describe, it, expect } from 'vitest';
import { createQuestionDslCheatSheetPanel } from '../../question-dsl-cheat-sheet.js';

describe('createQuestionDslCheatSheetPanel', () => {
  it('builds a native <details> disclosure, closed by default', () => {
    const panel = createQuestionDslCheatSheetPanel();
    expect(panel.tagName).toBe('DETAILS');
    expect(panel.open).toBe(false);
  });

  it('has a summary toggle', () => {
    const panel = createQuestionDslCheatSheetPanel();
    const summary = panel.querySelector('summary');
    expect(summary).toBeTruthy();
    expect(summary.textContent).toContain('Question Format');
  });

  it('documents the full Question grammar: options, Explanation, Mistake, and Tags', () => {
    const panel = createQuestionDslCheatSheetPanel();
    const codeCells = [...panel.querySelectorAll('td code')].map((el) => el.textContent);
    expect(codeCells.some((text) => text.startsWith('+ '))).toBe(true);
    expect(codeCells.some((text) => text.startsWith('- '))).toBe(true);
    expect(codeCells.some((text) => text.includes('Explanation:'))).toBe(true);
    expect(codeCells.some((text) => text.includes('Mistake:'))).toBe(true);
    expect(codeCells.some((text) => text.includes('Tags:'))).toBe(true);
  });

  it('creates a fresh element each call rather than sharing one node', () => {
    const first = createQuestionDslCheatSheetPanel();
    const second = createQuestionDslCheatSheetPanel();
    expect(first).not.toBe(second);
  });
});
