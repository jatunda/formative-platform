import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../page-manager.js';

vi.mock('../../firebase-config.js', () => ({ db: {} }));
vi.mock('../../database-utils.js', () => ({ initializeDatabase: vi.fn() }));
vi.mock('../../teacher-nav.js', () => ({ renderTeacherNav: vi.fn() }));

const mockCreateNewPage = vi.fn(async () => 'new-page-id');
const mockGetAllPages = vi.fn(async () => null);
const mockGetAllSlugs = vi.fn(async () => ({}));
vi.mock('../../page-database-utils.js', () => ({
  initializePageDatabase: vi.fn(),
  createNewPage: (...args) => mockCreateNewPage(...args),
  getAllPages: (...args) => mockGetAllPages(...args),
  getAllSlugs: (...args) => mockGetAllSlugs(...args),
}));

describe('page-manager', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="pageList"></div><button id="newPageBtn"></button>';
    mockCreateNewPage.mockClear();
    mockGetAllPages.mockReset().mockResolvedValue(null);
    mockGetAllSlugs.mockReset().mockResolvedValue({});

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  describe('main', () => {
    it('shows a message when there are no pages', async () => {
      await main();
      expect(document.getElementById('pageList').textContent).toContain('No pages yet');
    });

    it('lists each page with its title and assigned slugs', async () => {
      mockGetAllPages.mockResolvedValue({ abc: { title: 'Syllabus' }, def: { title: 'Resources' } });
      mockGetAllSlugs.mockResolvedValue({ syllabus: 'abc', 'syllabus-2026': 'abc' });

      await main();

      const list = document.getElementById('pageList');
      expect(list.textContent).toContain('Syllabus');
      expect(list.textContent).toContain('Resources');
      expect(list.querySelectorAll('a[href="/p/syllabus"]')).toHaveLength(1);
      expect(list.querySelectorAll('a[href="/p/syllabus-2026"]')).toHaveLength(1);
    });

    it('shows a placeholder for a page with no assigned slug', async () => {
      mockGetAllPages.mockResolvedValue({ abc: { title: 'Draft' } });

      await main();

      expect(document.getElementById('pageList').textContent).toContain('No URL assigned');
    });

    it('falls back to the untitled label for a page with no title', async () => {
      mockGetAllPages.mockResolvedValue({ abc: {} });

      await main();

      expect(document.getElementById('pageList').textContent).toContain('(untitled)');
    });

    it('creates a new page and navigates to its editor when New Page is clicked', async () => {
      await main();

      document.getElementById('newPageBtn').onclick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCreateNewPage).toHaveBeenCalled();
      expect(window.location.href).toContain('page-editor.html?page=new-page-id');
    });
  });
});
