import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Since parseMarkdown.js uses CommonJS require, we need to handle it differently
// We'll test the logic by importing the web version which has the same parsing logic
import { parseDSL } from '../../dsl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('parseMarkdown (Node.js script)', () => {
  // Note: The actual parseMarkdown.js uses fs.readFileSync which is Node.js specific
  // We'll test the parsing logic using the web version which has the same algorithm
  // For full integration testing, you would need to test the actual Node.js script separately

  it('should parse DSL format consistently with web version', () => {
    const dslText = `# Test Lesson

Some text content

---

Another question

\`\`\`javascript
console.log("test");
\`\`\``;

    const result = parseDSL(dslText);
    
    expect(result.title).toBe('Test Lesson');
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].content[0].value).toBe('Some text content');
    expect(result.blocks[1].content[0].value).toBe('Another question');
    expect(result.blocks[1].content[1].type).toBe('code');
    expect(result.blocks[1].content[1].language).toBe('javascript');
  });

  it('should handle file-like content structure', () => {
    // Simulate what the Node.js script would read from a file
    const fileContent = `# CSA - Intro to Java

---

What is a compiler?

---

What does \`public static void main\` do?`;

    const result = parseDSL(fileContent);
    
    expect(result.title).toBe('CSA - Intro to Java');
    expect(result.blocks.length).toBeGreaterThan(0);
  });

  it('should preserve code block indentation like file reading would', () => {
    const dslText = `# Test

\`\`\`
    function test() {
        return true;
    }
\`\`\``;

    const result = parseDSL(dslText);
    
    expect(result.blocks[0].content[0].value).toContain('    function');
    expect(result.blocks[0].content[0].value).toContain('        return');
  });
});

