import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQueryParams,
  updatePreview,
  computeTabIndent,
  computeSmartBackspace,
  computeAutoIndentNewline,
  handleDslInputKeydown,
  setEditingEnabled,
  saveLesson,
  duplicateLesson,
  deleteLesson,
  loadExistingContentList,
  loadContent,
  handleNewLessonContext,
  handleExistingPageContext,
} from '../../editor.js';

// firebase-app.js and firebase-database.js both alias to this same mock
// module (see vitest.config.js) since editor.js pulls in firebase-config.js.
const mockData = {};
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  initializeApp: () => ({}),
  getDatabase: () => ({}),
  ref: (db, path) => ({ path }),
  get: async (ref) => {
    const value = mockData[ref.path];
    return { exists: () => value !== undefined, val: () => value };
  },
  set: vi.fn(async (ref, value) => { mockData[ref.path] = value; }),
  remove: vi.fn(async (ref) => { delete mockData[ref.path]; }),
  child: (ref, path) => ({ path: `${ref.path ?? ''}${path}` }),
}));

const mockParseDSL = vi.fn((text) => ({ title: 'Parsed Title', blocks: [] }));
const mockGenerateDSLFromContent = vi.fn((content) => `# ${content.title}`);
vi.mock('../../dsl.js', () => ({
  parseDSL: (...args) => mockParseDSL(...args),
  generateDSLFromContent: (...args) => mockGenerateDSLFromContent(...args),
}));

const mockValidateDSL = vi.fn(() => null);
const mockGetErrorExplanation = vi.fn((err) => `<p>error: ${err.message}</p>`);
vi.mock('../../dsl-validation.js', () => ({
  validateDSL: (...args) => mockValidateDSL(...args),
  getErrorExplanation: (...args) => mockGetErrorExplanation(...args),
}));

vi.mock('../../lesson-search.js', () => ({
  initializeLessonSearch: vi.fn(),
  showLessonSearchPopup: vi.fn(),
}));

const mockRenderContent = vi.fn((parsed, el) => { el.textContent = `rendered:${parsed.title}`; });
vi.mock('../../content-renderer.js', () => ({
  renderContent: (...args) => mockRenderContent(...args),
}));

vi.mock('../../ai-generator.js', () => ({
  AIQuestionGenerator: vi.fn(),
}));

const mockGenerateUniqueHash = vi.fn(async () => 'newhash123');
vi.mock('../../database-utils.js', () => ({
  initializeDatabase: vi.fn(),
  generateUniqueHash: (...args) => mockGenerateUniqueHash(...args),
}));

vi.mock('../../teacher-nav.js', () => ({
  renderTeacherNav: vi.fn(),
}));

vi.mock('../../ai-config.js', () => ({
  AI_CONFIG: { ANTHROPIC_API_KEY: 'test-key' },
  validateConfig: vi.fn(),
}));

vi.mock('../../notification-utils.js', () => ({
  showNotification: vi.fn(),
}));

global.alert = vi.fn();
global.confirm = vi.fn(() => true);

describe('editor', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockData)) delete mockData[key];
    vi.clearAllMocks();
    mockParseDSL.mockReturnValue({ title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
    mockValidateDSL.mockReturnValue(null);
    global.confirm.mockReturnValue(true);
  });

  describe('getQueryParams', () => {
    it('parses key=value pairs from the URL', () => {
      const original = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...original, search: '?page=abc123&new=1' },
        writable: true,
        configurable: true,
      });
      expect(getQueryParams()).toEqual({ page: 'abc123', new: '1' });
      Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true });
    });
  });

  describe('updatePreview', () => {
    it('renders valid content', () => {
      mockValidateDSL.mockReturnValue(null);
      const preview = document.createElement('div');
      updatePreview('# Title', preview);
      expect(preview.textContent).toBe('rendered:Parsed Title');
    });

    it('shows the error explanation when validation fails', () => {
      mockValidateDSL.mockReturnValue('Missing title');
      const preview = document.createElement('div');
      updatePreview('bad text', preview);
      expect(preview.innerHTML).toContain('Missing title');
    });

    it('shows the error explanation when parsing throws', () => {
      mockParseDSL.mockImplementation(() => { throw new Error('parse exploded'); });
      const preview = document.createElement('div');
      updatePreview('bad text', preview);
      expect(preview.innerHTML).toContain('parse exploded');
    });
  });

  describe('computeTabIndent', () => {
    it('inserts 4 spaces at the cursor', () => {
      const result = computeTabIndent('abcdef', 3, 3);
      expect(result).toEqual({ value: 'abc    def', cursor: 7 });
    });

    it('replaces a selection with 4 spaces', () => {
      const result = computeTabIndent('abcdef', 1, 4);
      expect(result).toEqual({ value: 'a    ef', cursor: 5 });
    });
  });

  describe('computeSmartBackspace', () => {
    it('deletes back to the previous multiple-of-4 indent level', () => {
      // 8 spaces of indent, cursor at the end of them
      const value = '        ';
      const result = computeSmartBackspace(value, 8, 8);
      expect(result).toEqual({ value: '    ', cursor: 4 });
    });

    it('deletes only the partial indent (6 spaces -> 4), not a full level', () => {
      const value = '      '; // 6 spaces
      const result = computeSmartBackspace(value, 6, 6);
      expect(result).toEqual({ value: '    ', cursor: 4 }); // 6 % 4 = 2 spaces deleted
    });

    it('returns null when there is a selection', () => {
      expect(computeSmartBackspace('    text', 2, 4)).toBeNull();
    });

    it('returns null at the very start of the text', () => {
      expect(computeSmartBackspace('text', 0, 0)).toBeNull();
    });

    it('returns null when the text before the cursor on this line is not all spaces', () => {
      expect(computeSmartBackspace('  abc', 5, 5)).toBeNull();
    });

    it('returns null when there is less than one indent level of spaces', () => {
      expect(computeSmartBackspace('  ', 2, 2)).toBeNull();
    });

    it('only considers the current line, not earlier lines', () => {
      const value = 'line one\n    ';
      const result = computeSmartBackspace(value, value.length, value.length);
      expect(result.value).toBe('line one\n');
    });
  });

  describe('computeAutoIndentNewline', () => {
    it("carries the current line's indentation onto the new line", () => {
      const value = '    some text';
      const result = computeAutoIndentNewline(value, value.length, value.length);
      expect(result.value).toBe('    some text\n    ');
      expect(result.cursor).toBe(value.length + 1 + 4);
    });

    it('returns null when the current line has no leading whitespace', () => {
      expect(computeAutoIndentNewline('some text', 9, 9)).toBeNull();
    });

    it('returns null when there is a selection', () => {
      expect(computeAutoIndentNewline('    some text', 2, 5)).toBeNull();
    });
  });

  describe('handleDslInputKeydown', () => {
    function makeTextarea(value, cursor) {
      const el = document.createElement('textarea');
      document.body.appendChild(el);
      el.value = value;
      el.selectionStart = el.selectionEnd = cursor;
      return el;
    }

    it('applies Tab indentation and dispatches an input event', () => {
      const el = makeTextarea('abc', 3);
      let inputFired = false;
      el.addEventListener('input', () => { inputFired = true; });
      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });

      handleDslInputKeydown(event, el);

      expect(el.value).toBe('abc    ');
      expect(event.defaultPrevented).toBe(true);
      expect(inputFired).toBe(true);
    });

    it('applies smart Backspace when it applies', () => {
      const el = makeTextarea('        ', 8);
      const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });

      handleDslInputKeydown(event, el);

      expect(el.value).toBe('    ');
      expect(event.defaultPrevented).toBe(true);
    });

    it('leaves normal Backspace alone when smart backspace does not apply', () => {
      const el = makeTextarea('abc', 3);
      const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });

      handleDslInputKeydown(event, el);

      expect(el.value).toBe('abc'); // unchanged - browser's default backspace would handle it
      expect(event.defaultPrevented).toBe(false);
    });

    it('auto-indents on Enter when the current line is indented', () => {
      const el = makeTextarea('    text', 8);
      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

      handleDslInputKeydown(event, el);

      expect(el.value).toBe('    text\n    ');
      expect(event.defaultPrevented).toBe(true);
    });

    it('ignores other keys', () => {
      const el = makeTextarea('abc', 3);
      const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });

      handleDslInputKeydown(event, el);

      expect(el.value).toBe('abc');
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('setEditingEnabled', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <textarea id="dslInput"></textarea>
        <button id="saveBtn"></button>
        <button id="duplicateBtn"></button>
        <button id="deleteBtn"></button>
      `;
    });

    it('disables the input and buttons, with a placeholder hint', () => {
      setEditingEnabled(false);
      expect(document.getElementById('dslInput').disabled).toBe(true);
      expect(document.getElementById('saveBtn').disabled).toBe(true);
      expect(document.getElementById('duplicateBtn').disabled).toBe(true);
      expect(document.getElementById('deleteBtn').disabled).toBe(true);
      expect(document.getElementById('dslInput').placeholder).toContain('Select a file');
    });

    it('enables the input and buttons, clearing the placeholder', () => {
      setEditingEnabled(true);
      expect(document.getElementById('dslInput').disabled).toBe(false);
      expect(document.getElementById('saveBtn').disabled).toBe(false);
      expect(document.getElementById('dslInput').placeholder).toBe('');
    });
  });

  describe('saveLesson', () => {
    it('saves the parsed content and shows a success notification', async () => {
      const { showNotification } = await import('../../notification-utils.js');
      mockParseDSL.mockReturnValue({ title: 'My Lesson', blocks: [{}] });

      await saveLesson('abc123', '# My Lesson');

      expect(mockData['content/abc123']).toEqual({ title: 'My Lesson', blocks: [{}] });
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('My Lesson'), 'success');
    });

    it('alerts and does not save when there is no content id', async () => {
      await saveLesson('', '# Title');
      expect(mockData['content/']).toBeUndefined();
      expect(alert).toHaveBeenCalledWith('No content ID available.');
    });

    it('alerts and does not save when parsing produced malformed content', async () => {
      mockParseDSL.mockReturnValue({ title: null, blocks: null });
      await saveLesson('abc123', 'garbage');
      expect(mockData['content/abc123']).toBeUndefined();
      expect(alert).toHaveBeenCalledWith('Parsing failed or content is malformed.');
    });
  });

  describe('duplicateLesson', () => {
    it('saves a copy under a new hash with "(Copy)" appended to the title', async () => {
      mockParseDSL.mockReturnValue({ title: 'Original', blocks: [{}] });

      const result = await duplicateLesson('abc123', '# Original');

      expect(result.newHash).toBe('newhash123');
      expect(result.duplicatedContent.title).toBe('Original (Copy)');
      expect(mockData['content/newhash123'].title).toBe('Original (Copy)');
    });

    it('returns null and alerts when there is no current content id', async () => {
      const result = await duplicateLesson('', '# Title');
      expect(result).toBeNull();
      expect(alert).toHaveBeenCalledWith('No content ID available.');
    });

    it('returns null and alerts when the current content is malformed', async () => {
      mockParseDSL.mockReturnValue({ title: null, blocks: null });
      const result = await duplicateLesson('abc123', 'garbage');
      expect(result).toBeNull();
    });

    it('returns null and alerts when parsing throws', async () => {
      mockParseDSL.mockImplementation(() => { throw new Error('boom'); });
      const result = await duplicateLesson('abc123', 'garbage');
      expect(result).toBeNull();
      expect(alert).toHaveBeenCalledWith('Cannot duplicate: Failed to parse current content.');
    });

    it('returns null and notifies on a save failure', async () => {
      mockParseDSL.mockReturnValue({ title: 'Original', blocks: [{}] });
      const { set } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js');
      const { showNotification } = await import('../../notification-utils.js');
      set.mockRejectedValueOnce(new Error('write failed'));

      const result = await duplicateLesson('abc123', '# Original');

      expect(result).toBeNull();
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    });
  });

  describe('deleteLesson', () => {
    it('deletes after confirmation and notifies success', async () => {
      mockData['content/abc123'] = { title: 'To Delete' };
      const { showNotification } = await import('../../notification-utils.js');

      const result = await deleteLesson('abc123', '# To Delete');

      expect(result).toBe(true);
      expect(mockData['content/abc123']).toBeUndefined();
      expect(showNotification).toHaveBeenCalledWith('Content deleted successfully!', 'success');
    });

    it('includes the parsed title in the confirmation prompt', async () => {
      mockParseDSL.mockReturnValue({ title: 'A Specific Title', blocks: [{}] });
      await deleteLesson('abc123', '# A Specific Title');
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('A Specific Title'));
    });

    it('does not delete when the teacher cancels the confirmation', async () => {
      mockData['content/abc123'] = { title: 'Keep Me' };
      global.confirm.mockReturnValue(false);

      const result = await deleteLesson('abc123', '# Keep Me');

      expect(result).toBe(false);
      expect(mockData['content/abc123']).toBeDefined();
    });

    it('alerts and does nothing when there is no content id', async () => {
      const result = await deleteLesson('', '# Title');
      expect(result).toBe(false);
      expect(alert).toHaveBeenCalledWith('No content ID available.');
    });

    it('falls back to the title from the database when the current DSL fails to parse', async () => {
      mockData['content/abc123/title'] = 'DB Title';
      mockParseDSL.mockImplementation(() => { throw new Error('bad dsl'); });

      await deleteLesson('abc123', 'garbage');

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('DB Title'));
    });
  });

  describe('loadExistingContentList', () => {
    it('populates the dropdown, sorted by id, with a leading placeholder option', async () => {
      mockData['content'] = {
        b: { title: 'Lesson B' },
        a: { title: 'Lesson A' },
      };
      const select = document.createElement('select');

      await loadExistingContentList(select);

      expect([...select.options].map((o) => o.textContent)).toEqual(['-- Select a lesson --', 'Lesson A', 'Lesson B']);
    });

    it('selects the given Lesson id, if present', async () => {
      mockData['content'] = { a: { title: 'Lesson A' }, b: { title: 'Lesson B' } };
      const select = document.createElement('select');

      await loadExistingContentList(select, 'b');

      expect(select.value).toBe('b');
    });

    it('leaves only the placeholder option when there is no content', async () => {
      const select = document.createElement('select');
      await loadExistingContentList(select);
      expect(select.options).toHaveLength(1);
    });
  });

  describe('loadContent', () => {
    it('loads and renders a found Lesson', async () => {
      mockData['content/abc123'] = { title: 'Found Lesson' };
      mockGenerateDSLFromContent.mockReturnValue('# Found Lesson');
      const dslInput = document.createElement('textarea');
      const preview = document.createElement('div');

      const found = await loadContent('abc123', dslInput, preview);

      expect(found).toBe(true);
      expect(dslInput.value).toBe('# Found Lesson');
    });

    it('alerts and returns false when the Lesson is not found', async () => {
      const dslInput = document.createElement('textarea');
      const preview = document.createElement('div');

      const found = await loadContent('missing', dslInput, preview);

      expect(found).toBe(false);
      expect(alert).toHaveBeenCalled();
      expect(dslInput.value).toBe('');
    });
  });

  describe('handleNewLessonContext', () => {
    it('seeds a blank Lesson and a fresh id when ?new=1', async () => {
      const contentIdEl = document.createElement('div');
      const dslInput = document.createElement('textarea');
      const preview = document.createElement('div');
      document.body.innerHTML = '<textarea id="dslInput"></textarea><button id="saveBtn"></button><button id="duplicateBtn"></button><button id="deleteBtn"></button>';

      await handleNewLessonContext({ new: '1' }, contentIdEl, document.getElementById('dslInput'), preview);

      expect(contentIdEl.textContent).toBe('newhash123');
      expect(document.getElementById('dslInput').disabled).toBe(false);
    });

    it('does nothing when ?new is not "1"', async () => {
      const contentIdEl = document.createElement('div');
      const dslInput = document.createElement('textarea');
      const preview = document.createElement('div');

      await handleNewLessonContext({}, contentIdEl, dslInput, preview);

      expect(contentIdEl.textContent).toBe('');
      expect(mockGenerateUniqueHash).not.toHaveBeenCalled();
    });
  });

  describe('handleExistingPageContext', () => {
    it('loads and enables editing for ?page=<id>', async () => {
      mockData['content/abc123'] = { title: 'Existing' };
      document.body.innerHTML = '<textarea id="dslInput"></textarea><button id="saveBtn"></button><button id="duplicateBtn"></button><button id="deleteBtn"></button>';
      const contentIdEl = document.createElement('div');
      const preview = document.createElement('div');

      await handleExistingPageContext({ page: 'abc123' }, contentIdEl, document.getElementById('dslInput'), preview);

      expect(contentIdEl.textContent).toBe('abc123');
      expect(document.getElementById('dslInput').disabled).toBe(false);
    });

    it('disables editing when there is no ?page', async () => {
      document.body.innerHTML = '<textarea id="dslInput"></textarea><button id="saveBtn"></button><button id="duplicateBtn"></button><button id="deleteBtn"></button>';
      const contentIdEl = document.createElement('div');
      const preview = document.createElement('div');

      await handleExistingPageContext({}, contentIdEl, document.getElementById('dslInput'), preview);

      expect(document.getElementById('dslInput').disabled).toBe(true);
    });
  });
});
