import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  debounce,
  isFirstVisitInAWhile,
  markVisit,
  getSavedScrollPosition,
  saveScrollPosition,
  loadClasses,
  getDateForDayIndex,
  applyDateOffset,
  showScheduleError,
  renderScheduleTable,
  createFinalRow,
  handleScrollPositioning,
  scrollToToday,
  loadFullSchedule,
  initializeDateOffsetControl,
  initializeTeacherApp,
} from '../../teacher.js';

// firebase-app.js and firebase-database.js both alias to this same mock
// module (see vitest.config.js) since teacher.js pulls in firebase-config.js,
// which imports from both.
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

vi.mock('../../date-utils.js', () => ({
  // constants.js re-exports this from date-utils.js, and teacher.js imports
  // it from constants.js - needs to be here for that chain to resolve.
  DEFAULT_CLASS_START_DATE: '2024-08-19',
  initializeDateUtils: vi.fn(),
  getDateForDayIndex: vi.fn(async (dayIndex, classId) => `date-for-${classId}-${dayIndex}`),
  getTodayDayIndex: vi.fn(async () => 10),
  getClassDateOffset: vi.fn(async () => 5),
  setClassDateOffset: vi.fn(async () => {}),
}));

vi.mock('../../notification-utils.js', () => ({
  showNotification: vi.fn(),
}));

vi.mock('../../lesson-search.js', () => ({
  initializeLessonSearch: vi.fn(),
}));

const mockCreateDateOffsetControl = vi.fn((config) => {
  const el = document.createElement('div');
  el.__config = config;
  el.updateOffset = vi.fn(async () => {});
  return el;
});
vi.mock('../../ui-components.js', () => ({
  createDateOffsetControl: (config) => mockCreateDateOffsetControl(config),
}));

vi.mock('../../database-utils.js', () => ({
  initializeDatabase: vi.fn(),
}));

vi.mock('../../error-ui-utils.js', () => ({
  showErrorState: vi.fn(),
}));

const mockGetLessonTitles = vi.fn(async () => []);
vi.mock('../../schedule-day-view.js', () => ({
  createDayRow: vi.fn(async (dayIndex) => {
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
  createEndButtonsContainer: vi.fn(() => document.createElement('div')),
  makeInsertDayHandler: vi.fn(() => vi.fn()),
  makeDeleteDayHandler: vi.fn(() => vi.fn()),
  getLessonTitles: (...args) => mockGetLessonTitles(...args),
}));

vi.mock('../../teacher-nav.js', () => ({
  renderTeacherNav: vi.fn(),
}));

function scheduleFixture() {
  document.body.innerHTML = `
    <select id="classSelect"><option value="csa">CSA</option></select>
    <table id="scheduleTable"><tbody></tbody></table>
    <div id="dateOffsetContainer"></div>
    <div id="schedulePane"></div>
    <div id="schedule-loading-state"></div>
  `;
}

describe('teacher', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockData)) delete mockData[key];
    localStorage.clear();
    vi.clearAllMocks();
    mockGetLessonTitles.mockReset().mockResolvedValue([]);
  });

  describe('debounce', () => {
    it('calls the wrapped function once after the wait, given rapid calls', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 500);

      debounced();
      debounced();
      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('isFirstVisitInAWhile / markVisit', () => {
    it('is true with no recorded visit', () => {
      expect(isFirstVisitInAWhile()).toBe(true);
    });

    it('is false right after markVisit()', () => {
      markVisit();
      expect(isFirstVisitInAWhile()).toBe(false);
    });

    it('is true again after the visit timeout has passed', () => {
      const old = Date.now() - 11 * 60 * 1000; // 11 minutes ago
      localStorage.setItem('teacher-schedule-last-visit', old.toString());
      expect(isFirstVisitInAWhile()).toBe(true);
    });
  });

  describe('saveScrollPosition / getSavedScrollPosition', () => {
    it('round-trips a scroll position for the same Class', () => {
      document.body.innerHTML = '<div id="schedulePane"></div>';
      document.getElementById('schedulePane').scrollTop = 250;

      saveScrollPosition('csa');
      const saved = getSavedScrollPosition('csa');

      expect(saved.scrollTop).toBe(250);
      expect(saved.classId).toBe('csa');
    });

    it('returns null for a different Class than the one saved', () => {
      document.body.innerHTML = '<div id="schedulePane"></div>';
      saveScrollPosition('csa');
      expect(getSavedScrollPosition('csp')).toBeNull();
    });

    it('does nothing without a schedulePane element', () => {
      document.body.innerHTML = '';
      expect(() => saveScrollPosition('csa')).not.toThrow();
    });
  });

  describe('loadClasses', () => {
    it('populates the select, sorted by displayOrder', async () => {
      mockData['classes'] = {
        csp: { name: 'CS Principles', displayOrder: 2 },
        csa: { name: 'CS A', displayOrder: 1 },
      };
      const select = document.createElement('select');

      await loadClasses(select);

      expect([...select.options].map((o) => o.value)).toEqual(['csa', 'csp']);
      expect([...select.options].map((o) => o.textContent)).toEqual(['CS A', 'CS Principles']);
    });

    it('preselects the Class named in the URL, if present', async () => {
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search: '?class=csa' },
        writable: true,
        configurable: true,
      });
      const select = document.createElement('select');

      await loadClasses(select);

      expect(select.value).toBe('csa');
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
    });
  });

  describe('getDateForDayIndex', () => {
    it('forwards to the shared date-utils implementation with the given Class', async () => {
      const result = await getDateForDayIndex(5, 'csa');
      expect(result).toBe('date-for-csa-5');
    });
  });

  describe('applyDateOffset', () => {
    it('persists the new offset and reloads the schedule', async () => {
      scheduleFixture();
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockData['schedule/csa'] = {};
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');

      await applyDateOffset(3, 'csa');

      expect(setClassDateOffset).toHaveBeenCalledWith('csa', 3);
      expect(showNotification).toHaveBeenCalledWith('Date offset updated successfully!', 'success');
    });

    it('shows an error notification and rethrows on failure', async () => {
      const { setClassDateOffset } = await import('../../date-utils.js');
      const { showNotification } = await import('../../notification-utils.js');
      setClassDateOffset.mockRejectedValueOnce(new Error('boom'));

      await expect(applyDateOffset(3, 'csa')).rejects.toThrow('boom');
      expect(showNotification).toHaveBeenCalledWith('Failed to update date offset', 'error');
    });
  });

  describe('showScheduleError', () => {
    it('shows the error state in the schedule loading container', async () => {
      const { showErrorState } = await import('../../error-ui-utils.js');
      showScheduleError();
      expect(showErrorState).toHaveBeenCalledWith({
        container: 'schedule-loading-state',
        title: 'Unable to load schedule',
      });
    });
  });

  describe('renderScheduleTable', () => {
    it('renders a day row for every index from 0 to the max, plus a final add-day row', async () => {
      scheduleFixture();
      await renderScheduleTable({ 0: ['hashA'], 2: ['hashB'] }, 'csa');

      const tbody = document.querySelector('#scheduleTable tbody');
      const dayRows = [...tbody.querySelectorAll('.day-row')].map((r) => r.dataset.dayIndex);
      expect(dayRows).toEqual(['0', '1', '2']);
      // One insert-day row before each day (the trailing "add a day" row is
      // a distinct row built by createFinalRow, not another insert-day row)
      expect(tbody.querySelectorAll('.insert-day-row')).toHaveLength(3);
      expect(tbody.children).toHaveLength(7); // 3 insert + 3 day + 1 final
    });

    it('preloads lesson titles for every Lesson across the whole Schedule', async () => {
      scheduleFixture();
      await renderScheduleTable({ 0: ['hashA'], 1: ['hashB', 'hashC'] }, 'csa');

      expect(mockGetLessonTitles).toHaveBeenCalledWith(expect.anything(), ['hashA', 'hashB', 'hashC']);
    });

    it('scopes the delete/insert handlers to the given Class and its max Day Index', async () => {
      scheduleFixture();
      const { makeDeleteDayHandler, makeInsertDayHandler } = await import('../../schedule-day-view.js');

      await renderScheduleTable({ 0: [], 4: [] }, 'csa');

      expect(makeDeleteDayHandler).toHaveBeenCalledWith('csa', loadFullSchedule);
      expect(makeInsertDayHandler).toHaveBeenCalledWith('csa', 4, loadFullSchedule);
    });

    it('handles an empty Schedule as a single day 0 plus the add-day row', async () => {
      scheduleFixture();
      await renderScheduleTable({}, 'csa');

      const tbody = document.querySelector('#scheduleTable tbody');
      expect([...tbody.querySelectorAll('.day-row')].map((r) => r.dataset.dayIndex)).toEqual(['0']);
    });
  });

  describe('createFinalRow', () => {
    it('renders the next Day Index, its date, and end-buttons', async () => {
      const ctx = { classId: 'csa', db: {}, onReload: vi.fn() };
      const row = await createFinalRow(7, ctx);

      const cells = row.querySelectorAll('td');
      expect(cells[0].textContent).toBe('7');
      expect(cells[1].textContent).toBe('date-for-csa-7');
      expect(cells[2].className).toBe('lessons-cell');
    });
  });

  describe('handleScrollPositioning', () => {
    it("scrolls to today's row on a first visit in a while", async () => {
      vi.useFakeTimers();
      document.body.innerHTML = '<div id="schedulePane"></div><tr class="today-row"></tr>';

      await handleScrollPositioning('csa');
      vi.advanceTimersByTime(150);

      expect(localStorage.getItem('teacher-schedule-last-visit')).not.toBeNull();
      vi.useRealTimers();
    });

    it('restores the saved scroll position on a recent revisit instead', async () => {
      vi.useFakeTimers();
      document.body.innerHTML = '<div id="schedulePane"></div>';
      markVisit(); // not a first visit
      saveScrollPosition('csa');
      const schedulePane = document.getElementById('schedulePane');
      Object.defineProperty(schedulePane, 'scrollTop', { value: 0, writable: true });

      const savedData = getSavedScrollPosition('csa');
      savedData.scrollTop = 321;
      localStorage.setItem('teacher-schedule-scroll', JSON.stringify(savedData));

      await handleScrollPositioning('csa');
      vi.advanceTimersByTime(150);

      expect(schedulePane.scrollTop).toBe(321);
      vi.useRealTimers();
    });

    it('does nothing without a schedulePane element', async () => {
      document.body.innerHTML = '';
      await expect(handleScrollPositioning('csa')).resolves.toBeUndefined();
    });
  });

  describe('scrollToToday', () => {
    it('does nothing when there is no today-row', () => {
      document.body.innerHTML = '<div id="schedulePane"></div>';
      expect(() => scrollToToday()).not.toThrow();
    });

    it('calls scrollTo on the schedule pane when a today-row exists', () => {
      document.body.innerHTML = '<div id="schedulePane"><table><tr class="today-row"></tr></table></div>';
      const schedulePane = document.getElementById('schedulePane');
      schedulePane.scrollTo = vi.fn();

      scrollToToday();

      expect(schedulePane.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });
  });

  describe('loadFullSchedule', () => {
    it('loads the offset and schedule for the selected Class and renders the table', async () => {
      scheduleFixture();
      mockData['schedule/csa'] = { 0: ['hashA'] };

      await loadFullSchedule();

      const tbody = document.querySelector('#scheduleTable tbody');
      expect(tbody.querySelectorAll('.day-row')).toHaveLength(1);
    });

    it('does nothing when no Class is selected', async () => {
      scheduleFixture();
      document.getElementById('classSelect').innerHTML = '<option value=""></option>';

      await expect(loadFullSchedule()).resolves.toBeUndefined();
      expect(document.querySelector('#scheduleTable tbody').innerHTML).toBe('');
    });

    it('shows the schedule error state if loading fails', async () => {
      scheduleFixture();
      const { get } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js');
      const { getClassDateOffset } = await import('../../date-utils.js');
      const { showErrorState } = await import('../../error-ui-utils.js');
      getClassDateOffset.mockRejectedValueOnce(new Error('network down'));

      await loadFullSchedule();

      expect(showErrorState).toHaveBeenCalledWith(
        expect.objectContaining({ container: 'schedule-loading-state' })
      );
    });
  });

  describe('initializeDateOffsetControl', () => {
    it('wires onApply/computeTodayDayIndex/onGoToToday and mounts the control', () => {
      scheduleFixture();
      initializeDateOffsetControl();

      const config = mockCreateDateOffsetControl.mock.calls[0][0];
      expect(config.onApply).toBe(applyDateOffset);
      expect(typeof config.computeTodayDayIndex).toBe('function');
      expect(typeof config.onGoToToday).toBe('function');
      expect(document.getElementById('dateOffsetContainer').children).toHaveLength(1);
    });
  });

  describe('initializeTeacherApp', () => {
    it('loads classes, sets up the offset control, and loads the schedule', async () => {
      scheduleFixture();
      mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
      mockData['schedule/csa'] = {};

      await initializeTeacherApp();

      expect(document.getElementById('classSelect').options.length).toBeGreaterThan(0);
      expect(document.getElementById('dateOffsetContainer').children).toHaveLength(1);
      expect(document.querySelector('#scheduleTable tbody').children.length).toBeGreaterThan(0);
    });

    it('shows the schedule error state if initialization fails', async () => {
      scheduleFixture();
      // No 'classes' data at all - snap.val() is null, Object.entries(null) throws
      const { showErrorState } = await import('../../error-ui-utils.js');

      await initializeTeacherApp();

      expect(showErrorState).toHaveBeenCalled();
    });
  });
});
