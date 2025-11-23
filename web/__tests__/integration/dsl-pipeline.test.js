import { describe, it, expect } from 'vitest';
import { parseDSL, generateDSLFromContent } from '../../dsl.js';
import { validateDSL } from '../../dsl-validation.js';
import { renderContent } from '../../content-renderer.js';

describe('DSL Pipeline Integration', () => {
  it('should handle complete parse → validate → render flow', () => {
    const dsl = `# Test Lesson

First question with some text

\`\`\`javascript
console.log("test");
\`\`\`

---

Second question

More text here`;

    // Step 1: Parse
    const parsed = parseDSL(dsl);
    expect(parsed.title).toBe('Test Lesson');
    expect(parsed.blocks.length).toBeGreaterThan(0);

    // Step 2: Validate
    const validationError = validateDSL(dsl, parsed);
    expect(validationError).toBeNull();

    // Step 3: Render
    const container = document.createElement('div');
    renderContent(parsed, container);
    
    expect(container.querySelector('.lesson-title')).toBeTruthy();
    expect(container.querySelectorAll('.lesson-text').length).toBeGreaterThan(0);
    expect(container.querySelector('.lesson-code')).toBeTruthy();
  });

  it('should handle invalid DSL through the pipeline', () => {
    const invalidDSL = `# Title Only`;
    
    const parsed = parseDSL(invalidDSL);
    const validationError = validateDSL(invalidDSL, parsed);
    
    expect(validationError).toBeTruthy();
    expect(validationError).toContain('No content blocks');
  });

  it('should maintain data integrity through parse → generate → parse cycle', () => {
    const originalDSL = `# Complex Lesson

Question 1 with **bold** text

\`\`\`java
public class Test {}
\`\`\`

---

Question 2 with \`inline code\`

\`\`\`python
print("hello")
\`\`\`

More content`;

    // Parse original
    const parsed1 = parseDSL(originalDSL);
    expect(parsed1.title).toBe('Complex Lesson');
    expect(parsed1.blocks.length).toBe(2);

    // Generate DSL from parsed
    const generated = generateDSLFromContent(parsed1);
    
    // Parse generated DSL
    const parsed2 = parseDSL(generated);
    
    // Verify structure is maintained
    expect(parsed2.title).toBe(parsed1.title);
    expect(parsed2.blocks.length).toBe(parsed1.blocks.length);
    
    // Verify code blocks are preserved
    const codeBlocks1 = parsed1.blocks.flatMap(b => b.content.filter(c => c.type === 'code'));
    const codeBlocks2 = parsed2.blocks.flatMap(b => b.content.filter(c => c.type === 'code'));
    expect(codeBlocks2.length).toBe(codeBlocks1.length);
  });

  it('should handle validation errors and still render what is valid', () => {
    const dsl = `# Valid Title

Some valid content

\`\`\`
unclosed code block`;

    const parsed = parseDSL(dsl);
    const validationError = validateDSL(dsl, parsed);
    
    // Should have validation error
    expect(validationError).toBeTruthy();
    
    // But should still be able to render what was parsed
    const container = document.createElement('div');
    renderContent(parsed, container);
    expect(container.querySelector('.lesson-title')).toBeTruthy();
  });
});

