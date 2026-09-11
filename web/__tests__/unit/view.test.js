import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveDayIndex, fetchPages, loadContent, initializePage } from '../../view.js';
import { NO_CONTENT_FOR_TODAY } from '../../constants.js';

vi.mock('../../date-utils.js', () => ({
  initializeDateUtils: vi.fn(),
  getTodayDayIndex: vi.fn(async () => 7),
}));

let capturedTimeoutOptions;
vi.mock('../../error-ui-utils.js', () => ({
  showErrorState: vi.fn(),
  showSlowConnectionMessage: vi.fn(),
  withConnectionTimeout: vi.fn((promise, options) => {
    capturedTimeoutOptions = options;
    return promise;
  }),
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
    if (value instanceof Error) throw value;
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
    capturedTimeoutOptions = undefined;
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

  describe('initializePage', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="content"><div id="content-loading"></div></div>';
    });

    it('wraps the load in withConnectionTimeout and renders normally on success', async () => {
      window.history.pushState(null, '', '?class=class1&day=3');
      mockData['schedule/class1/3'] = ['hashA'];
      mockData['content/hashA'] = { title: 'A' };
      const { withConnectionTimeout } = await import('../../error-ui-utils.js');

      await initializePage();

      expect(withConnectionTimeout).toHaveBeenCalled();
      expect(document.getElementById('content').textContent).toBe('rendered:1');
    });

    it("wires onSlow to swap the content area's caption to a Wi-Fi-specific message", async () => {
      window.history.pushState(null, '', '?class=class1&day=3');
      mockData['schedule/class1/3'] = [];
      const { showSlowConnectionMessage } = await import('../../error-ui-utils.js');

      await initializePage();
      capturedTimeoutOptions.onSlow();

      expect(showSlowConnectionMessage).toHaveBeenCalledWith(document.getElementById('content'));
    });

    it('wires onTimeout to show an error state with a Wi-Fi-specific message', async () => {
      window.history.pushState(null, '', '?class=class1&day=3');
      mockData['schedule/class1/3'] = [];
      const { showErrorState } = await import('../../error-ui-utils.js');

      await initializePage();
      capturedTimeoutOptions.onTimeout();

      expect(showErrorState).toHaveBeenCalledWith(expect.objectContaining({
        container: document.getElementById('content'),
        message: expect.stringMatching(/wi-fi/i),
      }));
    });

    it('shows the generic error state if the load itself rejects', async () => {
      window.history.pushState(null, '', '?class=class1&day=3');
      mockData['schedule/class1/3'] = new Error('network down');
      const { showErrorState } = await import('../../error-ui-utils.js');

      await initializePage();

      expect(showErrorState).toHaveBeenCalledWith(expect.objectContaining({
        container: document.getElementById('content'),
        title: 'Unable to load lesson',
      }));
    });
  });
});
