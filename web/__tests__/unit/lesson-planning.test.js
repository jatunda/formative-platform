import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expectConsoleErrors } from '../helpers/quiet-console.js';
import { lineIcon } from '../../line-icons.js';
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
  getDateForDayIndex: vi.fn(async (dayIndex) => `date-for-${dayIndex}`),
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
  addInsertDayPlus: vi.fn((dayRow, insertAt, onInsert, edge) => {
    dayRow.dataset.plusBelow = `${insertAt}:${edge}`;
  }),
  makeInsertDayHandler: vi.fn(() => vi.fn()),
  makeDeleteDayHandler: vi.fn(() => vi.fn()),
  getLessonTitles: (...args) => mockGetLessonTitles(...args),
}));

vi.mock('../../teacher-nav.js', async (importOriginal) => ({
  ...(await importOriginal()),
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
  createStyledButton: (text, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.onclick = onClick;
    return btn;
  },
  createIconButton: (icon, label, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = icon;
    btn.setAttribute('aria-label', label);
    btn.onclick = onClick;
    return btn;
  },
}));

const dayIndicesShown = (containerEl) =>
  [...containerEl.querySelectorAll('.day-row')].map((r) => r.dataset.dayIndex);
const resizeButton = (containerEl, text) =>
  [...containerEl.querySelectorAll('.planning-window-resize button')].find((b) => b.textContent === text);

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

    describe('resizing the Planning Window', () => {
      it('"+3 days" adds three more Day Indices', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        await resizeButton(containerEl, '+3 days').onclick();

        expect(dayIndicesShown(containerEl)).toEqual(['10', '11', '12', '13', '14', '15']);
        await resizeButton(containerEl, '+3 days').onclick();
        expect(dayIndicesShown(containerEl)).toHaveLength(9);
      });

      it('"−3 days" removes three, and is disabled at 3', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);
        expect(resizeButton(containerEl, '−3 days').disabled).toBe(true);

        await resizeButton(containerEl, '+3 days').onclick();
        expect(resizeButton(containerEl, '−3 days').disabled).toBe(false);
        await resizeButton(containerEl, '−3 days').onclick();

        expect(dayIndicesShown(containerEl)).toEqual(['10', '11', '12']);
        expect(resizeButton(containerEl, '−3 days').disabled).toBe(true);
      });

      it('places the buttons under the table', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        expect(containerEl.lastElementChild.classList.contains('planning-window-resize')).toBe(true);
      });

      it('leaves other Classes unaffected', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const csaEl = document.createElement('div');
        const cspEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', csaEl);
        await renderClassPane('csp', 'CS P', cspEl);

        await resizeButton(csaEl, '+3 days').onclick();

        expect(dayIndicesShown(cspEl)).toEqual(['10', '11', '12']);
      });

      it("keeps its size across the pane's own re-renders (e.g. a Date Offset change)", async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);
        await resizeButton(containerEl, '+3 days').onclick();

        const config = mockCreateDateOffsetControl.mock.calls.at(-1)[0];
        await config.onShift(1);

        expect(dayIndicesShown(containerEl)).toHaveLength(6);
      });

      it('keeps its size when a day-row action reloads the pane', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const { createDayRow } = await import('../../schedule-day-view.js');
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);
        await resizeButton(containerEl, '+3 days').onclick();

        const ctx = createDayRow.mock.calls.at(-1)[4];
        await ctx.onReload();

        expect(dayIndicesShown(containerEl)).toHaveLength(6);
      });

      it('starts every freshly rendered pane (e.g. after a page reload) at 3', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);
        await resizeButton(containerEl, '+3 days').onclick();

        const freshEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', freshEl);

        expect(dayIndicesShown(freshEl)).toEqual(['10', '11', '12']);
      });
    });

    describe('collapsing a Class', () => {
      const chevron = (containerEl) => containerEl.querySelector('.lesson-planning-pane-header button[aria-expanded]');
      const isShown = (el) => el !== null && !el.hidden;
      const bodyShown = (containerEl) => ({
        table: isShown(containerEl.querySelector('.schedule-pane')),
        resize: isShown(containerEl.querySelector('.planning-window-resize')),
        offset: isShown(containerEl.querySelector('.date-offset-control')),
      });

      it('puts an expanded chevron button before the Class name', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        const header = containerEl.querySelector('.lesson-planning-pane-header');
        expect(header.firstElementChild).toBe(chevron(containerEl));
        expect(chevron(containerEl).getAttribute('aria-expanded')).toBe('true');
        expect(chevron(containerEl).textContent).toBe('▾');
        expect(bodyShown(containerEl)).toEqual({ table: true, resize: true, offset: true });
      });

      it('hides the table, window-size buttons and Date Offset control when clicked, and shows them again', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        await chevron(containerEl).onclick();

        expect(chevron(containerEl).getAttribute('aria-expanded')).toBe('false');
        expect(chevron(containerEl).textContent).toBe('▸');
        expect(bodyShown(containerEl)).toEqual({ table: false, resize: false, offset: false });
        expect(containerEl.querySelector('h2').textContent).toBe('CS A');

        await chevron(containerEl).onclick();

        expect(chevron(containerEl).getAttribute('aria-expanded')).toBe('true');
        expect(bodyShown(containerEl)).toEqual({ table: true, resize: true, offset: true });
      });

      it("stays collapsed, at its widened size, across the pane's own re-renders", async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const { createDayRow } = await import('../../schedule-day-view.js');
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);
        await resizeButton(containerEl, '+3 days').onclick();
        await chevron(containerEl).onclick();

        await createDayRow.mock.calls.at(-1)[4].onReload();

        expect(chevron(containerEl).getAttribute('aria-expanded')).toBe('false');
        expect(bodyShown(containerEl).table).toBe(false);
        await chevron(containerEl).onclick();
        expect(dayIndicesShown(containerEl)).toHaveLength(6);
      });

      it('keeps each pane\'s collapse state and window size across the all-classes shift', async () => {
        document.body.innerHTML = '<div id="classPanesContainer"></div>';
        mockData['classes'] = {
          csa: { name: 'CS A', displayOrder: 1 },
          csp: { name: 'CS P', displayOrder: 2 },
        };
        mockGetFullSchedule.mockResolvedValue({});
        await loadAndRenderAllPanes();
        const [csaEl, cspEl] = document.querySelectorAll('.lesson-planning-pane');
        await resizeButton(csaEl, '+3 days').onclick();
        await chevron(cspEl).onclick();

        await applyBulkShift(1);

        const [csaAfter, cspAfter] = document.querySelectorAll('.lesson-planning-pane');
        expect(dayIndicesShown(csaAfter)).toHaveLength(6);
        expect(chevron(csaAfter).getAttribute('aria-expanded')).toBe('true');
        expect(chevron(cspAfter).getAttribute('aria-expanded')).toBe('false');
        expect(bodyShown(cspAfter).table).toBe(false);
      });

      it('shows every Class expanded at 3 days on a fresh load (e.g. a page reload)', async () => {
        document.body.innerHTML = '<div id="classPanesContainer"></div>';
        mockData['classes'] = { csa: { name: 'CS A', displayOrder: 1 } };
        mockGetFullSchedule.mockResolvedValue({});
        await loadAndRenderAllPanes();
        const paneEl = document.querySelector('.lesson-planning-pane');
        await resizeButton(paneEl, '+3 days').onclick();
        await chevron(paneEl).onclick();

        await loadAndRenderAllPanes();

        const freshEl = document.querySelector('.lesson-planning-pane');
        expect(chevron(freshEl).getAttribute('aria-expanded')).toBe('true');
        expect(dayIndicesShown(freshEl)).toEqual(['10', '11', '12']);
      });
    });

    describe('Full schedule link', () => {
      const scheduleLink = (containerEl) => containerEl.querySelector('.lesson-planning-pane-header a');

      it("sits right after the Class name and opens that Class's Full Schedule at today, in a new tab", async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        const link = scheduleLink(containerEl);
        expect(containerEl.querySelector('h2').nextElementSibling).toBe(link);
        expect(link.getAttribute('href')).toBe('teacher.html?class=csa&scroll=today');
        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener');
        expect(link.title).toBe('Full schedule');
        expect(link.getAttribute('aria-label')).toBe('Full schedule for CS A');
      });

      it('shows a flat open-in-new icon instead of a text arrow', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        const link = scheduleLink(containerEl);
        expect(link.textContent).toBe('');
        const svg = link.querySelector('svg');
        expect(svg.getAttribute('class')).toBe('line-icon');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.innerHTML).toBe(lineIcon('openInNew', 'line-icon').innerHTML);
      });

      it('stays visible when the Class is collapsed', async () => {
        mockGetFullSchedule.mockResolvedValue({});
        const containerEl = document.createElement('div');
        await renderClassPane('csa', 'CS A', containerEl);

        await containerEl.querySelector('.lesson-planning-pane-header button[aria-expanded]').onclick();

        expect(scheduleLink(containerEl).hidden).toBe(false);
      });
    });

    it('has no Insert Day rows: each day gets a "+" on the line above it, and the last day one below it too', async () => {
      mockGetFullSchedule.mockResolvedValue({});
      const { createDayRow, makeInsertDayHandler, addInsertDayPlus } = await import('../../schedule-day-view.js');
      const containerEl = document.createElement('div');

      await renderClassPane('csa', 'CS A', containerEl);

      const onInsertDay = makeInsertDayHandler.mock.results.at(-1).value;
      const rows = [...containerEl.querySelectorAll('tbody > tr')];
      expect(rows.map((r) => r.className)).toEqual(['day-row', 'day-row', 'day-row']);
      expect(createDayRow.mock.calls.map((c) => c[4].onInsertDay)).toEqual([onInsertDay, onInsertDay, onInsertDay]);
      expect(addInsertDayPlus).toHaveBeenCalledTimes(1);
      expect(rows.at(-1).dataset.plusBelow).toBe('13:below');
      expect(addInsertDayPlus.mock.calls[0][2]).toBe(onInsertDay);
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
