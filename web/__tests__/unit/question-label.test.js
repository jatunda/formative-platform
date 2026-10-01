import { describe, it, expect } from 'vitest';
import { deriveQuestionLabel } from '../../question-label.js';

describe('deriveQuestionLabel', () => {
  it('uses the first non-empty text item of the stem', () => {
    const data = { stem: [{ type: 'text', value: 'What is 2 + 2?' }] };
    expect(deriveQuestionLabel(data)).toBe('What is 2 + 2?');
  });

  it('skips a leading code item to find the first text item', () => {
    const data = { stem: [{ type: 'code', value: 'x = 1' }, { type: 'text', value: 'What does this print?' }] };
    expect(deriveQuestionLabel(data)).toBe('What does this print?');
  });

  it('skips a blank text item', () => {
    const data = { stem: [{ type: 'text', value: '   ' }, { type: 'text', value: 'Real stem text' }] };
    expect(deriveQuestionLabel(data)).toBe('Real stem text');
  });

  it('truncates long stem text with an ellipsis', () => {
    const longText = 'x'.repeat(100);
    const data = { stem: [{ type: 'text', value: longText }] };
    expect(deriveQuestionLabel(data)).toBe(`${'x'.repeat(80)}…`);
  });

  it('falls back to a placeholder when there is no stem text at all', () => {
    expect(deriveQuestionLabel({ stem: [] })).toBe('(empty question)');
    expect(deriveQuestionLabel({})).toBe('(empty question)');
  });
});
