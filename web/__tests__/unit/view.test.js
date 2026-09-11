import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveDayIndex, fetchPages, loadContent } from '../../view.js';
import { NO_CONTENT_FOR_TODAY } from '../../constants.js';

vi.mock('../../date-utils.js', () => ({
  initializeDateUtils: vi.fn(),
  getTodayDayIndex: vi.fn(async () => 7),
}));

// firebase-app.js and firebase-database.js both alias to this same mock
// module (see vitest.config.js) since view.js pulls in firebase-config.js,
// which imports from both - this factory has to cover everything either
// side needs, not just what view.js itself uses.
const mockData = {};
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  initializeApp: () => ({}),
  getDatabase: () => ({}),
  ref: (db, path) => ({ path }),
  get: async (ref) => {
    const value = mockData[ref.path];
    return { exists: () => value !== undefined, val: () => value };
  },
}));

vi.mock('../../content-renderer.js', () => ({
  renderContent: vi.fn(),
  renderMultipleContent: vi.fn((data, el) => {
    el.textContent = `rendered:${data.length}`;
  }),
}));

describe('view', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockData)) delete mockData[key];
  });

  describe('resolveDayIndex', () => {
    it('uses the Day Index from the URL when provided, without consulting Today\'s Day Index', async () => {
      const { getTodayDayIndex } = await import('../../date-utils.js');
      const result = await resolveDayIndex('class1', '12');
      expect(result).toBe(12);
      expect(getTodayDayIndex).not.toHaveBeenCalled();
    });

    it("falls back to today's Day Index when the URL has none", async () => {
      const result = await resolveDayIndex('class1', null);
      expect(result).toBe(7);
    });
  });

  describe('fetchPages', () => {
    it('fetches every page in parallel, keyed by Lesson id', async () => {
      mockData['content/hashA'] = { title: 'A' };
      mockData['content/hashB'] = { title: 'B' };

      const result = await fetchPages(['hashA', 'hashB']);

      expect(result).toEqual({ hashA: { title: 'A' }, hashB: { title: 'B' } });
    });

    it('returns an empty cache for an empty list', async () => {
      expect(await fetchPages([])).toEqual({});
    });
  });

  describe('loadContent', () => {
    it('shows NO_CONTENT_FOR_TODAY when the Schedule for that Day Index is empty', async () => {
      mockData['schedule/class1/3'] = [];
      const contentEl = document.createElement('div');

      await loadContent('class1', 3, contentEl);

      expect(contentEl.textContent).toBe(NO_CONTENT_FOR_TODAY);
    });

    it('shows NO_CONTENT_FOR_TODAY when the Day Index has no Schedule entry at all', async () => {
      const contentEl = document.createElement('div');

      await loadContent('class1', 3, contentEl);

      expect(contentEl.textContent).toBe(NO_CONTENT_FOR_TODAY);
    });

    it('fetches and renders every Lesson scheduled for that day', async () => {
      mockData['schedule/class1/3'] = ['hashA', 'hashB'];
      mockData['content/hashA'] = { title: 'A' };
      mockData['content/hashB'] = { title: 'B' };
      const contentEl = document.createElement('div');

      await loadContent('class1', 3, contentEl);

      expect(contentEl.textContent).toBe('rendered:2');
    });

    it('skips a scheduled Lesson id whose content is missing', async () => {
      mockData['schedule/class1/3'] = ['hashA', 'missingHash'];
      mockData['content/hashA'] = { title: 'A' };
      const contentEl = document.createElement('div');

      await loadContent('class1', 3, contentEl);

      expect(contentEl.textContent).toBe('rendered:1');
    });
  });
});
