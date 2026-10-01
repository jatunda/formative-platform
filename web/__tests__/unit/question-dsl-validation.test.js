import { describe, it, expect } from 'vitest';
import { validateQuestionDSL } from '../../question-dsl-validation.js';
import { parseQuestionDSL } from '../../question-dsl.js';

const VALID_DSL = `What is 2 + 2?

+ 4
    Explanation: Correct.
- 5
    Explanation: Off by one.
    Mistake: calculation error

Tags: AP CS A | arithmetic`;

function parseAndValidate(dsl) {
  return validateQuestionDSL(dsl, parseQuestionDSL(dsl));
}

describe('validateQuestionDSL', () => {
  it('accepts a well-formed question', () => {
    expect(parseAndValidate(VALID_DSL)).toBeNull();
  });

  it('rejects empty content', () => {
    expect(validateQuestionDSL('', { stem: [], options: [] })).toMatch(/empty/i);
  });

  it('rejects a missing stem', () => {
    const dsl = '+ 4\n    Explanation: Correct.\n- 5\n    Explanation: Wrong.\n    Mistake: x\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/stem/i);
  });

  it('rejects fewer than two options', () => {
    const dsl = 'Stem\n\n+ only one\n    Explanation: Correct.\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/at least two/i);
  });

  it('rejects zero correct options', () => {
    const dsl = 'Stem\n\n- a\n    Explanation: e\n    Mistake: m\n- b\n    Explanation: e\n    Mistake: m\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/no correct option/i);
  });

  it('rejects more than one correct option', () => {
    const dsl = 'Stem\n\n+ a\n    Explanation: e\n+ b\n    Explanation: e\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/more than one/i);
  });

  it('rejects an option missing its Explanation', () => {
    const dsl = 'Stem\n\n+ a\n    Explanation: e\n- b\n    Mistake: m\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/explanation/i);
  });

  it('rejects a wrong option missing its Mistake category', () => {
    const dsl = 'Stem\n\n+ a\n    Explanation: e\n- b\n    Explanation: e\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/mistake/i);
  });

  it('rejects a missing Tags line', () => {
    const dsl = 'Stem\n\n+ a\n    Explanation: e\n- b\n    Explanation: e\n    Mistake: m';
    expect(parseAndValidate(dsl)).toMatch(/tags/i);
  });

  it('rejects a Tags line missing a topic', () => {
    const dsl = 'Stem\n\n+ a\n    Explanation: e\n- b\n    Explanation: e\n    Mistake: m\n\nTags: Class Name';
    expect(parseAndValidate(dsl)).toMatch(/topic/i);
  });

  it('rejects an unmatched code fence', () => {
    const dsl = 'Stem\n```python\nprint(1)\n\n+ a\n    Explanation: e\n- b\n    Explanation: e\n    Mistake: m\n\nTags: C | t';
    expect(parseAndValidate(dsl)).toMatch(/unmatched code block/i);
  });
});
