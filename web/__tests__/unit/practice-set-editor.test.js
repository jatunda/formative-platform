import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../practice-set-editor.js';

vi.mock('../../firebase-config.js', () => ({ db: {} }));
vi.mock('../../teacher-nav.js', () => ({ renderTeacherNav: vi.fn() }));
vi.mock('../../notification-utils.js', () => ({ showNotification: vi.fn() }));
vi.mock('../../ui-components.js', () => ({ withWorkingIndicator: (btn, onClick) => onClick }));

const mockGetQueryParams = vi.fn(() => ({ practiceSet: 'abc123' }));
vi.mock('../../editor.js', () => ({
  getQueryParams: (...args) => mockGetQueryParams(...args),
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

const mockShowQuestionPicker = vi.fn();
vi.mock('../../question-picker.js', () => ({
  showQuestionPicker: (...args) => mockShowQuestionPicker(...args),
}));

const mockGetAllQuestions = vi.fn(async () => ({}));
vi.mock('../../question-database-utils.js', () => ({
  initializeQuestionDatabase: vi.fn(),
  getAllQuestions: (...args) => mockGetAllQuestions(...args),
}));

const mockGetPracticeSetFromDB = vi.fn();
const mockSavePracticeSet = vi.fn();
const mockDeletePracticeSetAndSlugs = vi.fn();
const mockGetAllPracticeSetSlugs = vi.fn(async () => ({}));
const mockAssignPracticeSetSlug = vi.fn();
const mockRemovePracticeSetSlug = vi.fn();
const mockRenamePracticeSetSlug = vi.fn();
vi.mock('../../practice-set-database-utils.js', () => ({
  initializePracticeSetDatabase: vi.fn(),
  getPracticeSetFromDB: (...args) => mockGetPracticeSetFromDB(...args),
  savePracticeSet: (...args) => mockSavePracticeSet(...args),
  deletePracticeSetAndSlugs: (...args) => mockDeletePracticeSetAndSlugs(...args),
  getAllPracticeSetSlugs: (...args) => mockGetAllPracticeSetSlugs(...args),
  assignPracticeSetSlug: (...args) => mockAssignPracticeSetSlug(...args),
  removePracticeSetSlug: (...args) => mockRemovePracticeSetSlug(...args),
  renamePracticeSetSlug: (...args) => mockRenamePracticeSetSlug(...args),
}));

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn();

function renderEditorDom() {
  document.body.innerHTML = `
    <input id="titleInput" />
    <button id="saveBtn"></button>
    <button id="deleteBtn"></button>
    <span id="unsavedIndicator" style="display: none;"></span>
    <ol id="questionList"></ol>
    <button id="addQuestionBtn"></button>
    <ul id="slugList"></ul>
    <input id="newSlugInput" />
    <button id="addSlugBtn"></button>
  `;
}

describe('practice-set-editor', () => {
  beforeEach(() => {
    renderEditorDom();
    mockGetQueryParams.mockReturnValue({ practiceSet: 'abc123' });
    mockGetPracticeSetFromDB.mockReset().mockResolvedValue({ title: 'Unit 3 Review', questionIds: ['q1', 'q2'] });
    mockGetAllQuestions.mockReset().mockResolvedValue({
      q1: { stem: [{ type: 'text', value: 'Question One' }] },
      q2: { stem: [{ type: 'text', value: 'Question Two' }] },
    });
    mockSavePracticeSet.mockReset().mockResolvedValue(undefined);
    mockDeletePracticeSetAndSlugs.mockReset().mockResolvedValue(undefined);
    mockGetAllPracticeSetSlugs.mockReset().mockResolvedValue({});
    mockAssignPracticeSetSlug.mockReset().mockResolvedValue(undefined);
    mockRemovePracticeSetSlug.mockReset().mockResolvedValue(undefined);
    mockRenamePracticeSetSlug.mockReset().mockResolvedValue(undefined);
    mockShowQuestionPicker.mockReset();
    global.alert.mockClear();
    global.confirm.mockReturnValue(true);
    global.prompt.mockReset();

    Object.defineProperty(window, 'location', {
      value: { href: 'practice-set-editor.html?practiceSet=abc123' },
      writable: true,
      configurable: true,
    });
  });

  describe('main', () => {
    it('alerts and redirects to the practice set manager when there is no ?practiceSet param', async () => {
      mockGetQueryParams.mockReturnValue({});

      await main();

      expect(global.alert).toHaveBeenCalledWith('No practice set selected.');
      expect(window.location.href).toContain('practice-set-manager.html');
      expect(mockGetPracticeSetFromDB).not.toHaveBeenCalled();
    });

    it('loads the title and renders the question list in stored order', async () => {
      await main();

      expect(document.getElementById('titleInput').value).toBe('Unit 3 Review');
      const labels = [...document.getElementById('questionList').querySelectorAll('li span')].map((s) => s.textContent);
      expect(labels).toEqual(['Question One', 'Question Two']);
    });

    it('shows a placeholder for a question id that no longer resolves', async () => {
      mockGetPracticeSetFromDB.mockResolvedValue({ title: 'T', questionIds: ['missing-id'] });

      await main();

      expect(document.getElementById('questionList').textContent).toContain('no longer exists');
    });

    describe('reordering and removal', () => {
      it('moves a question up when its Up button is clicked', async () => {
        await main();

        const upButtons = [...document.querySelectorAll('#questionList button')].filter((b) => b.textContent === '↑');
        upButtons[1].onclick(); // move q2 up

        const labels = [...document.getElementById('questionList').querySelectorAll('li span')].map((s) => s.textContent);
        expect(labels).toEqual(['Question Two', 'Question One']);
      });

      it('disables the Up button on the first row and the Down button on the last row', async () => {
        await main();

        const rows = document.querySelectorAll('#questionList li');
        const firstRowUp = [...rows[0].querySelectorAll('button')].find((b) => b.textContent === '↑');
        const lastRowDown = [...rows[rows.length - 1].querySelectorAll('button')].find((b) => b.textContent === '↓');
        expect(firstRowUp.disabled).toBe(true);
        expect(lastRowDown.disabled).toBe(true);
      });

      it('removes a question when its Remove button is clicked', async () => {
        await main();

        document.querySelector('#questionList .delete-btn').onclick();

        const labels = [...document.getElementById('questionList').querySelectorAll('li span')].map((s) => s.textContent);
        expect(labels).toEqual(['Question Two']);
      });

      it('marks the practice set dirty after reordering', async () => {
        await main();

        const upButtons = [...document.querySelectorAll('#questionList button')].filter((b) => b.textContent === '↑');
        upButtons[1].onclick();

        expect(document.getElementById('unsavedIndicator').style.display).toBe('inline');
      });
    });

    describe('add question', () => {
      it('appends the picked question to the end of the list', async () => {
        mockGetAllQuestions.mockResolvedValue({
          q1: { stem: [{ type: 'text', value: 'Question One' }] },
          q3: { stem: [{ type: 'text', value: 'Question Three' }] },
        });
        mockGetPracticeSetFromDB.mockResolvedValue({ title: 'T', questionIds: ['q1'] });
        mockShowQuestionPicker.mockImplementation(({ onSelect }) => onSelect({ questionId: 'q3', label: 'Question Three' }));

        await main();
        document.getElementById('addQuestionBtn').onclick();

        const labels = [...document.getElementById('questionList').querySelectorAll('li span')].map((s) => s.textContent);
        expect(labels).toEqual(['Question One', 'Question Three']);
      });
    });

    describe('save', () => {
      it('saves the title and current question order', async () => {
        const { showNotification } = await import('../../notification-utils.js');
        await main();

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSavePracticeSet).toHaveBeenCalledWith('abc123', { title: 'Unit 3 Review', questionIds: ['q1', 'q2'] });
        expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Unit 3 Review'), 'success');
      });

      it('alerts and does not save when the title is blank', async () => {
        await main();
        document.getElementById('titleInput').value = '  ';

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSavePracticeSet).not.toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('Please enter a title.');
      });
    });

    describe('delete', () => {
      it('deletes after confirmation and redirects to the practice set manager', async () => {
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockDeletePracticeSetAndSlugs).toHaveBeenCalledWith('abc123');
        expect(window.location.href).toContain('practice-set-manager.html');
      });

      it('does nothing when the teacher cancels the confirmation', async () => {
        global.confirm.mockReturnValue(false);
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockDeletePracticeSetAndSlugs).not.toHaveBeenCalled();
      });
    });

    describe('slug list', () => {
      it('shows a message when no slug is assigned', async () => {
        await main();
        expect(document.getElementById('slugList').textContent).toContain('No URL assigned');
      });

      it('lists every slug that points to this practice set, sorted', async () => {
        mockGetAllPracticeSetSlugs.mockResolvedValue({ 'z-slug': 'abc123', 'a-slug': 'abc123', other: 'def456' });
        await main();

        const links = [...document.getElementById('slugList').querySelectorAll('a')].map((a) => a.textContent);
        expect(links).toEqual(['/practice/a-slug', '/practice/z-slug']);
      });

      it('adds a new slug and refreshes the list', async () => {
        await main();
        document.getElementById('newSlugInput').value = 'unit-3-review';

        document.getElementById('addSlugBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockAssignPracticeSetSlug).toHaveBeenCalledWith('abc123', 'unit-3-review');
      });

      it('removes a slug when its Remove button is clicked and confirmed', async () => {
        mockGetAllPracticeSetSlugs.mockResolvedValue({ 'unit-3-review': 'abc123' });
        await main();

        document.querySelector('#slugList .delete-btn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('/practice/unit-3-review'));
        expect(mockRemovePracticeSetSlug).toHaveBeenCalledWith('unit-3-review');
      });

      it('renames a slug via the Rename button', async () => {
        mockGetAllPracticeSetSlugs.mockResolvedValue({ 'old-slug': 'abc123' });
        global.prompt.mockReturnValue('new-slug');
        await main();

        const renameBtn = [...document.querySelectorAll('#slugList button')]
          .find((btn) => btn.textContent === 'Rename');
        renameBtn.onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRenamePracticeSetSlug).toHaveBeenCalledWith('abc123', 'old-slug', 'new-slug');
      });
    });
  });
});
