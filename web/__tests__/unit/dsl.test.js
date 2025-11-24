import { describe, it, expect } from 'vitest';
import { parseDSL, generateDSLFromContent } from '../../dsl.js';

describe('parseDSL', () => {
  it('should parse a simple title', () => {
    const dsl = '# My Lesson Title';
    const result = parseDSL(dsl);
    expect(result.title).toBe('My Lesson Title');
    expect(result.blocks).toEqual([]);
  });

  it('should parse title with text content', () => {
    const dsl = `# My Lesson Title

Some text content here`;
    const result = parseDSL(dsl);
    expect(result.title).toBe('My Lesson Title');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe('question');
    expect(result.blocks[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[0].value).toBe('Some text content here');
  });

  it('should parse multiple questions separated by ---', () => {
    const dsl = `# My Lesson

First question text

---

Second question text`;
    const result = parseDSL(dsl);
    expect(result.title).toBe('My Lesson');
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].content[0].value).toBe('First question text');
    expect(result.blocks[1].content[0].value).toBe('Second question text');
  });

  it('should parse code blocks without language', () => {
    const dsl = `# My Lesson

\`\`\`
console.log("Hello");
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('code');
    expect(result.blocks[0].content[0].value).toBe('console.log("Hello");');
    expect(result.blocks[0].content[0].language).toBeUndefined();
  });

  it('should parse code blocks with language', () => {
    const dsl = `# My Lesson

\`\`\`javascript
console.log("Hello");
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].type).toBe('code');
    expect(result.blocks[0].content[0].language).toBe('javascript');
    expect(result.blocks[0].content[0].value).toBe('console.log("Hello");');
  });

  it('should parse code blocks with language and space', () => {
    const dsl = `# My Lesson

\`\`\` java
public class Test {}
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].language).toBe('java');
  });

  it('should parse mixed text and code blocks', () => {
    const dsl = `# My Lesson

Some text here

\`\`\`javascript
const x = 5;
\`\`\`

More text after code`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content).toHaveLength(3);
    expect(result.blocks[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[1].type).toBe('code');
    expect(result.blocks[0].content[2].type).toBe('text');
  });

  it('should preserve indentation in code blocks', () => {
    const dsl = `# My Lesson

\`\`\`
    function test() {
        return true;
    }
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].value).toContain('    function');
    expect(result.blocks[0].content[0].value).toContain('        return');
  });

  it('should handle empty input', () => {
    const result = parseDSL('');
    expect(result.title).toBe('');
    expect(result.blocks).toEqual([]);
  });

  it('should handle title only with no content', () => {
    const result = parseDSL('# Title Only');
    expect(result.title).toBe('Title Only');
    expect(result.blocks).toEqual([]);
  });

  it('should filter out empty blocks', () => {
    const dsl = `# My Lesson

---

Some content`;
    const result = parseDSL(dsl);
    // Should only have one block with content, not the empty one before separator
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.every(block => block.content.length > 0)).toBe(true);
  });

  it('should handle multiple code blocks in one question', () => {
    const dsl = `# My Lesson

\`\`\`javascript
const a = 1;
\`\`\`

\`\`\`python
x = 2
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content).toHaveLength(2);
    expect(result.blocks[0].content[0].language).toBe('javascript');
    expect(result.blocks[0].content[1].language).toBe('python');
  });

  it('should handle questions with only code blocks', () => {
    const dsl = `# My Lesson

---

\`\`\`java
System.out.println("Hello");
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('code');
  });

  it('should parse >>> collapsed section with title', () => {
    const dsl = `# My Lesson

>>> Hint Section
This is hidden content
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('Hint Section');
    expect(result.blocks[0].content[0].expanded).toBe(false);
    expect(result.blocks[0].content[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[0].content[0].value).toBe('This is hidden content');
  });

  it('should parse >>>! expanded section with title', () => {
    const dsl = `# My Lesson

>>>! Expanded Section
This is visible content
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('Expanded Section');
    expect(result.blocks[0].content[0].expanded).toBe(true);
  });

  it('should parse >>> without title (collapsed, no title)', () => {
    const dsl = `# My Lesson

>>>
Hidden content here
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('');
    expect(result.blocks[0].content[0].expanded).toBe(false);
  });

  it('should parse >>>! without title (expanded, no title)', () => {
    const dsl = `# My Lesson

>>>!
Visible content here
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('');
    expect(result.blocks[0].content[0].expanded).toBe(true);
  });

  it('should parse nested collapsible sections', () => {
    // Consecutive top-level >>> are nested (not siblings)
    const dsl = `# My Lesson

>>> Outer Section
Some outer content
>>> Inner Section
Some inner content
<<<
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('Outer Section');
    expect(result.blocks[0].content[0].content).toHaveLength(2);
    expect(result.blocks[0].content[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[0].content[0].value).toBe('Some outer content');
    expect(result.blocks[0].content[0].content[1].type).toBe('collapsible');
    expect(result.blocks[0].content[0].content[1].title).toBe('Inner Section');
  });

  it('should parse collapsible with text content', () => {
    const dsl = `# My Lesson

>>> Section
First line
Second line
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].content).toHaveLength(2);
    expect(result.blocks[0].content[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[0].content[1].type).toBe('text');
  });

  it('should parse collapsible with code blocks', () => {
    const dsl = `# My Lesson

>>> Code Section
\`\`\`javascript
console.log("test");
\`\`\`
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].content[0].type).toBe('code');
    expect(result.blocks[0].content[0].content[0].language).toBe('javascript');
  });

  it('should parse >>> inside code block as literal text', () => {
    const dsl = `# My Lesson

\`\`\`
>>> This should be literal text
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].type).toBe('code');
    expect(result.blocks[0].content[0].value).toContain('>>>');
    expect(result.blocks[0].content[0].value).toContain('This should be literal text');
  });

  it('should parse multiple consecutive collapsible sections as nested', () => {
    // Consecutive top-level >>> are nested, not siblings
    const dsl = `# My Lesson

>>> First Section
Content 1
>>> Second Section
Content 2
<<<
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('First Section');
    expect(result.blocks[0].content[0].content).toHaveLength(2);
    expect(result.blocks[0].content[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[0].content[0].value).toBe('Content 1');
    expect(result.blocks[0].content[0].content[1].type).toBe('collapsible');
    expect(result.blocks[0].content[0].content[1].title).toBe('Second Section');
  });

  it('should parse collapsible section immediately after question separator', () => {
    const dsl = `# My Lesson

---

>>> Section After Separator
Content here
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('Section After Separator');
  });

  it('should parse <<< closing marker for collapsible sections', () => {
    const dsl = `# My Lesson

>>> Hint Section
Hidden content
<<<
Regular content after collapsible`;
    const result = parseDSL(dsl);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].content).toHaveLength(2);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('Hint Section');
    expect(result.blocks[0].content[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].content[0].value).toBe('Hidden content');
    // Regular content should be outside the collapsible
    expect(result.blocks[0].content[1].type).toBe('text');
    expect(result.blocks[0].content[1].value).toBe('Regular content after collapsible');
  });

  it('should parse <<< inside code block as literal text', () => {
    const dsl = `# My Lesson

\`\`\`
<<< This should be literal text
\`\`\``;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content[0].type).toBe('code');
    expect(result.blocks[0].content[0].value).toContain('<<<');
    expect(result.blocks[0].content[0].value).toContain('This should be literal text');
  });

  it('should handle nested collapsibles with explicit closing', () => {
    // Consecutive top-level >>> are nested
    const dsl = `# My Lesson

>>> Outer Section
Outer content
>>> Inner Section
Inner content
<<<
More outer content
<<<`;
    const result = parseDSL(dsl);
    expect(result.blocks[0].content).toHaveLength(1);
    expect(result.blocks[0].content[0].type).toBe('collapsible');
    expect(result.blocks[0].content[0].title).toBe('Outer Section');
    expect(result.blocks[0].content[0].content).toHaveLength(3);
    expect(result.blocks[0].content[0].content[0].type).toBe('text');
    expect(result.blocks[0].content[0].content[0].value).toBe('Outer content');
    expect(result.blocks[0].content[0].content[1].type).toBe('collapsible');
    expect(result.blocks[0].content[0].content[1].title).toBe('Inner Section');
    expect(result.blocks[0].content[0].content[2].type).toBe('text');
    expect(result.blocks[0].content[0].content[2].value).toBe('More outer content');
  });

  it('should throw error for unclosed collapsible section', () => {
    const dsl = `# My Lesson

>>> Unclosed Section
Some content`;
    expect(() => parseDSL(dsl)).toThrow('Unclosed collapsible section');
  });

  it('should throw error for multiple unclosed collapsible sections', () => {
    const dsl = `# My Lesson

>>> First Section
Content 1
>>> Second Section
Content 2`;
    expect(() => parseDSL(dsl)).toThrow('Unclosed collapsible section');
  });

  it('should throw error for unclosed collapsible before question separator', () => {
    const dsl = `# My Lesson

>>> Unclosed Section
Content
---
Next question`;
    expect(() => parseDSL(dsl)).toThrow('Unclosed collapsible section');
  });
});

describe('generateDSLFromContent', () => {
  it('should generate DSL from simple content', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'text', value: 'Some text' }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('# My Lesson');
    expect(result).toContain('Some text');
  });

  it('should generate DSL with code blocks', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'code', value: 'console.log("test");', language: 'javascript' }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('```javascript');
    expect(result).toContain('console.log("test");');
    expect(result).toContain('```');
  });

  it('should generate DSL with code blocks without language', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            { type: 'code', value: 'plain code' }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('```');
    expect(result).not.toContain('```javascript');
  });

  it('should generate DSL with multiple questions', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [{ type: 'text', value: 'First question' }]
        },
        {
          type: 'question',
          content: [{ type: 'text', value: 'Second question' }]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('First question');
    expect(result).toContain('---');
    expect(result).toContain('Second question');
  });

  it('should not add separator before first question', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [{ type: 'text', value: 'First' }]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    const lines = result.split('\n');
    expect(lines[0]).toBe('# My Lesson');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('First');
  });

  it('should filter out empty blocks', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: []
        },
        {
          type: 'question',
          content: [{ type: 'text', value: 'Valid content' }]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('Valid content');
    expect(result).not.toContain('---');
  });

  it('should handle content without title', () => {
    const content = {
      title: '',
      blocks: [
        {
          type: 'question',
          content: [{ type: 'text', value: 'Content' }]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('Content');
    expect(result).not.toContain('#');
  });

  it('should generate DSL from content with collapsible sections', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Hint Section',
              expanded: false,
              content: [
                { type: 'text', value: 'Hidden content' }
              ]
            }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('>>> Hint Section');
    expect(result).toContain('Hidden content');
    expect(result).not.toContain('>>>!');
  });

  it('should generate DSL from expanded collapsible sections', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Expanded Section',
              expanded: true,
              content: [
                { type: 'text', value: 'Visible content' }
              ]
            }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('>>>! Expanded Section');
  });

  it('should generate DSL from collapsible sections without title', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: '',
              expanded: false,
              content: [
                { type: 'text', value: 'Content' }
              ]
            }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('>>>');
    // Should not have space after >>>
    const lines = result.split('\n');
    const collapsibleLine = lines.find(l => l.startsWith('>>>'));
    expect(collapsibleLine).toBe('>>>');
  });

  it('should generate DSL with nested collapsibles', () => {
    const content = {
      title: 'My Lesson',
      blocks: [
        {
          type: 'question',
          content: [
            {
              type: 'collapsible',
              title: 'Outer',
              expanded: false,
              content: [
                { type: 'text', value: 'Outer content' },
                {
                  type: 'collapsible',
                  title: 'Inner',
                  expanded: false,
                  content: [
                    { type: 'text', value: 'Inner content' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    const result = generateDSLFromContent(content);
    expect(result).toContain('>>> Outer');
    expect(result).toContain('>>> Inner');
    expect(result).toContain('Outer content');
    expect(result).toContain('Inner content');
  });
});

describe('parseDSL and generateDSLFromContent round-trip', () => {
  it('should maintain consistency through parse -> generate -> parse', () => {
    const originalDSL = `# Test Lesson

First question text

\`\`\`javascript
const x = 5;
\`\`\`

---

Second question

\`\`\`java
System.out.println("test");
\`\`\`

More text`;
    
    const parsed1 = parseDSL(originalDSL);
    const generated = generateDSLFromContent(parsed1);
    const parsed2 = parseDSL(generated);
    
    expect(parsed2.title).toBe(parsed1.title);
    expect(parsed2.blocks.length).toBe(parsed1.blocks.length);
    
    // Check that content is preserved (allowing for formatting differences)
    expect(parsed2.blocks[0].content.some(c => c.value.includes('First question'))).toBe(true);
    expect(parsed2.blocks[1].content.some(c => c.value.includes('Second question'))).toBe(true);
  });
});

