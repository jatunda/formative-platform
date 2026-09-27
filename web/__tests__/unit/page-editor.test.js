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
}));

const mockGetPageFromDB = vi.fn();
const mockSavePage = vi.fn();
const mockDeletePageAndSlugs = vi.fn();
const mockGetAllSlugs = vi.fn(async () => ({}));
const mockAssignSlug = vi.fn();
const mockRemoveSlug = vi.fn();
vi.mock('../../page-database-utils.js', () => ({
  initializePageDatabase: vi.fn(),
  getPageFromDB: (...args) => mockGetPageFromDB(...args),
  savePage: (...args) => mockSavePage(...args),
  deletePageAndSlugs: (...args) => mockDeletePageAndSlugs(...args),
  getAllSlugs: (...args) => mockGetAllSlugs(...args),
  assignSlug: (...args) => mockAssignSlug(...args),
  removeSlug: (...args) => mockRemoveSlug(...args),
}));

global.alert = vi.fn();
global.confirm = vi.fn(() => true);

function renderEditorDom() {
  document.body.innerHTML = `
    <div id="pageId"></div>
    <textarea id="dslInput"></textarea>
    <div id="preview"></div>
    <button id="saveBtn"></button>
    <button id="deleteBtn"></button>
    <ul id="slugList"></ul>
    <input id="newSlugInput" />
    <button id="addSlugBtn"></button>
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
    mockParseDSL.mockReset().mockReturnValue({ title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
    mockGenerateDSLFromContent.mockClear();
    global.alert.mockClear();
    global.confirm.mockReturnValue(true);

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

    describe('save', () => {
      it('parses and saves the current DSL, then notifies success', async () => {
        const { showNotification } = await import('../../notification-utils.js');
        await main();
        document.getElementById('dslInput').value = '# Parsed Title';

        document.getElementById('saveBtn').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockSavePage).toHaveBeenCalledWith('abc123', { title: 'Parsed Title', blocks: [{ type: 'question', content: [] }] });
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

      it('removes a slug when its Remove button is clicked', async () => {
        mockGetAllSlugs.mockResolvedValue({ syllabus: 'abc123' });
        await main();

        document.querySelector('#slugList button').onclick();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockRemoveSlug).toHaveBeenCalledWith('syllabus');
      });
    });
  });
});
