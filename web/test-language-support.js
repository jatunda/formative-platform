// Quick test of the new DSL language support
import { parseDSL, generateDSLFromContent } from './dsl.js';

// Test input with various language specifications
const testDSL = `# Programming Examples

This is some text before code.

\`\`\`javascript
console.log("Hello, World!");
\`\`\`

More text here.

\`\`\`
// Plain code block
const x = 42;
\`\`\`

---

\`\`\`python
print("Hello from Python")
\`\`\`

\`\`\` java
System.out.println("Java with space");
\`\`\``;

console.log('Testing DSL parser with language support...');
console.log('Input DSL:');
console.log(testDSL);
console.log('\\n=================\\n');

const parsed = parseDSL(testDSL);
console.log('Parsed result:');
console.log(JSON.stringify(parsed, null, 2));
console.log('\\n=================\\n');

const regenerated = generateDSLFromContent(parsed);
console.log('Regenerated DSL:');
console.log(regenerated);
