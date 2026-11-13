import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import { initializeDatabase } from './database-handle.js';
import {
  getDateForDayIndex,
  getTodayDayIndex,
  getClassDateOffset,
  setClassDateOffset
} from './date-utils.js';
import { showNotification } from './notification-utils.js';
import { createDateOffsetControl } from './ui-components.js';
import {
  getFullSchedule
} from './database-utils.js';
import { showErrorState } from './error-ui-utils.js';
import {
  createDayRow,
  addInsertDayPlus,
  makeInsertDayHandler,
  makeDeleteDayHandler,
  getLessonTitles
} from './schedule-day-view.js';
import { renderTeacherNav } from './teacher-nav.js';
import {
  PLANNING_WINDOW_SIZE,
  createWindowResizeControls,
  createCollapseChevron,
  createFullScheduleLink
} from './class-pane-controls.js';

/**
 * Per-Class pane UI state: the Planning Window's size and whether the pane is
 * collapsed to its header. Not persisted - a page reload starts every Class
 * expanded at PLANNING_WINDOW_SIZE.
 * @typedef {{ windowSize: number, collapsed: boolean }} PaneUiState
 */
/** @type {PaneUiState} */
const DEFAULT_PANE_UI_STATE = { windowSize: PLANNING_WINDOW_SIZE, collapsed: false };

// Each Class's latest pane UI state, so the all-classes Bulk Offset Shift's
// re-render of every pane keeps it. Cleared on a fresh load.
/** @type {Map<string, PaneUiState>} */
const paneUiStates = new Map();

initializeDatabase(db);

// Check authentication before proceeding. Only run automatically when
// actually loaded on lesson-planning.html - importing this module elsewhere
// (tests) never triggers real auth/Firebase/DOM side effects on its own.
if (document.getElementById('classPanesContainer')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) {
      return; // Stop execution if not authenticated
    }

    // Setup activity listeners for session management
    window.teacherAuth.setupActivityListeners();

    main();
  })();
}

async function main() {
  renderTeacherNav('lesson-planning');
  initializeBulkShiftControl();
  await loadAndRenderAllPanes();
}

/**
 * Mount the all-classes Bulk Offset Shift: the shared Skip/Delay control,
 * with no current offset (each Class has its own), applying instantly.
 */
export function initializeBulkShiftControl() {
  const container = document.getElementById('bulkShiftContainer');
  container.appendChild(createDateOffsetControl({
    label: 'All classes:',
    onShift: applyBulkShift
  }));
}

/**
 * Shift every Class's Date Offset by the same signed amount in one action.
 * Applies instantly, no confirmation - clicking the opposite button undoes it.
 * Positive delta is a Delay, negative a Skip.
 */
export async function applyBulkShift(delta) {
  try {
    const snap = await get(ref(db, 'classes'));
    const classes = snap.val() || {};
    const classIds = Object.keys(classes);
    if (classIds.length === 0) return;

    await Promise.all(classIds.map(async (classId) => {
      const current = await getClassDateOffset(classId);
      await setClassDateOffset(classId, current + delta);
    }));

    const days = `${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'}`;
    showNotification(
      delta > 0 ? `Delayed all classes ${days}.` : `Skipped all classes ahead ${days}.`,
      'success'
    );
    await loadAndRenderAllPanes({ keepUiState: true });
  } catch (error) {
    console.error('Failed to shift all classes:', error);
    showNotification('Failed to shift classes. Please try again.', 'error');
  }
}

/**
 * Render every Class's pane. A fresh load starts each pane expanded at the
 * default window size; `keepUiState` keeps each pane's current size and
 * collapse state instead (used by the Bulk Offset Shift).
 */
export async function loadAndRenderAllPanes({ keepUiState = false } = {}) {
  if (!keepUiState) paneUiStates.clear();
  const container = document.getElementById('classPanesContainer');

  try {
    const snap = await get(ref(db, 'classes'));
    const classes = snap.val() || {};
    const sortedEntries = Object.entries(classes)
      .sort(([, a], [, b]) => a.displayOrder - b.displayOrder);

    container.innerHTML = '';

    if (sortedEntries.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No classes found.';
      container.appendChild(empty);
      return;
    }

    const renders = sortedEntries.map(([classId, data]) => {
      const pane = document.createElement('section');
      pane.className = 'lesson-planning-pane';
      container.appendChild(pane);

      return renderClassPane(classId, data.name, pane, paneUiStates.get(classId));
    });

    await Promise.all(renders);
  } catch (error) {
    console.error('Failed to load classes:', error);
    showErrorState({
      container: 'classPanesContainer',
      title: 'Unable to load classes'
    });
  }
}

/**
 * Render one Class's whole pane: a header (Class name and its Date Offset
 * control) plus its Planning Window of Day Indices, each with full day-row
 * functionality (drag-and-drop, lesson actions, Insert/Delete Day). Changing
 * the Class's Date Offset shifts which Day Indices the window shows, so a
 * reload re-renders the whole pane, not just the table.
 * `uiState` holds the window size and collapse state; the pane's own
 * re-renders (and its resize/collapse buttons) pass it along so it survives
 * them. Collapsed, the pane shows only its header's chevron and name.
 */
export async function renderClassPane(classId, className, containerEl, uiState = DEFAULT_PANE_UI_STATE) {
  paneUiStates.set(classId, uiState);
  const { windowSize } = uiState;
  const schedule = await getFullSchedule(classId);
  const dayIndexes = Object.keys(schedule).map(Number);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;
  const currentOffset = await getClassDateOffset(classId);
  const todayDayIndex = await getTodayDayIndex(classId);

  const windowIndexes = Array.from(
    { length: windowSize },
    (_, i) => todayDayIndex + i
  );

  // Preload titles for lessons visible in this pane's window only.
  const lessonHashesInWindow = windowIndexes.flatMap(idx => schedule[idx] || []);
  await getLessonTitles(lessonHashesInWindow);

  // Read through paneUiStates, not the uiState captured above, so a collapse
  // toggled in place since this render is kept by the next one.
  const rerender = (/** @type {Partial<PaneUiState>} */ change = {}) =>
    renderClassPane(classId, className, containerEl, { ...paneUiStates.get(classId), ...change });
  const renderAtSize = (/** @type {number} */ size) => rerender({ windowSize: size });
  const onReload = () => rerender();
  const onInsertDay = makeInsertDayHandler(classId, maxDayIndex, onReload);
  // onInsertDay gives each day row an Insert Day "+" on the line above it.
  const ctx = {
    classId,
    onReload,
    onDeleteDay: makeDeleteDayHandler(classId, onReload),
    onInsertDay
  };

  const header = document.createElement('div');
  header.className = 'lesson-planning-pane-header';

  const chevron = createCollapseChevron(className, () => {
    const current = /** @type {PaneUiState} */ (paneUiStates.get(classId));
    setCollapsed(!current.collapsed);
  });
  header.appendChild(chevron.element);

  const heading = document.createElement('h2');
  heading.textContent = className;
  header.appendChild(heading);

  // Stays visible when collapsed: setCollapsed below never hides it.
  header.appendChild(createFullScheduleLink(classId, className));

  const offsetControl = createDateOffsetControl({
    label: 'Offset:',
    currentOffset,
    onShift: async (delta) => {
      try {
        await setClassDateOffset(classId, currentOffset + delta);
        await onReload();
        showNotification(`Date offset for ${className} updated successfully!`, 'success');
      } catch (error) {
        console.error(`Failed to set date offset for class ${classId}:`, error);
        showNotification('Failed to update date offset', 'error');
        throw error;
      }
    },
    // No computeTodayDayIndex or onGoToToday: the Planning Window already
    // starts at today by definition, so neither would add anything (and the
    // pane header is too narrow for them).
  });
  header.appendChild(offsetControl);

  const table = document.createElement('table');
  table.className = 'schedule-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Day Index</th><th>Date</th><th>Lessons</th><th></th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  const dayRows = [];
  for (const dayIndex of windowIndexes) {
    const lessons = schedule[dayIndex] || [];
    const dateLabel = await getDateForDayIndex(dayIndex, classId);
    dayRows.push(await createDayRow(dayIndex, lessons, todayDayIndex, dateLabel, ctx));
  }
  tbody.append(...dayRows);

  // One more "+" below the last day: N+1 insert points for N days.
  const afterWindowIndex = windowIndexes[windowIndexes.length - 1] + 1;
  addInsertDayPlus(dayRows[dayRows.length - 1], afterWindowIndex, onInsertDay, 'below');

  table.appendChild(tbody);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'schedule-pane';
  tableWrapper.appendChild(table);

  const resizeControls = createWindowResizeControls(windowSize, renderAtSize);

  // Collapsing toggles in place (no refetch) and records the new state.
  const setCollapsed = (/** @type {boolean} */ collapsed) => {
    paneUiStates.set(classId, { .../** @type {PaneUiState} */ (paneUiStates.get(classId)), collapsed });
    chevron.show(collapsed);
    for (const el of [offsetControl, tableWrapper, resizeControls]) el.hidden = collapsed;
  };
  setCollapsed(uiState.collapsed);

  containerEl.innerHTML = '';
  containerEl.appendChild(header);
  containerEl.appendChild(tableWrapper);
  containerEl.appendChild(resizeControls);
}
