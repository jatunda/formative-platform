import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expectConsoleErrors } from '../helpers/quiet-console.js';
import {
  initializeBulkShiftControl,
  applyBulkShift,
  loadAndRenderAllPanes,
  renderClassPane,
} from '../../lesson-planning.js';

// firebase-app.js and firebase-database.js both alias to this same mock
// module (see vitest.config.js) since lesson-planning.js pulls in
// firebase-config.js, which imports from both.
const mockData = {};
let fetchClassesError = null;
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  initializeApp: () => ({}),
  getDatabase: () => ({}),
  connectDatabaseEmulator: () => {},
  ref: (db, path) => ({ path }),
  get: async (ref) => {
    if (ref.path === 'classes' && fetchClassesError) {
      throw fetchClassesError;
    }
    const value = mockData[ref.path];
    return { exists: () => value !== undefined, val: () => value };
  },
}));

vi.mock('../../date-utils.js', () => ({
  getDayDateLabels: vi.fn(async (dayIndex) => ({ full: `date-for-${dayIndex}`, short: `short-${dayIndex}` })),
  getTodayDayIndex: vi.fn(async () => 10),
  getClassDateOffset: vi.fn(async (classId) => ({ csa: 5, csp: 2 })[classId] ?? 0),
  setClassDateOffset: vi.fn(async () => {}),
}));

vi.mock('../../notification-utils.js', () => ({
  showNotification: vi.fn(),
}));

vi.mock('../../lesson-search.js', () => ({
}));

const mockGetFullSchedule = vi.fn();
vi.mock('../../database-utils.js', () => ({
  getFullSchedule: (...args) => mockGetFullSchedule(...args),
}));

vi.mock('../../error-ui-utils.js', () => ({
  showErrorState: vi.fn(),
}));

const mockGetLessonTitles = vi.fn(async () => []);
vi.mock('../../schedule-day-view.js', () => ({
  createDayRow: vi.fn(async (dayIndex, lessons, todayDayIndex, dateLabel, ctx) => {
    const tr = document.createElement('tr');
    tr.className = 'day-row';
    tr.dataset.dayIndex = dayIndex;
    return tr;
  }),
  createInsertDayRow: vi.fn((dayIndex) => {
    const tr = document.createElement('tr');
    tr.className = 'insert-day-row';
    tr.dataset.beforeDayIndex = dayIndex;
    return tr;
  }),
  makeInsertDayHandler: vi.fn(() => vi.fn()),
  makeDeleteDayHandler: vi.fn(() => vi.fn()),
  getLessonTitles: (...args) => mockGetLessonTitles(...args),
}));

vi.mock('../../teacher-nav.js', () => ({
  renderTeacherNav: vi.fn(),
}));

const mockCreateDateOffsetControl = vi.fn((config) => {
  const el = document.createElement('div');
  el.className = 'date-offset-control';
  el.__config = config;
  return el;
});
vi.mock('../../ui-components.js', () => ({
  createDateOffsetControl: (config) => mockCreateDateOffsetControl(config),
  withWorkingIndicator: (btn, onClick) => onClick,
}));

describe('lesson-planning', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockData)) delete mockData[key];
    fetchClassesError = null;
    vi.clearAllMocks();
    mockGetFullSchedule.mockReset();
    mockGetLessonTitles.mockReset().mockResolvedValue([]);
  });

  describe('initializeBulkShiftControl', () => {
    it('mounts the shared Skip/Delay control, with no current offset, into the container', () => {
      document.body.innerHTML = '<div id="bulkShiftContainer"></div>';
      initializeBulkShiftControl();

      const container = document.getElementById('bulkShiftContainer');
      expect(container.querySelector('.date-offset-control')).toBeTruthy();
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      expect(config.label).toBe('All classes:');
      expect(config.currentOffset).toBeUndefined();
      expect(config.onShift).toBe(applyBulkShift);
    });
  });

  describe('applyBulkShift', () => {
    it("shifts every Class's Date Offset by delta", async () => {
      document.body.innerHTML = '<div id="classPanesContainer"></div>';
      mockData['classes'] = {
        csa: { name: 'CS A', displayOrder: 1 },
        csp: { name: 'CS P', displayOrder: 2 },
      };
      mockGetFullSchedule.mockResolvedValue({});
      const { setClassDateOffset } = await import('../../date-utils.js');

      await applyBulkShift(2);

      expect(setClassDateOffset).toHaveBeenCalledWith('csa', 7);
      expect(setClassDateOffset).toHaveBeenCalledWith('csp', 4);
    });

    it('shows a success notification saying what the shift did', async () => {
      document.body.innerHTML = '<div id="classPanesContainer"></div>';
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockGetFullSchedule.mockResolvedValue({});
      const { showNotification } = await import('../../notification-utils.js');

      await applyBulkShift(-1);
      expect(showNotification).toHaveBeenLastCalledWith('Skipped all classes ahead 1 day.', 'success');

      await applyBulkShift(3);
      expect(showNotification).toHaveBeenLastCalledWith('Delayed all classes 3 days.', 'success');
    });

    it('does nothing when there are no classes', async () => {
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');

      await applyBulkShift(1);

      expect(setClassDateOffset).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it('shows an error notification if the shift fails', async () => {
      expectConsoleErrors();
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      const { getClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');
      getClassDateOffset.mockRejectedValueOnce(new Error('boom'));

      await applyBulkShift(1);

      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    });
  });

  describe('loadAndRenderAllPanes', () => {
    it('shows "No classes found." when there are no classes', async () => {
      document.body.innerHTML = '<div id="classPanesContainer"></div>';
      mockData['classes'] = {};

      await loadAndRenderAllPanes();

      expect(document.getElementById('classPanesContainer').textContent).toBe('No classes found.');
    });

    it('renders one pane per Class, sorted by displayOrder', async () => {
      document.body.innerHTML = '<div id="classPanesContainer"></div>';
      mockData['classes'] = {
        csp: { name: 'CS Principles', displayOrder: 2 },
        csa: { name: 'CS A', displayOrder: 1 },
      };
      mockGetFullSchedule.mockResolvedValue({});

      await loadAndRenderAllPanes();

      const headings = [...document.querySelectorAll('.lesson-planning-pane h2')].map((h) => h.textContent);
      expect(headings).toEqual(['CS A', 'CS Principles']);
    });

    it('shows an error state if loading classes fails', async () => {
      expectConsoleErrors();
      document.body.innerHTML = '<div id="classPanesContainer"></div>';
      const { showErrorState } = await import('../../error-ui-utils.js');
      fetchClassesError = new Error('network down');

      await loadAndRenderAllPanes();

      expect(showErrorState).toHaveBeenCalledWith(
        expect.objectContaining({ container: 'classPanesContainer', title: 'Unable to load classes' })
      );
    });
  });

  describe('renderClassPane', () => {
    it("renders the Planning Window: today's Day Index plus the following two", async () => {
      mockGetFullSchedule.mockResolvedValue({ 10: ['hashA'], 11: [], 12: ['hashB'] });
      const containerEl = document.createElement('div');

      await renderClassPane('csa', 'CS A', containerEl);

      const dayRows = [...containerEl.querySelectorAll('.day-row')].map((r) => r.dataset.dayIndex);
      expect(dayRows).toEqual(['10', '11', '12']);
    });

    it('brackets the window with an insert-day row before and after', async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');

      await renderClassPane('csa', 'CS A', containerEl);

      const rows = [...containerEl.querySelectorAll('tbody > tr')];
      expect(rows[0].className).toBe('insert-day-row');
      expect(rows[0].dataset.beforeDayIndex).toBe('10');
      expect(rows.at(-1).className).toBe('insert-day-row');
      expect(rows.at(-1).dataset.beforeDayIndex).toBe('13');
    });

    it('only preloads lesson titles for hashes inside the Planning Window', async () => {
      mockGetFullSchedule.mockResolvedValue({
        9: ['outsideWindow'],
        10: ['hashA'],
        12: ['hashB'],
        20: ['farOutside'],
      });
      const containerEl = document.createElement('div');

      await renderClassPane('csa', 'CS A', containerEl);

      expect(mockGetLessonTitles).toHaveBeenCalledWith(['hashA', 'hashB']);
    });

    it("builds delete/insert handlers scoped to this Class and today's max Day Index", async () => {
      mockGetFullSchedule.mockResolvedValue({ 5: ['a'], 10: ['b'] });
      const { makeDeleteDayHandler, makeInsertDayHandler } = await import('../../schedule-day-view.js');
      const containerEl = document.createElement('div');

      await renderClassPane('csa', 'CS A', containerEl);

      expect(makeDeleteDayHandler).toHaveBeenCalledWith('csa', expect.any(Function));
      expect(makeInsertDayHandler).toHaveBeenCalledWith('csa', 10, expect.any(Function));
    });

    it('renders the Class name heading alongside a Date Offset control, with no Go-to-Today', async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');

      await renderClassPane('csa', 'CS A', containerEl);

      const header = containerEl.querySelector('.lesson-planning-pane-header');
      expect(header.querySelector('h2').textContent).toBe('CS A');
      expect(header.querySelector('.date-offset-control')).toBeTruthy();
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      expect(config.currentOffset).toBe(5); // csa's mocked offset
      expect(config.computeTodayDayIndex).toBeUndefined();
      expect(config.onGoToToday).toBeUndefined();
    });

    it("onShift persists the shifted offset, reloads the pane, and notifies with the Class's name", async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');

      await renderClassPane('csa', 'CS A', containerEl);
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      mockCreateDateOffsetControl.mockClear();

      await config.onShift(4);

      expect(setClassDateOffset).toHaveBeenCalledWith('csa', 5 + 4);
      // Reloaded: renderClassPane ran again, rebuilding the control
      expect(mockCreateDateOffsetControl).toHaveBeenCalledTimes(1);
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('CS A'), 'success');
    });

    it('onShift shows an error notification and rethrows on failure, without reloading', async () => {
      expectConsoleErrors();
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');
      setClassDateOffset.mockRejectedValueOnce(new Error('boom'));

      await renderClassPane('csa', 'CS A', containerEl);
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      mockCreateDateOffsetControl.mockClear();

      await expect(config.onShift(4)).rejects.toThrow('boom');

      expect(mockCreateDateOffsetControl).not.toHaveBeenCalled();
      expect(showNotification).toHaveBeenCalledWith('Failed to update date offset', 'error');
    });
  });
});
