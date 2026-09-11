import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getClassesWithTodaySchedule, renderClassList, loadAndRenderClasses, loadWithErrorHandling } from '../../landing.js';

vi.mock('../../date-utils.js', () => ({
  initializeDateUtils: vi.fn(),
  getTodayDayIndex: vi.fn(async (classId) => ({ csa: 5, csp: 3 })[classId] ?? 0),
  primeDateOffsetCache: vi.fn(),
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
// module (see vitest.config.js) since landing.js pulls in firebase-config.js.
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

describe('landing', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockData)) delete mockData[key];
    capturedTimeoutOptions = undefined;
  });

  describe('getClassesWithTodaySchedule', () => {
    it("returns each Class with today's Day Index and Schedule, sorted by displayOrder", async () => {
      mockData['classes'] = {
        csp: { name: 'CS Principles', displayOrder: 2 },
        csa: { name: 'CS A', displayOrder: 1 },
      };
      mockData['schedule/csa/5'] = ['hashA'];
      mockData['schedule/csp/3'] = [];

      const result = await getClassesWithTodaySchedule();

      expect(result).toEqual([
        { classId: 'csa', name: 'CS A', dayIndex: 5, schedule: ['hashA'] },
        { classId: 'csp', name: 'CS Principles', dayIndex: 3, schedule: [] },
      ]);
    });

    it('returns an empty list when the classes node does not exist', async () => {
      expect(await getClassesWithTodaySchedule()).toEqual([]);
    });

    it('returns an empty list when there are no classes', async () => {
      mockData['classes'] = {};
      expect(await getClassesWithTodaySchedule()).toEqual([]);
    });

    it("defaults a Class's Day Index to 0 if computing it throws", async () => {
      mockData['classes'] = { broken: { name: 'Broken Class', displayOrder: 1 } };
      const { getTodayDayIndex } = await import('../../date-utils.js');
      getTodayDayIndex.mockImplementationOnce(async () => {
        throw new Error('boom');
      });

      const result = await getClassesWithTodaySchedule();

      expect(result[0].dayIndex).toBe(0);
    });

    it('treats a missing Schedule entry as an empty Schedule', async () => {
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      // no schedule/csa/5 entry set at all

      const result = await getClassesWithTodaySchedule();

      expect(result[0].schedule).toEqual([]);
    });

    it("seeds the date offset cache from the classes payload before computing each Class's Day Index, avoiding a redundant per-class Firebase read", async () => {
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1, dateOffset: 3 } };
      const { primeDateOffsetCache } = await import('../../date-utils.js');

      await getClassesWithTodaySchedule();

      expect(primeDateOffsetCache).toHaveBeenCalledWith(mockData['classes']);
    });
  });

  describe('renderClassList', () => {
    it('renders a clickable link for a Class with Lessons today', () => {
      const container = document.createElement('div');
      renderClassList(container, [{ classId: 'csa', name: 'CS A', dayIndex: 5, schedule: ['hashA'] }]);

      const link = container.querySelector('a.class-link');
      expect(link).toBeTruthy();
      expect(link.textContent).toBe('CS A');
      expect(link.getAttribute('href')).toBe('view.html?class=csa&day=5');
    });

    it('renders inactive text for a Class with nothing scheduled today', () => {
      const container = document.createElement('div');
      renderClassList(container, [{ classId: 'csp', name: 'CS Principles', dayIndex: 3, schedule: [] }]);

      const item = container.querySelector('.class-link-inactive');
      expect(item).toBeTruthy();
      expect(item.textContent).toBe('CS Principles - nothing today');
      expect(container.querySelector('a')).toBeNull();
    });

    it('replaces previous content on re-render rather than appending', () => {
      const container = document.createElement('div');
      renderClassList(container, [{ classId: 'csa', name: 'CS A', dayIndex: 5, schedule: ['hashA'] }]);
      renderClassList(container, [{ classId: 'csp', name: 'CS Principles', dayIndex: 3, schedule: [] }]);

      expect(container.children).toHaveLength(1);
    });
  });

  describe('loadAndRenderClasses', () => {
    it('hides the loading state and renders the resolved classes', async () => {
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockData['schedule/csa/5'] = ['hashA'];
      const container = document.createElement('div');
      const loadingState = document.createElement('div');

      await loadAndRenderClasses(container, loadingState);

      expect(loadingState.style.display).toBe('none');
      expect(container.querySelector('a.class-link')).toBeTruthy();
    });

    it('works without a loading state element', async () => {
      mockData['classes'] = {};
      const container = document.createElement('div');

      await expect(loadAndRenderClasses(container, null)).resolves.not.toThrow();
    });
  });

  describe('loadWithErrorHandling', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="class-list"><div id="loading-state"></div></div>';
    });

    it('wraps the load in withConnectionTimeout and renders normally on success', async () => {
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockData['schedule/csa/5'] = ['hashA'];
      const { withConnectionTimeout } = await import('../../error-ui-utils.js');

      await loadWithErrorHandling();

      expect(withConnectionTimeout).toHaveBeenCalled();
      expect(document.querySelector('a.class-link')).toBeTruthy();
    });

    it("wires onSlow to swap the loading state's caption to a Wi-Fi-specific message", async () => {
      mockData['classes'] = {};
      // Captured before the load runs: a successful load's renderClassList
      // wipes #class-list's innerHTML, which detaches this nested element
      // from the document, so re-querying by ID afterward would find nothing.
      const loadingStateEl = document.getElementById('loading-state');
      const { showSlowConnectionMessage } = await import('../../error-ui-utils.js');

      await loadWithErrorHandling();
      capturedTimeoutOptions.onSlow();

      expect(showSlowConnectionMessage).toHaveBeenCalledWith(loadingStateEl);
    });

    it('wires onTimeout to show an error state with a Wi-Fi-specific message, without throwing past loadWithErrorHandling', async () => {
      mockData['classes'] = {};
      const { showErrorState } = await import('../../error-ui-utils.js');

      await loadWithErrorHandling();
      capturedTimeoutOptions.onTimeout();

      expect(showErrorState).toHaveBeenCalledWith(expect.objectContaining({
        container: 'class-list',
        loadingState: 'loading-state',
        message: expect.stringMatching(/wi-fi/i),
      }));
    });

    it('shows the generic error state if the load itself rejects', async () => {
      mockData['classes'] = new Error('network down');
      const { showErrorState } = await import('../../error-ui-utils.js');

      await loadWithErrorHandling();

      expect(showErrorState).toHaveBeenCalledWith(expect.objectContaining({
        container: 'class-list',
        loadingState: 'loading-state',
        title: 'Unable to load lessons',
      }));
    });
  });
});
