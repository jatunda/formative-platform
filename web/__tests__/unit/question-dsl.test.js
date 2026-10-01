import { describe, it, expect } from 'vitest';
import { parseQuestionDSL, generateQuestionDSLFromParsed } from '../../question-dsl.js';

const SIMPLE_QUESTION = `What is 2 + 2?

+ 4
    Explanation: Correct, 2 + 2 is 4.
- 5
    Explanation: Off by one.
    Mistake: calculation error
- 22
    Explanation: That's concatenation, not addition.
    Mistake: misconception

Tags: AP CS A | arithmetic`;

describe('parseQuestionDSL', () => {
  it('parses the stem as text items', () => {
    const parsed = parseQuestionDSL(SIMPLE_QUESTION);
    expect(parsed.stem).toEqual([{ type: 'text', value: 'What is 2 + 2?' }]);
  });

  it('parses a code block in the stem', () => {
    const dsl = [
      'What does this print?',
      '',
      '```python',
      'print(1 + 1)',
      '```',
      '',
      '+ 2',
      '    Explanation: Correct.',
      '- 11',
      '    Explanation: That is string concatenation.',
      '    Mistake: misconception',
      '',
      'Tags: AP CS P | output',
    ].join('\n');
    const parsed = parseQuestionDSL(dsl);
    expect(parsed.stem).toEqual([
      { type: 'text', value: 'What does this print?' },
      { type: 'code', value: 'print(1 + 1)', language: 'python' },
    ]);
  });

  it('parses each Option with correctness, text, explanation, and mistake category', () => {
    const parsed = parseQuestionDSL(SIMPLE_QUESTION);
    expect(parsed.options).toEqual([
      { text: '4', correct: true, explanation: 'Correct, 2 + 2 is 4.', mistakeCategory: null },
      { text: '5', correct: false, explanation: 'Off by one.', mistakeCategory: 'calculation error' },
      { text: '22', correct: false, explanation: "That's concatenation, not addition.", mistakeCategory: 'misconception' },
    ]);
  });

  it('parses the Tags line into className and topic', () => {
    const parsed = parseQuestionDSL(SIMPLE_QUESTION);
    expect(parsed.className).toBe('AP CS A');
    expect(parsed.topic).toBe('arithmetic');
  });

  it('wraps a multi-line Explanation onto a single joined string', () => {
    const dsl = [
      'Stem',
      '',
      '+ right',
      '    Explanation: This is correct',
      '    because of a longer reason',
      '    that wraps onto more lines.',
      '- wrong',
      '    Explanation: Nope.',
      '    Mistake: guessing',
      '',
      'Tags: Class | topic',
    ].join('\n');
    const parsed = parseQuestionDSL(dsl);
    expect(parsed.options[0].explanation).toBe('This is correct because of a longer reason that wraps onto more lines.');
  });

  it('returns an empty options array and null tags for stem-only input', () => {
    const parsed = parseQuestionDSL('Just a stem, nothing else.');
    expect(parsed.options).toEqual([]);
    expect(parsed.className).toBeNull();
    expect(parsed.topic).toBeNull();
  });
});

describe('generateQuestionDSLFromParsed', () => {
  it('round-trips a parsed question back into equivalent DSL text', () => {
    const parsed = parseQuestionDSL(SIMPLE_QUESTION);
    const regenerated = generateQuestionDSLFromParsed(parsed);
    const reparsed = parseQuestionDSL(regenerated);
    expect(reparsed).toEqual(parsed);
  });

  it('includes a code block with its language', () => {
    const parsed = {
      stem: [{ type: 'text', value: 'What prints?' }, { type: 'code', value: 'print(1)', language: 'python' }],
      options: [{ text: '1', correct: true, explanation: 'Yes.', mistakeCategory: null }],
      className: 'AP CS P',
      topic: 'output',
    };
    const dsl = generateQuestionDSLFromParsed(parsed);
    expect(dsl).toContain('```python');
    expect(dsl).toContain('print(1)');
  });
});
