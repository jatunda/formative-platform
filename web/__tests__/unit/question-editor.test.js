import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../question-editor.js';

vi.mock('../../firebase-config.js', () => ({ db: {} }));
vi.mock('../../teacher-nav.js', () => ({ renderTeacherNav: vi.fn() }));
vi.mock('../../notification-utils.js', () => ({ showNotification: vi.fn() }));
vi.mock('../../content-renderer.js', () => ({
  renderContentItems: (items, containerEl) => {
    containerEl.textContent = (items || []).map((item) => item.value).join(' ');
  },
}));

const mockParseQuestionDSL = vi.fn();
vi.mock('../../question-dsl.js', () => ({
  parseQuestionDSL: (...args) => mockParseQuestionDSL(...args),
  generateQuestionDSLFromParsed: (parsed) => `STEM:${parsed.className || ''}`,
}));

const mockValidateQuestionDSL = vi.fn(() => null);
vi.mock('../../question-dsl-validation.js', () => ({
  validateQuestionDSL: (...args) => mockValidateQuestionDSL(...args),
  getQuestionErrorExplanation: (msg) => `<div class="error">${msg}</div>`,
}));

const mockGetQueryParams = vi.fn(() => ({ question: 'abc123' }));
vi.mock('../../editor.js', () => ({
  getQueryParams: (...args) => mockGetQueryParams(...args),
  handleDslInputKeydown: vi.fn(),
  updateUnsavedIndicator: (indicatorEl, isDirty) => {
    indicatorEl.style.display = isDirty ? 'inline' : 'none';
  },
  handleBeforeUnload: (event, isDirty) => {
    if (isDirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  },
}));

vi.mock('../../ui-components.js', () => ({
  withWorkingIndicator: (btn, onClick) => onClick,
}));

vi.mock('../../question-dsl-cheat-sheet.js', () => ({
  createQuestionDslCheatSheetPanel: () => document.createElement('details'),
}));

const mockGetClasses = vi.fn(async () => ({ c1: { name: 'AP CS A' } }));
vi.mock('../../database-utils.js', () => ({
  initializeDatabase: vi.fn(),
  getClasses: (...args) => mockGetClasses(...args),
}));

const mockGetQuestionFromDB = vi.fn();
const mockSaveQuestion = vi.fn();
const mockDeleteQuestionAndSlugs = vi.fn();
const mockResolveClassNameToId = vi.fn(async () => 'c1');
const mockGetAllQuestionSlugs = vi.fn(async () => ({}));
const mockAssignQuestionSlug = vi.fn();
const mockRemoveQuestionSlug = vi.fn();
const mockRenameQuestionSlug = vi.fn();
const mockGetQuestionBacklinks = vi.fn(async () => []);
vi.mock('../../question-database-utils.js', () => ({
  initializeQuestionDatabase: vi.fn(),
  getQuestionFromDB: (...args) => mockGetQuestionFromDB(...args),
  saveQuestion: (...args) => mockSaveQuestion(...args),
  deleteQuestionAndSlugs: (...args) => mockDeleteQuestionAndSlugs(...args),
  resolveClassNameToId: (...args) => mockResolveClassNameToId(...args),
  getAllQuestionSlugs: (...args) => mockGetAllQuestionSlugs(...args),
  assignQuestionSlug: (...args) => mockAssignQuestionSlug(...args),
  removeQuestionSlug: (...args) => mockRemoveQuestionSlug(...args),
  renameQuestionSlug: (...args) => mockRenameQuestionSlug(...args),
  getQuestionBacklinks: (...args) => mockGetQuestionBacklinks(...args),
}));

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn();

function renderEditorDom() {
  document.body.innerHTML = `
    <div id="questionId"></div>
    <textarea id="questionDslInput"></textarea>
    <div id="preview"></div>
    <button id="saveBtn"></button>
    <button id="deleteBtn"></button>
    <div id="cheatSheetContainer"></div>
    <ul id="slugList"></ul>
    <input id="newSlugInput" />
    <button id="addSlugBtn"></button>
    <span id="unsavedIndicator" style="display: none;"></span>
  `;
}

const SAMPLE_PARSED = {
  stem: [{ type: 'text', value: 'Stem' }],
  options: [{ text: 'A', correct: true, explanation: 'Right.', mistakeCategory: null }],
  className: 'AP CS A',
  topic: 'arithmetic',
};

describe('question-editor', () => {
  beforeEach(() => {
    renderEditorDom();
    mockGetQueryParams.mockReturnValue({ question: 'abc123' });
    mockGetQuestionFromDB.mockReset().mockResolvedValue({ stem: SAMPLE_PARSED.stem, options: SAMPLE_PARSED.options, classId: 'c1', topic: 'arithmetic' });
    mockSaveQuestion.mockReset().mockResolvedValue(undefined);
    mockDeleteQuestionAndSlugs.mockReset().mockResolvedValue(undefined);
    mockResolveClassNameToId.mockReset().mockResolvedValue('c1');
    mockGetAllQuestionSlugs.mockReset().mockResolvedValue({});
    mockAssignQuestionSlug.mockReset().mockResolvedValue(undefined);
    mockRemoveQuestionSlug.mockReset().mockResolvedValue(undefined);
    mockRenameQuestionSlug.mockReset().mockResolvedValue(undefined);
    mockGetQuestionBacklinks.mockReset().mockResolvedValue([]);
    mockGetClasses.mockReset().mockResolvedValue({ c1: { name: 'AP CS A' } });
    mockParseQuestionDSL.mockReset().mockReturnValue(SAMPLE_PARSED);
    mockValidateQuestionDSL.mockReset().mockReturnValue(null);
    global.alert.mockClear();
    global.confirm.mockReturnValue(true);
    global.prompt.mockReset();

    Object.defineProperty(window, 'location', {
      value: { href: 'question-editor.html?question=abc123' },
      writable: true,
      configurable: true,
    });
  });

  describe('main', () => {
    it('alerts and redirects to the question bank when there is no ?question param', async () => {
      mockGetQueryParams.mockReturnValue({});

      await main();

      expect(global.alert).toHaveBeenCalledWith('No question selected.');
      expect(window.location.href).toContain('question-bank-manager.html');
      expect(mockGetQuestionFromDB).not.toHaveBeenCalled();
    });

    it('loads an existing question, resolving its classId back to a Class name', async () => {
      await main();

      expect(document.getElementById('questionId').textContent).toBe('abc123');
      expect(document.getElementById('questionDslInput').value).toBe('STEM:AP CS A');
    });

    it('seeds a blank template for a question that has not been written yet', async () => {
      mockGetQuestionFromDB.mockResolvedValue({ createdAt: 123 });

      await main();

      expect(document.getElementById('questionDslInput').value).toContain('Write your question stem here.');
    });

    it('defaults options and topic to empty when loading a question missing those fields', async () => {
      mockGetQuestionFromDB.mockResolvedValue({ stem: SAMPLE_PARSED.stem, classId: 'c1' });

      await main();

      expect(mockGetClasses).toHaveBeenCalled();
    });

    describe('preview rendering', () => {
      it('renders a wrong option with missing Explanation/Mistake as "(missing)", and missing Tags as placeholders', async () => {
        mockParseQuestionDSL.mockReturnValue({
          stem: [{ type: 'text', value: 'Stem' }],
          options: [
            { text: 'A', correct: true, explanation: 'Right.', mistakeCategory: null },
            { text: 'B', correct: false, explanation: null, mistakeCategory: null },
          ],
          className: null,
          topic: null,
        });

        await main();

        const preview = document.getElementById('preview').innerHTML;
        expect(preview).toContain('✗ Wrong: B');
        expect(preview).toContain('Explanation: (missing)');
        expect(preview).toContain('Mistake: (missing)');
        expect(preview).toContain('(no class)');
        expect(preview).toContain('(no topic)');
      });

      it('shows the error explanation when parsing throws', async () => {
        mockParseQuestionDSL.mockImplementation(() => { throw new Error('boom'); });

        await main();

        expect(document.getElementById('preview').innerHTML).toContain('boom');
      });
    });

    describe('save', () => {
      it('validates, resolves the Class name, and saves', async () => {
        const { showNotification } = await import('../../notification-utils.js');
        await main();

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockResolveClassNameToId).toHaveBeenCalledWith('AP CS A');
        expect(mockSaveQuestion).toHaveBeenCalledWith('abc123', {
          stem: SAMPLE_PARSED.stem,
          options: SAMPLE_PARSED.options,
          classId: 'c1',
          topic: 'arithmetic',
        });
        expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('saved'), 'success');
      });

      it('alerts and does not save when validation fails', async () => {
        mockValidateQuestionDSL.mockReturnValue('No correct Option marked');
        await main();

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSaveQuestion).not.toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('No correct Option marked');
      });

      it('alerts and does not save when the Class name cannot be resolved', async () => {
        mockResolveClassNameToId.mockRejectedValue(new Error('No class named "Nonexistent" found.'));
        await main();

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSaveQuestion).not.toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('No class named "Nonexistent" found.');
      });
    });

    describe('delete', () => {
      it('deletes after confirmation and redirects to the question bank', async () => {
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockDeleteQuestionAndSlugs).toHaveBeenCalledWith('abc123');
        expect(window.location.href).toContain('question-bank-manager.html');
      });

      it('does nothing when the teacher cancels the confirmation', async () => {
        global.confirm.mockReturnValue(false);
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockDeleteQuestionAndSlugs).not.toHaveBeenCalled();
      });

      it('mentions a single affected page in the singular when deleting with exactly one backlink', async () => {
        mockGetQuestionBacklinks.mockResolvedValue(['page1']);
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('1 page currently links'));
      });

      it('mentions multiple affected pages in the plural when deleting with more than one backlink', async () => {
        mockGetQuestionBacklinks.mockResolvedValue(['page1', 'page2']);
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('2 pages currently link'));
      });
    });

    describe('slug list', () => {
      it('shows a message when no Question Link is assigned', async () => {
        await main();
        expect(document.getElementById('slugList').textContent).toContain('No Question Link assigned');
      });

      it('lists every slug that points to this question, sorted, as plain code text', async () => {
        mockGetAllQuestionSlugs.mockResolvedValue({ 'z-slug': 'abc123', 'a-slug': 'abc123', other: 'def456' });
        await main();

        const codes = [...document.getElementById('slugList').querySelectorAll('code')].map((c) => c.textContent);
        expect(codes).toEqual(['[[q:a-slug]]', '[[q:z-slug]]']);
      });

      it('adds a new Question Link and refreshes the list', async () => {
        await main();
        document.getElementById('newSlugInput').value = 'loops-1';

        document.getElementById('addSlugBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockAssignQuestionSlug).toHaveBeenCalledWith('abc123', 'loops-1');
      });

      it('does nothing when the new Question Link input is blank', async () => {
        await main();
        document.getElementById('newSlugInput').value = '   ';

        document.getElementById('addSlugBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockAssignQuestionSlug).not.toHaveBeenCalled();
      });

      it('alerts when assigning a Question Link fails', async () => {
        mockAssignQuestionSlug.mockRejectedValue(new Error('already in use'));
        await main();
        document.getElementById('newSlugInput').value = 'taken';

        document.getElementById('addSlugBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.alert).toHaveBeenCalledWith('already in use');
      });

      it('removes a slug when its Remove button is clicked and confirmed', async () => {
        mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'abc123' });
        await main();

        document.querySelector('#slugList .delete-btn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('[[q:loops-1]]'));
        expect(mockRemoveQuestionSlug).toHaveBeenCalledWith('loops-1');
      });

      it('does not remove a slug when the confirmation is cancelled', async () => {
        mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'abc123' });
        global.confirm.mockReturnValue(false);
        await main();

        document.querySelector('#slugList .delete-btn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRemoveQuestionSlug).not.toHaveBeenCalled();
      });

      it('renames a slug via the Rename button', async () => {
        mockGetAllQuestionSlugs.mockResolvedValue({ 'old-slug': 'abc123' });
        global.prompt.mockReturnValue('new-slug');
        await main();

        const renameBtn = [...document.querySelectorAll('#slugList button')]
          .find((btn) => btn.textContent === 'Rename');
        renameBtn.onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRenameQuestionSlug).toHaveBeenCalledWith('abc123', 'old-slug', 'new-slug');
      });

      it('does nothing when Rename is cancelled or left as the same slug', async () => {
        mockGetAllQuestionSlugs.mockResolvedValue({ 'old-slug': 'abc123' });
        global.prompt.mockReturnValue(null);
        await main();

        const renameBtn = [...document.querySelectorAll('#slugList button')]
          .find((btn) => btn.textContent === 'Rename');
        renameBtn.onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRenameQuestionSlug).not.toHaveBeenCalled();
      });

      it('alerts when renaming a slug fails', async () => {
        mockGetAllQuestionSlugs.mockResolvedValue({ 'old-slug': 'abc123' });
        mockRenameQuestionSlug.mockRejectedValue(new Error('already in use'));
        global.prompt.mockReturnValue('new-slug');
        await main();

        const renameBtn = [...document.querySelectorAll('#slugList button')]
          .find((btn) => btn.textContent === 'Rename');
        renameBtn.onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.alert).toHaveBeenCalledWith('already in use');
      });
    });
  });
});
