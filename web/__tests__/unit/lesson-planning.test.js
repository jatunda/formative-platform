import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getShiftMagnitude,
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
  initializeDateUtils: vi.fn(),
  getDateForDayIndex: vi.fn(async (dayIndex) => `date-for-${dayIndex}`),
  getTodayDayIndex: vi.fn(async () => 10),
  getClassDateOffset: vi.fn(async (classId) => ({ csa: 5, csp: 2 })[classId] ?? 0),
  setClassDateOffset: vi.fn(async () => {}),
}));

vi.mock('../../notification-utils.js', () => ({
  showNotification: vi.fn(),
}));

vi.mock('../../lesson-search.js', () => ({
  initializeLessonSearch: vi.fn(),
}));

const mockGetFullSchedule = vi.fn();
vi.mock('../../database-utils.js', () => ({
  initializeDatabase: vi.fn(),
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
}));

describe('lesson-planning', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockData)) delete mockData[key];
    fetchClassesError = null;
    vi.clearAllMocks();
    mockGetFullSchedule.mockReset();
    mockGetLessonTitles.mockReset().mockResolvedValue([]);
  });

  describe('getShiftMagnitude', () => {
    it('returns the parsed positive value', () => {
      expect(getShiftMagnitude({ value: '3' })).toBe(3);
    });

    it('takes the absolute value of a negative input', () => {
      expect(getShiftMagnitude({ value: '-4' })).toBe(4);
    });

    it('defaults to 1 for zero', () => {
      expect(getShiftMagnitude({ value: '0' })).toBe(1);
    });

    it('defaults to 1 for non-numeric input', () => {
      expect(getShiftMagnitude({ value: 'abc' })).toBe(1);
    });
  });

  describe('initializeBulkShiftControl', () => {
    it('renders a magnitude input and +/- buttons into the container', () => {
      document.body.innerHTML = '<div id="bulkShiftContainer"></div>';
      initializeBulkShiftControl();

      const container = document.getElementById('bulkShiftContainer');
      expect(container.querySelector('#bulkShiftAmount').value).toBe('1');
      const buttons = [...container.querySelectorAll('button')].map((b) => b.textContent);
      expect(buttons).toEqual(['−', '+']);
    });

    it('wires the buttons to shift every class by the entered magnitude', async () => {
      document.body.innerHTML = '<div id="bulkShiftContainer"></div><div id="classPanesContainer"></div>';
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockGetFullSchedule.mockResolvedValue({});
      const { setClassDateOffset } = await import('../../date-utils.js');

      initializeBulkShiftControl();
      document.getElementById('bulkShiftAmount').value = '3';
      document.querySelector('#bulkShiftContainer button:last-child').click();
      await vi.waitFor(() => expect(setClassDateOffset).toHaveBeenCalled());

      expect(setClassDateOffset).toHaveBeenCalledWith('csa', 5 + 3);
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

    it('shows a success notification describing the shift', async () => {
      document.body.innerHTML = '<div id="classPanesContainer"></div>';
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockGetFullSchedule.mockResolvedValue({});
      const { showNotification } = await import('../../notification-utils.js');

      await applyBulkShift(-1);

      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('-1 day.'), 'success');
    });

    it('does nothing when there are no classes', async () => {
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');

      await applyBulkShift(1);

      expect(setClassDateOffset).not.toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it('shows an error notification if the shift fails', async () => {
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

      expect(mockGetLessonTitles).toHaveBeenCalledWith(expect.anything(), ['hashA', 'hashB']);
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
      expect(config.onGoToToday).toBeUndefined();
    });

    it("computeTodayDayIndex is wired to this Class's Today's Day Index", async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');
      const { getTodayDayIndex } = await import('../../date-utils.js');

      await renderClassPane('csa', 'CS A', containerEl);
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      getTodayDayIndex.mockClear();
      await config.computeTodayDayIndex();

      expect(getTodayDayIndex).toHaveBeenCalledWith('csa');
    });

    it("onApply persists the new offset, reloads the pane, and notifies with the Class's name", async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');

      await renderClassPane('csa', 'CS A', containerEl);
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      mockCreateDateOffsetControl.mockClear();

      await config.onApply(9);

      expect(setClassDateOffset).toHaveBeenCalledWith('csa', 9);
      // Reloaded: renderClassPane ran again, rebuilding the control
      expect(mockCreateDateOffsetControl).toHaveBeenCalledTimes(1);
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('CS A'), 'success');
    });

    it('onApply shows an error notification and rethrows on failure, without reloading', async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const containerEl = document.createElement('div');
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');
      setClassDateOffset.mockRejectedValueOnce(new Error('boom'));

      await renderClassPane('csa', 'CS A', containerEl);
      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      mockCreateDateOffsetControl.mockClear();

      await expect(config.onApply(9)).rejects.toThrow('boom');

      expect(mockCreateDateOffsetControl).not.toHaveBeenCalled();
      expect(showNotification).toHaveBeenCalledWith('Failed to update date offset', 'error');
    });
  });
});
