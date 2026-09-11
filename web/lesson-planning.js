import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import {
  initializeDateUtils,
  getDateForDayIndex,
  getTodayDayIndex,
  getClassDateOffset,
  setClassDateOffset
} from './date-utils.js';
import { showNotification } from './notification-utils.js';
import { initializeLessonSearch } from './lesson-search.js';
import { createDateOffsetControl } from './ui-components.js';
import {
  initializeDatabase,
  getFullSchedule
} from './database-utils.js';
import { showErrorState } from './error-ui-utils.js';
import {
  createDayRow,
  createInsertDayRow,
  makeInsertDayHandler,
  makeDeleteDayHandler,
  getLessonTitles
} from './schedule-day-view.js';
import { renderTeacherNav } from './teacher-nav.js';

// Number of upcoming Day Indices shown per Class in each pane's Planning
// Window (today, +1, +2, ...). Change this single constant to widen it later.
const PLANNING_WINDOW_SIZE = 3;

// Initialize database utilities
initializeDatabase(db);

// Initialize date utilities
initializeDateUtils(db);

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
  initializeLessonSearch(db);
  renderTeacherNav('lesson-planning');
  initializeBulkShiftControl();
  await loadAndRenderAllPanes();
}

/**
 * Build the compact "shift all classes" toolbar: a magnitude input
 * (default 1) with separate + and − buttons, each applying that magnitude
 * instantly. The description/warning that used to sit below it as always-
 * visible text now lives behind a "?" tooltip icon instead.
 */
export function initializeBulkShiftControl() {
  const container = document.getElementById('bulkShiftContainer');

  const controls = document.createElement('div');
  controls.className = 'bulk-shift-control';

  const label = document.createElement('label');
  label.textContent = 'Shift all classes:';

  const infoIcon = document.createElement('span');
  infoIcon.className = 'info-tooltip';
  infoIcon.textContent = '?';
  infoIcon.tabIndex = 0;
  const infoText = document.createElement('span');
  infoText.className = 'info-tooltip-text';
  infoText.textContent = "Moves every class's schedule forward or backward by the same number of business days at once (e.g. after a snow day). Applies immediately, no confirmation.";
  infoIcon.appendChild(infoText);

  const input = document.createElement('input');
  input.type = 'number';
  input.id = 'bulkShiftAmount';
  input.value = '1';
  input.min = '1';
  input.style.width = '60px';

  const minusBtn = document.createElement('button');
  minusBtn.textContent = '−'; // −
  minusBtn.className = 'schedule-action-btn';
  minusBtn.title = 'Shift all classes backward';
  minusBtn.onclick = () => applyBulkShift(-getShiftMagnitude(input));

  const plusBtn = document.createElement('button');
  plusBtn.textContent = '+';
  plusBtn.className = 'schedule-action-btn';
  plusBtn.title = 'Shift all classes forward';
  plusBtn.onclick = () => applyBulkShift(getShiftMagnitude(input));

  controls.appendChild(label);
  controls.appendChild(infoIcon);
  controls.appendChild(input);
  controls.appendChild(minusBtn);
  controls.appendChild(plusBtn);
  container.appendChild(controls);
}

export function getShiftMagnitude(input) {
  const magnitude = Math.abs(parseInt(input.value, 10));
  return Number.isFinite(magnitude) && magnitude > 0 ? magnitude : 1;
}

/**
 * Shift every Class's Date Offset by the same signed amount in one action.
 * Applies instantly, no confirmation - clicking the opposite button undoes it.
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

    showNotification(
      `Shifted all classes by ${delta > 0 ? '+' : ''}${delta} day${Math.abs(delta) === 1 ? '' : 's'}.`,
      'success'
    );
    await loadAndRenderAllPanes();
  } catch (error) {
    console.error('Failed to shift all classes:', error);
    showNotification('Failed to shift classes. Please try again.', 'error');
  }
}

export async function loadAndRenderAllPanes() {
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

      return renderClassPane(classId, data.name, pane);
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
 */
export async function renderClassPane(classId, className, containerEl) {
  const schedule = await getFullSchedule(classId);
  const dayIndexes = Object.keys(schedule).map(Number);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;
  const currentOffset = await getClassDateOffset(classId);
  const todayDayIndex = await getTodayDayIndex(classId);

  const windowIndexes = Array.from(
    { length: PLANNING_WINDOW_SIZE },
    (_, i) => todayDayIndex + i
  );

  // Preload titles for lessons visible in this pane's window only.
  const lessonHashesInWindow = windowIndexes.flatMap(idx => schedule[idx] || []);
  await getLessonTitles(db, lessonHashesInWindow);

  const onReload = () => renderClassPane(classId, className, containerEl);
  const ctx = {
    classId,
    db,
    onReload,
    onDeleteDay: makeDeleteDayHandler(classId, onReload)
  };
  const onInsertDay = makeInsertDayHandler(classId, maxDayIndex, onReload);

  const header = document.createElement('div');
  header.className = 'lesson-planning-pane-header';

  const heading = document.createElement('h2');
  heading.textContent = className;
  header.appendChild(heading);

  header.appendChild(createDateOffsetControl({
    currentOffset,
    onApply: async (newOffset) => {
      try {
        await setClassDateOffset(classId, newOffset);
        await onReload();
        showNotification(`Date offset for ${className} updated successfully!`, 'success');
      } catch (error) {
        console.error(`Failed to set date offset for class ${classId}:`, error);
        showNotification('Failed to update date offset', 'error');
        throw error;
      }
    },
    computeTodayDayIndex: () => getTodayDayIndex(classId),
    // No onGoToToday: the Planning Window is only PLANNING_WINDOW_SIZE days
    // and already starts at today by definition, so there's nothing beyond
    // it to scroll to.
    compact: true
  }));

  const table = document.createElement('table');
  table.className = 'schedule-table';

  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Day Index</th><th>Date</th><th>Lessons</th><th></th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const dayIndex of windowIndexes) {
    tbody.appendChild(createInsertDayRow(dayIndex, onInsertDay));

    const lessons = schedule[dayIndex] || [];
    const dateLabel = await getDateForDayIndex(dayIndex, classId);
    const dayRow = await createDayRow(dayIndex, lessons, todayDayIndex, dateLabel, ctx);
    tbody.appendChild(dayRow);
  }

  // Insert point after the window too, matching the full scheduling table's
  // N+1 insert-points-for-N-days pattern.
  const afterWindowIndex = windowIndexes[windowIndexes.length - 1] + 1;
  tbody.appendChild(createInsertDayRow(afterWindowIndex, onInsertDay));

  table.appendChild(tbody);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'schedule-pane';
  tableWrapper.appendChild(table);

  containerEl.innerHTML = '';
  containerEl.appendChild(header);
  containerEl.appendChild(tableWrapper);
}
