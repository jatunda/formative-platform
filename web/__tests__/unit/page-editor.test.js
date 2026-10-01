import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../page-editor.js';

vi.mock('../../firebase-config.js', () => ({ db: {} }));
vi.mock('../../teacher-nav.js', () => ({ renderTeacherNav: vi.fn() }));
vi.mock('../../notification-utils.js', () => ({ showNotification: vi.fn() }));

const mockParseDSL = vi.fn((text) => ({ title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] }));
const mockGenerateDSLFromContent = vi.fn((content) => `# ${content.title}`);
vi.mock('../../dsl.js', () => ({
  parseDSL: (...args) => mockParseDSL(...args),
  generateDSLFromContent: (...args) => mockGenerateDSLFromContent(...args),
}));

const mockGetQueryParams = vi.fn(() => ({ page: 'abc123' }));
const mockUpdatePreview = vi.fn();
const mockHandleDslInputKeydown = vi.fn();
vi.mock('../../editor.js', () => ({
  getQueryParams: (...args) => mockGetQueryParams(...args),
  updatePreview: (...args) => mockUpdatePreview(...args),
  handleDslInputKeydown: (...args) => mockHandleDslInputKeydown(...args),
  computeInsertAtCursor: (value, start, end, text) => ({
    value: value.substring(0, start) + text + value.substring(end),
    cursor: start + text.length,
  }),
  applyComputedEdit: (el, result) => {
    el.value = result.value;
    el.selectionStart = el.selectionEnd = result.cursor;
  },
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

vi.mock('../../dsl-cheat-sheet.js', () => ({
  createDslCheatSheetPanel: () => document.createElement('details'),
}));

const mockShowPageLinkPicker = vi.fn();
vi.mock('../../page-link-picker.js', () => ({
  showPageLinkPicker: (...args) => mockShowPageLinkPicker(...args),
}));

const mockShowQuestionLinkPicker = vi.fn();
vi.mock('../../question-link-picker.js', () => ({
  showQuestionLinkPicker: (...args) => mockShowQuestionLinkPicker(...args),
}));

const mockUpdateQuestionBacklinksForPage = vi.fn();
vi.mock('../../question-database-utils.js', () => ({
  initializeQuestionDatabase: vi.fn(),
  updateQuestionBacklinksForPage: (...args) => mockUpdateQuestionBacklinksForPage(...args),
}));

const mockGetPageFromDB = vi.fn();
const mockSavePage = vi.fn();
const mockDeletePageAndSlugs = vi.fn();
const mockGetAllSlugs = vi.fn(async () => ({}));
const mockAssignSlug = vi.fn();
const mockRemoveSlug = vi.fn();
const mockRenameSlug = vi.fn();
const mockGetBacklinks = vi.fn(async () => []);
const mockUpdateBacklinksForPage = vi.fn();
vi.mock('../../page-database-utils.js', () => ({
  initializePageDatabase: vi.fn(),
  getPageFromDB: (...args) => mockGetPageFromDB(...args),
  savePage: (...args) => mockSavePage(...args),
  deletePageAndSlugs: (...args) => mockDeletePageAndSlugs(...args),
  getAllSlugs: (...args) => mockGetAllSlugs(...args),
  assignSlug: (...args) => mockAssignSlug(...args),
  removeSlug: (...args) => mockRemoveSlug(...args),
  renameSlug: (...args) => mockRenameSlug(...args),
  getBacklinks: (...args) => mockGetBacklinks(...args),
  updateBacklinksForPage: (...args) => mockUpdateBacklinksForPage(...args),
}));

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn();

function renderEditorDom() {
  document.body.innerHTML = `
    <div id="pageId"></div>
    <textarea id="dslInput"></textarea>
    <div id="preview"></div>
    <button id="saveBtn"></button>
    <button id="deleteBtn"></button>
    <button id="insertPageLinkBtn"></button>
    <button id="insertQuestionLinkBtn"></button>
    <div id="cheatSheetContainer"></div>
    <ul id="slugList"></ul>
    <input id="newSlugInput" />
    <button id="addSlugBtn"></button>
    <span id="unsavedIndicator" style="display: none;"></span>
  `;
}

describe('page-editor', () => {
  beforeEach(() => {
    renderEditorDom();
    mockGetQueryParams.mockReturnValue({ page: 'abc123' });
    mockGetPageFromDB.mockReset().mockResolvedValue({ title: 'Existing Page', blocks: [] });
    mockSavePage.mockReset().mockResolvedValue(undefined);
    mockDeletePageAndSlugs.mockReset().mockResolvedValue(undefined);
    mockGetAllSlugs.mockReset().mockResolvedValue({});
    mockAssignSlug.mockReset().mockResolvedValue(undefined);
    mockRemoveSlug.mockReset().mockResolvedValue(undefined);
    mockRenameSlug.mockReset().mockResolvedValue(undefined);
    mockGetBacklinks.mockReset().mockResolvedValue([]);
    mockUpdateBacklinksForPage.mockReset().mockResolvedValue(undefined);
    mockShowPageLinkPicker.mockReset();
    mockShowQuestionLinkPicker.mockReset();
    mockUpdateQuestionBacklinksForPage.mockReset().mockResolvedValue(undefined);
    mockParseDSL.mockReset().mockReturnValue({ title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
    mockGenerateDSLFromContent.mockClear();
    global.alert.mockClear();
    global.confirm.mockReturnValue(true);
    global.prompt.mockReset();

    Object.defineProperty(window, 'location', {
      value: { href: 'page-editor.html?page=abc123' },
      writable: true,
      configurable: true,
    });
  });

  describe('main', () => {
    it('alerts and redirects to the page manager when there is no ?page param', async () => {
      mockGetQueryParams.mockReturnValue({});

      await main();

      expect(global.alert).toHaveBeenCalledWith('No page selected.');
      expect(window.location.href).toContain('page-manager.html');
      expect(mockGetPageFromDB).not.toHaveBeenCalled();
    });

    it('loads an existing page into the editor and preview', async () => {
      mockGetPageFromDB.mockResolvedValue({ title: 'Existing Page', blocks: [] });
      mockGenerateDSLFromContent.mockReturnValue('# Existing Page');

      await main();

      expect(document.getElementById('pageId').textContent).toBe('abc123');
      expect(document.getElementById('dslInput').value).toBe('# Existing Page');
      expect(mockUpdatePreview).toHaveBeenCalledWith('# Existing Page', document.getElementById('preview'));
    });

    it('seeds blank content for a page that does not exist yet', async () => {
      mockGetPageFromDB.mockResolvedValue(null);

      await main();

      expect(mockGenerateDSLFromContent).toHaveBeenCalledWith({ title: 'Empty Page', blocks: [] });
    });

    describe('unsaved changes', () => {
      it('starts clean after loading, with no beforeunload warning', async () => {
        await main();

        const event = { preventDefault: vi.fn(), returnValue: undefined };
        window.dispatchEvent(Object.assign(new Event('beforeunload', { cancelable: true }), event));
        expect(document.getElementById('unsavedIndicator').style.display).toBe('none');
      });

      it('marks dirty on input and shows the indicator', async () => {
        await main();

        document.getElementById('dslInput').dispatchEvent(new Event('input'));

        expect(document.getElementById('unsavedIndicator').style.display).toBe('inline');
      });

      it('warns via beforeunload once dirty', async () => {
        await main();
        document.getElementById('dslInput').dispatchEvent(new Event('input'));

        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
      });

      it('clears the indicator after a successful save', async () => {
        await main();
        document.getElementById('dslInput').dispatchEvent(new Event('input'));
        expect(document.getElementById('unsavedIndicator').style.display).toBe('inline');

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.getElementById('unsavedIndicator').style.display).toBe('none');
      });

      it('does not clear the indicator when save fails validation', async () => {
        mockParseDSL.mockReturnValue({ title: null, blocks: null });
        await main();
        document.getElementById('dslInput').dispatchEvent(new Event('input'));

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.getElementById('unsavedIndicator').style.display).toBe('inline');
      });
    });

    describe('save', () => {
      it('parses and saves the current DSL, then notifies success', async () => {
        const { showNotification } = await import('../../notification-utils.js');
        await main();
        document.getElementById('dslInput').value = '# Parsed Title';

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSavePage).toHaveBeenCalledWith('abc123', { title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
        expect(mockUpdateBacklinksForPage).toHaveBeenCalledWith('abc123', { title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
        expect(mockUpdateQuestionBacklinksForPage).toHaveBeenCalledWith('abc123', { title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
        expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Parsed Title'), 'success');
      });

      it('alerts and does not save when parsing produces malformed content', async () => {
        mockParseDSL.mockReturnValue({ title: null, blocks: null });
        await main();

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSavePage).not.toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('Parsing failed or content is malformed.');
      });
    });

    describe('delete', () => {
      it('deletes after confirmation and redirects to the page manager', async () => {
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockDeletePageAndSlugs).toHaveBeenCalledWith('abc123');
        expect(window.location.href).toContain('page-manager.html');
      });

      it('does nothing when the teacher cancels the confirmation', async () => {
        global.confirm.mockReturnValue(false);
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockDeletePageAndSlugs).not.toHaveBeenCalled();
      });

      it('mentions affected pages when deleting a page with backlinks', async () => {
        mockGetBacklinks.mockResolvedValue(['source1']);
        await main();

        document.getElementById('deleteBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('1 other page'));
      });
    });

    describe('slug list', () => {
      it('shows a message when no slug is assigned', async () => {
        mockGetAllSlugs.mockResolvedValue({});
        await main();
        expect(document.getElementById('slugList').textContent).toContain('No URL assigned');
      });

      it('lists every slug that points to this page, sorted', async () => {
        mockGetAllSlugs.mockResolvedValue({ 'z-slug': 'abc123', 'a-slug': 'abc123', other: 'def456' });
        await main();

        const links = [...document.getElementById('slugList').querySelectorAll('a')].map((a) => a.textContent);
        expect(links).toEqual(['/p/a-slug', '/p/z-slug']);
      });

      it('adds a new slug and refreshes the list', async () => {
        mockGetAllSlugs.mockResolvedValue({});
        await main();
        document.getElementById('newSlugInput').value = 'syllabus';

        document.getElementById('addSlugBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockAssignSlug).toHaveBeenCalledWith('abc123', 'syllabus');
      });

      it('alerts when assigning a slug fails', async () => {
        mockAssignSlug.mockRejectedValue(new Error('already in use'));
        await main();
        document.getElementById('newSlugInput').value = 'taken';

        document.getElementById('addSlugBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.alert).toHaveBeenCalledWith('already in use');
      });

      it('removes a slug when its Remove button is clicked and confirmed', async () => {
        mockGetAllSlugs.mockResolvedValue({ syllabus: 'abc123' });
        await main();

        document.querySelector('#slugList .delete-btn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('/p/syllabus'));
        expect(mockRemoveSlug).toHaveBeenCalledWith('syllabus');
      });

      it('does not remove a slug when the confirmation is cancelled', async () => {
        mockGetAllSlugs.mockResolvedValue({ syllabus: 'abc123' });
        global.confirm.mockReturnValue(false);
        await main();

        document.querySelector('#slugList .delete-btn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRemoveSlug).not.toHaveBeenCalled();
      });

      it('mentions affected pages when removing a slug with backlinks', async () => {
        mockGetAllSlugs.mockResolvedValue({ syllabus: 'abc123' });
        mockGetBacklinks.mockResolvedValue(['source1', 'source2']);
        await main();

        document.querySelector('#slugList .delete-btn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('2 other pages'));
      });

      it('renames a slug via the Rename button', async () => {
        mockGetAllSlugs.mockResolvedValue({ 'old-slug': 'abc123' });
        global.prompt.mockReturnValue('new-slug');
        await main();

        const renameBtn = [...document.querySelectorAll('#slugList button')]
          .find((btn) => btn.textContent === 'Rename');
        renameBtn.onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRenameSlug).toHaveBeenCalledWith('abc123', 'old-slug', 'new-slug');
      });

      it('does nothing when Rename is cancelled', async () => {
        mockGetAllSlugs.mockResolvedValue({ 'old-slug': 'abc123' });
        global.prompt.mockReturnValue(null);
        await main();

        const renameBtn = [...document.querySelectorAll('#slugList button')]
          .find((btn) => btn.textContent === 'Rename');
        renameBtn.onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRenameSlug).not.toHaveBeenCalled();
      });
    });

    describe('insert page link', () => {
      it('inserts [[slug|Title]] at the cursor when a page is picked', async () => {
        await main();
        const dslInput = document.getElementById('dslInput');
        dslInput.value = 'before after';
        dslInput.selectionStart = dslInput.selectionEnd = 7;

        mockShowPageLinkPicker.mockImplementation(({ onSelect }) => {
          onSelect({ slug: 'syllabus', title: 'Syllabus' });
        });

        document.getElementById('insertPageLinkBtn').onclick();

        expect(dslInput.value).toBe('before [[syllabus|Syllabus]]after');
      });
    });

    describe('insert question link', () => {
      it('inserts [[q:slug|Label]] at the cursor when a question is picked', async () => {
        await main();
        const dslInput = document.getElementById('dslInput');
        dslInput.value = 'before after';
        dslInput.selectionStart = dslInput.selectionEnd = 7;

        mockShowQuestionLinkPicker.mockImplementation(({ onSelect }) => {
          onSelect({ slug: 'loops-1', label: 'What is a loop?' });
        });

        document.getElementById('insertQuestionLinkBtn').onclick();

        expect(dslInput.value).toBe('before [[q:loops-1|What is a loop?]]after');
      });
    });
  });
});
