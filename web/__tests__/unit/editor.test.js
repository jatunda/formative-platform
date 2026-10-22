import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQueryParams,
  updatePreview,
  computeTabIndent,
  computeSmartBackspace,
  computeAutoIndentNewline,
  computeInsertAtCursor,
  handleDslInputKeydown,
  setEditingEnabled,
  saveLesson,
  duplicateLesson,
  deleteLesson,
  deleteLessonConfirmMessage,
  loadExistingContentList,
  loadContent,
  handleNewLessonContext,
  handleExistingPageContext,
  updateUnsavedIndicator,
  confirmDiscardUnsavedChanges,
  handleBeforeUnload,
} from '../../editor.js';

import { createLessonStore } from '../../lesson-store.js';
import { createMockDatabase, mockStorePort } from '../helpers/mock-firebase.js';

// firebase-app.js and firebase-database.js both alias to this same mock
// module (see vitest.config.js) since editor.js pulls in firebase-config.js.
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  initializeApp: () => ({}),
  getDatabase: () => ({}),
  connectDatabaseEmulator: () => {},
}));

// The editor reaches Lessons only through the Lesson store, so the tests run
// the real store over the Firebase test double instead of mocking writes.
let db;
let lessons;
vi.mock('../../lesson-store.js', async (importOriginal) => ({
  ...(await importOriginal()),
  lessonStore: () => lessons,
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
  showLessonSearchPopup: vi.fn(),
}));

const mockRenderContent = vi.fn((parsed, el) => { el.textContent = `rendered:${parsed.title}`; });
vi.mock('../../content-renderer.js', () => ({
  renderContent: (...args) => mockRenderContent(...args),
}));

vi.mock('../../ai-generator.js', () => ({
  AIQuestionGenerator: vi.fn(),
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

vi.mock('../../question-database-utils.js', () => ({
}));

const mockMountQuestionEmbeds = vi.fn();
vi.mock('../../question-embed.js', () => ({
  mountQuestionEmbeds: (...args) => mockMountQuestionEmbeds(...args),
}));

const mockShowQuestionLinkPicker = vi.fn();
vi.mock('../../question-link-picker.js', () => ({
  showQuestionLinkPicker: (...args) => mockShowQuestionLinkPicker(...args),
}));

global.alert = vi.fn();
global.confirm = vi.fn(() => true);

describe('editor', () => {
  beforeEach(() => {
    db = createMockDatabase();
    lessons = createLessonStore(mockStorePort(db));
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

  describe('computeInsertAtCursor', () => {
    it('inserts text at the cursor with no selection', () => {
      const result = computeInsertAtCursor('abcdef', 3, 3, '[[link]]');
      expect(result).toEqual({ value: 'abc[[link]]def', cursor: 11 });
    });

    it('replaces a selection with the inserted text', () => {
      const result = computeInsertAtCursor('abcdef', 1, 4, '[[link]]');
      expect(result).toEqual({ value: 'a[[link]]ef', cursor: 9 });
    });

    it('inserts at the end when the cursor is at the end of the text', () => {
      const result = computeInsertAtCursor('abc', 3, 3, '!');
      expect(result).toEqual({ value: 'abc!', cursor: 4 });
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
    it('saves the parsed Lesson, shows a success notification, and reports success', async () => {
      const { showNotification } = await import('../../notification-utils.js');
      mockParseDSL.mockReturnValue({ title: 'My Lesson', blocks: [{}] });

      const result = await saveLesson('abc123', '# My Lesson');

      expect(await lessons.get('abc123')).toEqual({ title: 'My Lesson', blocks: [{}] });
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('My Lesson'), 'success');
      expect(result).toBe(true);
    });

    it('alerts, does not save, and reports failure when there is no Lesson id', async () => {
      const result = await saveLesson('', '# Title');
      expect(await lessons.listTitles()).toEqual({});
      expect(alert).toHaveBeenCalledWith('No content ID available.');
      expect(result).toBe(false);
    });

    it('alerts, does not save, and reports failure when parsing produced a malformed Lesson', async () => {
      mockParseDSL.mockReturnValue({ title: null, blocks: null });
      const result = await saveLesson('abc123', 'garbage');
      expect(await lessons.get('abc123')).toBeNull();
      expect(alert).toHaveBeenCalledWith('Parsing failed or content is malformed.');
      expect(result).toBe(false);
    });
  });

  describe('duplicateLesson', () => {
    it('saves a copy under a new id with "(Copy)" appended to the title', async () => {
      mockParseDSL.mockReturnValue({ title: 'Original', blocks: [{}] });

      const result = await duplicateLesson('abc123', '# Original');

      expect(result.duplicatedContent.title).toBe('Original (Copy)');
      expect(await lessons.get(result.newHash)).toEqual({ title: 'Original (Copy)', blocks: [{}] });
      expect(alert).toHaveBeenCalledWith(expect.stringContaining(result.newHash));
    });

    it('returns null and alerts when there is no current Lesson id', async () => {
      const result = await duplicateLesson('', '# Title');
      expect(result).toBeNull();
      expect(alert).toHaveBeenCalledWith('No content ID available.');
    });

    it('returns null and alerts when the current Lesson is malformed', async () => {
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
      lessons = createLessonStore({ ...mockStorePort(db), update: async () => { throw new Error('write failed'); } });
      const { showNotification } = await import('../../notification-utils.js');

      const result = await duplicateLesson('abc123', '# Original');

      expect(result).toBeNull();
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    });
  });

  describe('deleteLessonConfirmMessage', () => {
    it('names each Class and Day Index that will lose the Lesson', () => {
      const message = deleteLessonConfirmMessage('Fractions', 'abc123', [
        { classId: 'p1', className: 'Period 1', dayIndices: [3, 7] },
        { classId: 'p2', className: 'Period 2', dayIndices: [0] },
      ]);
      expect(message).toBe(
        'Are you sure you want to delete the lesson "Fractions"?\n\n' +
        'It will also be removed from these Schedules:\n' +
        '  - Period 1: Day Index 3, 7\n' +
        '  - Period 2: Day Index 0\n\n' +
        'Lesson ID: abc123\nThis action cannot be undone.'
      );
    });

    it('says so when no Schedule uses the Lesson', () => {
      expect(deleteLessonConfirmMessage('Fractions', 'abc123', [])).toBe(
        'Are you sure you want to delete the lesson "Fractions"?\n\n' +
        "No Class's Schedule uses it.\n\n" +
        'Lesson ID: abc123\nThis action cannot be undone.'
      );
    });
  });

  describe('deleteLesson', () => {
    beforeEach(() => {
      db.reset({
        content: { abc123: { title: 'To Delete' }, other: { title: 'Other' } },
        classes: { p1: { name: 'Period 1' } },
        schedule: { p1: { 2: ['abc123', 'other'] } },
      });
    });

    it('warns which Schedules use the Lesson, then deletes it from them too', async () => {
      const { showNotification } = await import('../../notification-utils.js');
      mockParseDSL.mockReturnValue({ title: 'To Delete', blocks: [{}] });

      const result = await deleteLesson('abc123', '# To Delete');

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('  - Period 1: Day Index 2'));
      expect(result).toBe(true);
      expect(await lessons.get('abc123')).toBeNull();
      expect(await lessons.findScheduleUses('abc123')).toEqual([]);
      expect(await lessons.findScheduleUses('other')).toEqual([{ classId: 'p1', className: 'Period 1', dayIndices: [2] }]);
      expect(showNotification).toHaveBeenCalledWith('Lesson deleted.', 'success');
    });

    it('includes the parsed title in the confirmation prompt', async () => {
      mockParseDSL.mockReturnValue({ title: 'A Specific Title', blocks: [{}] });
      await deleteLesson('abc123', '# A Specific Title');
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('"A Specific Title"'));
    });

    it('does not delete when the teacher cancels the confirmation', async () => {
      global.confirm.mockReturnValue(false);

      const result = await deleteLesson('abc123', '# To Delete');

      expect(result).toBe(false);
      expect(await lessons.get('abc123')).toEqual({ title: 'To Delete' });
      expect(await lessons.findScheduleUses('abc123')).toHaveLength(1);
    });

    it('alerts and does nothing when there is no Lesson id', async () => {
      const result = await deleteLesson('', '# Title');
      expect(result).toBe(false);
      expect(alert).toHaveBeenCalledWith('No content ID available.');
    });

    it('falls back to the title from the database when the current DSL fails to parse', async () => {
      mockParseDSL.mockImplementation(() => { throw new Error('bad dsl'); });

      await deleteLesson('abc123', 'garbage');

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('"To Delete"'));
    });

    it('falls back to a generic title when neither the DSL nor the database has one', async () => {
      mockParseDSL.mockImplementation(() => { throw new Error('bad dsl'); });
      db.reset({ content: { abc123: { blocks: [] } } });

      await deleteLesson('abc123', 'garbage');

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('"(Untitled)"'));
    });

    it('keeps the generic title when the DSL parses without one', async () => {
      mockParseDSL.mockReturnValue({ blocks: [] });

      await deleteLesson('abc123', 'no title');

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('"(Untitled)"'));
    });

    it('keeps the generic title when the database title read fails too', async () => {
      mockParseDSL.mockImplementation(() => { throw new Error('bad dsl'); });
      const port = mockStorePort(db);
      lessons = createLessonStore({
        ...port,
        read: async (path) => {
          if (path.endsWith('/title')) throw new Error('read failed');
          return port.read(path);
        },
      });

      await deleteLesson('abc123', 'garbage');

      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('"(Untitled)"'));
    });

    it('does not delete, and notifies, when the Schedules cannot be checked', async () => {
      const { showNotification } = await import('../../notification-utils.js');
      const port = mockStorePort(db);
      lessons = createLessonStore({
        ...port,
        read: async (path) => {
          if (path === 'schedule') throw new Error('read failed');
          return port.read(path);
        },
      });

      const result = await deleteLesson('abc123', '# To Delete');

      expect(result).toBe(false);
      expect(confirm).not.toHaveBeenCalled();
      expect(await lessons.get('abc123')).toEqual({ title: 'To Delete' });
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    });

    it('notifies and reports failure when the delete itself fails', async () => {
      const { showNotification } = await import('../../notification-utils.js');
      lessons = createLessonStore({ ...mockStorePort(db), update: async () => { throw new Error('write failed'); } });

      const result = await deleteLesson('abc123', '# To Delete');

      expect(result).toBe(false);
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    });
  });

  describe('loadExistingContentList', () => {
    it('populates the dropdown, sorted by id, with a leading placeholder option', async () => {
      await lessons.save('b', { title: 'Lesson B' });
      await lessons.save('a', { title: 'Lesson A' });
      await lessons.save('c', { blocks: [] });
      const select = document.createElement('select');

      await loadExistingContentList(select);

      expect([...select.options].map((o) => o.textContent)).toEqual(['-- Select a lesson --', 'Lesson A', 'Lesson B', '(untitled)']);
    });

    it('selects the given Lesson id, if present', async () => {
      await lessons.save('a', { title: 'Lesson A' });
      await lessons.save('b', { title: 'Lesson B' });
      const select = document.createElement('select');

      await loadExistingContentList(select, 'b');

      expect(select.value).toBe('b');
    });

    it('leaves only the placeholder option when there are no Lessons', async () => {
      const select = document.createElement('select');
      await loadExistingContentList(select);
      expect(select.options).toHaveLength(1);
    });
  });

  describe('loadContent', () => {
    it('loads and renders a found Lesson', async () => {
      await lessons.save('abc123', { title: 'Found Lesson' });
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
    it('seeds a blank Lesson and a fresh, unused id when ?new=1', async () => {
      const contentIdEl = document.createElement('div');
      const preview = document.createElement('div');
      document.body.innerHTML = '<textarea id="dslInput"></textarea><button id="saveBtn"></button><button id="duplicateBtn"></button><button id="deleteBtn"></button>';

      await handleNewLessonContext({ new: '1' }, contentIdEl, document.getElementById('dslInput'), preview);

      expect(contentIdEl.textContent).toMatch(/^[0-9a-f]{32}$/);
      expect(await lessons.get(contentIdEl.textContent)).toBeNull();
      expect(document.getElementById('dslInput').disabled).toBe(false);
    });

    it('does nothing when ?new is not "1"', async () => {
      const contentIdEl = document.createElement('div');
      const dslInput = document.createElement('textarea');
      const preview = document.createElement('div');

      await handleNewLessonContext({}, contentIdEl, dslInput, preview);

      expect(contentIdEl.textContent).toBe('');
      expect(dslInput.value).toBe('');
    });
  });

  describe('handleExistingPageContext', () => {
    it('loads and enables editing for ?page=<id>', async () => {
      await lessons.save('abc123', { title: 'Existing' });
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

  describe('updateUnsavedIndicator', () => {
    it('shows the indicator when dirty', () => {
      const el = document.createElement('span');
      updateUnsavedIndicator(el, true);
      expect(el.style.display).toBe('inline');
    });

    it('hides the indicator when clean', () => {
      const el = document.createElement('span');
      el.style.display = 'inline';
      updateUnsavedIndicator(el, false);
      expect(el.style.display).toBe('none');
    });
  });

  describe('confirmDiscardUnsavedChanges', () => {
    it('returns true immediately when there are no unsaved changes, without prompting', () => {
      expect(confirmDiscardUnsavedChanges(false)).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('prompts and returns the confirm result when dirty', () => {
      global.confirm.mockReturnValue(true);
      expect(confirmDiscardUnsavedChanges(true)).toBe(true);
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));

      global.confirm.mockReturnValue(false);
      expect(confirmDiscardUnsavedChanges(true)).toBe(false);
    });
  });

  describe('handleBeforeUnload', () => {
    it('prevents the default and sets returnValue when dirty', () => {
      const event = { preventDefault: vi.fn(), returnValue: undefined };
      handleBeforeUnload(event, true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe('');
    });

    it('does nothing when clean', () => {
      const event = { preventDefault: vi.fn(), returnValue: undefined };
      handleBeforeUnload(event, false);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.returnValue).toBeUndefined();
    });
  });
});
