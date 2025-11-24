# Formative Platform

A web app for students to see daily formative assignments.

## Adding Content

## DSL Design

- `# Title`: lesson title (starts with # and space)
- `---`: question separator (three dashes mark question boundaries)
- `\`\`\``: code block markers (three backticks to start/end code blocks)
- `\`inline code\``: Wrap inline code in backticks
- `>>> Title`: collapsible section (collapsed by default)
- `>>>! Title`: collapsible section (expanded by default)
- `>>>`: collapsible section without title (collapsed)
- `>>>!`: collapsible section without title (expanded)
- `<<<`: explicit closing marker for collapsible sections (optional)
- Raw text: Any line of text becomes content (no special prefix needed)

### Collapsible Sections

Collapsible sections can contain any content type (text, code blocks, lists, headings, and even nested collapsible sections). They are rendered as native HTML `<details>` elements.

**Closing collapsible sections**: Collapsible sections close automatically when:
- Another `>>>` or `>>>!` appears (starts a new section)
- A question separator `---` appears
- End of input is reached

You can also explicitly close a collapsible section using `<<<` for clarity, especially when you want regular content to follow:

Examples:

```markdown
>>> Hint: Click to reveal
This is hidden content that can contain:
- Lists
- Code blocks
- **Formatting**
<<<
Regular content that follows (not in collapsible)

>>>! Expanded Section
This section starts expanded.

>>> Nested Section
>>> Inner Section
Content here
<<<  ← Closes Inner Section
More nested content
<<<  ← Closes Nested Section
```

Note: `>>>` and `<<<` inside code blocks are treated as literal text, not collapsible markers.

## SOPs

### to run a dev version

1. CLI navigate to '/web' then run `npm run dev`

### to deploy: 

1. run `npm run build` to run the build script
1. in root, `firebase deploy`

## Testing

The project uses [Vitest](https://vitest.dev/) for unit testing. Tests are located in the `web/__tests__/` directory.

### Running Tests

From the `web/` directory:

- **Run tests in watch mode**: `npm test` or `npm run test`
- **Run tests once**: `npm run test:run`
- **Run tests with UI**: `npm run test:ui`
- **Run tests with coverage**: `npm run test:coverage`

### Test Structure

```
web/__tests__/
├── unit/              # Unit tests for individual modules
│   ├── dsl.test.js
│   ├── dsl-validation.test.js
│   ├── date-utils.test.js
│   ├── constants.test.js
│   ├── content-renderer.test.js
│   ├── database-utils.test.js
│   ├── notification-utils.test.js
│   ├── drag-drop-utils.test.js
│   ├── lesson-search.test.js
│   ├── error-ui-utils.test.js
│   ├── ui-components.test.js
│   └── parseMarkdown.test.js
├── integration/       # Integration tests for module interactions
│   ├── dsl-pipeline.test.js
│   ├── database-date-integration.test.js
│   └── content-render-database.test.js
└── helpers/          # Test utilities and mocks
    ├── mock-firebase.js
    ├── mock-firebase-module.js
    └── test-utils.js
```

### Writing Tests

Tests use Vitest's API which is similar to Jest:

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../my-module.js';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`. The project aims for:
- 70% minimum coverage for lines, functions, branches, and statements
- Higher coverage (80%+) for critical utility functions

**Current Test Count:** 201 tests across 15 test files
- Unit tests: 193 tests
- Integration tests: 8 tests

### CI/CD Integration

Tests automatically run on every push and pull request via GitHub Actions (`.github/workflows/test.yml`). The workflow:
- Runs tests on Node.js 18.x and 20.x
- Generates coverage reports
- Uploads coverage artifacts for review

To view test results, check the "Actions" tab in your GitHub repository.

### Mocking

- **Firebase**: Firebase Realtime Database functions are mocked in tests. See `__tests__/helpers/mock-firebase.js` for utilities.
- **DOM**: Tests use jsdom environment for DOM manipulation testing.
- **Timers**: Use Vitest's fake timers for testing time-dependent code.

### Test Files

Each module has a corresponding test file:
- Pure utility functions (dsl.js, constants.js) - Direct unit tests
- DOM-dependent (content-renderer.js, notification-utils.js) - jsdom environment
- Database-dependent (database-utils.js) - Mocked Firebase
- Date utilities (date-utils.js) - Mocked database calls