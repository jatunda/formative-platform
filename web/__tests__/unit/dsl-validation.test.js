import { describe, it, expect } from 'vitest';
import { validateDSL, getErrorExplanation } from '../../dsl-validation.js';
import { parseDSL } from '../../dsl.js';

describe('validateDSL', () => {
  it('should return null for valid DSL with title and content', () => {
    const dsl = `# My Lesson

Some content here`;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBeNull();
  });

  it('should return error for invalid parsed object', () => {
    const dsl = `# My Lesson`;
    const result = validateDSL(dsl, null);
    expect(result).toBe('Parser returned invalid data');
  });

  it('should return error for empty content', () => {
    const dsl = '';
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBe('Content is empty');
  });

  it('should return error for missing title', () => {
    const dsl = `Some content without title`;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBe('Missing title - content should start with "# Title"');
  });

  it('should return error for empty title', () => {
    const dsl = `# 

Some content`;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBe('Missing title - content should start with "# Title"');
  });

  it('should return error for no content blocks', () => {
    const dsl = `# Title Only`;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBe('No content blocks found - add some text or questions after the title');
  });

  it('should return error for unmatched code blocks', () => {
    const dsl = `# My Lesson

Some text

\`\`\`
unclosed code block`;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBe('Unmatched code block - every ``` opening must have a closing ```');
  });

  it('should return error for empty blocks', () => {
    const dsl = `# My Lesson

---

Some content`;
    const parsed = parseDSL(dsl);
    // The parser filters empty blocks, so we need to test with actual empty content scenario
    const emptyParsed = { title: 'My Lesson', blocks: [] };
    const result = validateDSL(dsl, emptyParsed);
    expect(result).toBe('No content blocks found - add some text or questions after the title');
  });

  it('should accept valid DSL with code blocks', () => {
    const dsl = `# My Lesson

\`\`\`javascript
console.log("test");
\`\`\``;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBeNull();
  });

  it('should accept valid DSL with multiple questions', () => {
    const dsl = `# My Lesson

First question

---

Second question`;
    const parsed = parseDSL(dsl);
    const result = validateDSL(dsl, parsed);
    expect(result).toBeNull();
  });
});

describe('getErrorExplanation', () => {
  it('should generate error explanation for missing title', () => {
    const error = new Error('Missing title');
    const dsl = `Some content without title`;
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('Missing or invalid title');
    expect(result).toContain('Start your content with a title line');
    expect(result).toContain('# My Lesson Title');
  });

  it('should generate error explanation for empty content', () => {
    const error = new Error('Empty content');
    const dsl = '';
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('Empty or invalid content');
  });

  it('should generate error explanation for unmatched code blocks', () => {
    const error = new Error('Unmatched code block');
    const dsl = `# My Lesson

\`\`\`
unclosed code`;
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('Unmatched code block markers');
    expect(result).toContain('Each code block must start and end');
  });

  it('should generate error explanation for invalid structure', () => {
    const error = new Error('Invalid structure');
    const dsl = `# Title`;
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('Invalid content structure');
  });

  it('should include DSL format reminder', () => {
    const error = new Error('Some error');
    const dsl = `# Test`;
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('DSL Format Reminder');
    expect(result).toContain('Start with a title');
    expect(result).toContain('Separate questions with');
  });

  it('should detect language specification on closing code block', () => {
    const error = new Error('Invalid code block');
    const dsl = `# My Lesson

\`\`\`java
System.out.println("test");
\`\`\`java`;
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('Language specification on closing code block');
  });

  it('should handle error without message', () => {
    const error = { toString: () => 'Error occurred' };
    const dsl = `# Test`;
    const result = getErrorExplanation(error, dsl);
    expect(result).toContain('Error occurred');
  });
});

