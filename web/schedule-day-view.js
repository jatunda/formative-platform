/**
 * Schedule Day View Module
 *
 * Renders a single Day Index row of a Class's Schedule (lessons, drag-and-drop,
 * Insert/Delete Day) so the full scheduling table (teacher.js) and the
 * Lesson Planning page (lesson-planning.js) can share one implementation
 * instead of two. See docs/adr/0002-extract-shared-schedule-editing-module.md.
 */

import { DEFAULT_LESSON_TITLE, UNTITLED_LESSON } from './constants.js';
import {
  createIconButton,
  createInsertDayButton,
  savingSpinner,
  textIcon,
  withWorkingIndicator
} from './ui-components.js';
import { lineIcon } from './line-icons.js';
import { createLessonClusterWithDB } from './lesson-manager.js';
import { setupDropHandlers } from './drag-drop-utils.js';
import { showLessonSearchPopup } from './lesson-search.js';
import { showNotification } from './notification-utils.js';
import { showConfirm } from './confirm-dialog.js';
import {
  insertDayAt,
  deleteDayAt,
  addLessonToSchedule,
  moveLessonBetweenDays
} from './database-utils.js';
import { lessonStore } from './lesson-store.js';

// Lesson titles are keyed by Lesson id, which is global (not per-Class),
// so a single cache here is correct even when multiple Classes are rendered
// at once on the Lesson Planning page.
const titleCache = {};

/**
 * Get titles for a batch of Lesson ids, fetching only the ones not already cached.
 * @param {string[]} lessonIds
 * @returns {Promise<string[]>} Titles in the same order as `lessonIds`
 */
export async function getLessonTitles(lessonIds) {
  const missing = [...new Set(lessonIds)].filter(id => !(id in titleCache));

  if (missing.length > 0) {
    const lessons = lessonStore();
    const results = await Promise.all(missing.map(async (id) => {
      return [id, (await lessons.getTitle(id)) ?? UNTITLED_LESSON];
    }));
    results.forEach(([id, title]) => {
      titleCache[id] = title;
    });
  }

  return lessonIds.map(id => titleCache[id]);
}

/**
 * Build an onDeleteDay handler: confirms in the in-app dialog, deletes via deleteDayAt, reloads, and
 * reports failure through showNotification. Shared so both pages behave identically.
 * @param {string} classId
 * @param {() => void} onReload
 * @returns {(dayIndex: number) => Promise<void>}
 */
export function makeDeleteDayHandler(classId, onReload) {
  return async (dayIndex) => {
    const confirmed = await showConfirm({
      title: 'Delete Day',
      message: `Are you sure you want to delete day ${dayIndex}? This will shift all future days back by one.`,
      confirmLabel: 'Delete Day'
    });
    if (!confirmed) return;
    try {
      await deleteDayAt(classId, dayIndex);
      onReload();
    } catch (error) {
      console.error("Failed to delete day:", error);
      showNotification("Failed to delete day. Please try again.", "error");
    }
  };
}

/**
 * Build an onInsertDay handler bound to a fixed maxDayIndex snapshot (the caller
 * re-creates this per render, same as the delete handler).
 * @param {string} classId
 * @param {number} maxDayIndex
 * @param {() => void} onReload
 * @returns {(dayIndex: number) => Promise<void>}
 */
export function makeInsertDayHandler(classId, maxDayIndex, onReload) {
  return async (dayIndex) => {
    try {
      await insertDayAt(classId, dayIndex, maxDayIndex);
      onReload();
    } catch (error) {
      console.error("Failed to insert day:", error);
      showNotification("Failed to insert day. Please try again.", "error");
    }
  };
}

/**
 * Add an Insert Day "+" to a day row: it sits in the left gutter beside the
 * row's Day Index cell, centred on the line above (or below) the day, and
 * inserts a day at `insertAt`.
 * @param {HTMLTableRowElement} dayRow - A row from createDayRow
 * @param {number} insertAt - The Day Index the new day takes
 * @param {(dayIndex: number) => void} onInsert
 * @param {"above" | "below"} [edge="above"] - Which of the row's lines it sits on
 */
export function addInsertDayPlus(dayRow, insertAt, onInsert, edge = "above") {
  const btn = createInsertDayButton(insertAt, onInsert);
  btn.classList.add(`insert-day-${edge}`);
  /** @type {HTMLTableCellElement} */ (dayRow.querySelector(".day-index-cell")).appendChild(btn);
}

/**
 * Create the actions column (delete-day button) for a day row.
 * @param {number} dayIndex
 * @param {(dayIndex: number) => void} onDeleteDay
 * @returns {HTMLTableCellElement}
 */
export function createActionsCell(dayIndex, onDeleteDay) {
  const tdActions = document.createElement("td");
  tdActions.className = "day-actions-cell";

  const deleteButton = document.createElement("button");
  deleteButton.appendChild(lineIcon("trash", "line-icon"));
  deleteButton.className = "delete-day-btn";
  deleteButton.title = `Delete day ${dayIndex}`;
  deleteButton.onclick = withWorkingIndicator(deleteButton, () => onDeleteDay(dayIndex),
    { workingLabel: savingSpinner });
  tdActions.appendChild(deleteButton);

  return tdActions;
}

/**
 * Append a Lesson to the end of one Day Index of a Class's Schedule, then reload.
 * @param {string} lessonId
 * @param {number} dayIndex
 * @param {{classId: string, onReload: () => void}} ctx
 */
async function appendLessonToDay(lessonId, dayIndex, ctx) {
  await addLessonToSchedule(ctx.classId, dayIndex, lessonId);
  ctx.onReload();
}

/**
 * Create the side-by-side New Lesson (text "+") / Link Lesson (link icon) buttons
 * that follow a day's last Lesson.
 * @param {number} dayIndex
 * @param {{classId: string, onReload: () => void}} ctx
 * @returns {HTMLDivElement}
 */
export function createEndButtonsContainer(dayIndex, ctx) {
  const container = document.createElement("div");
  container.className = "lessons-end-buttons";

  const newBtn = createIconButton(textIcon("+"), "New Lesson", async () => {
    const lessonId = await lessonStore().create({ title: DEFAULT_LESSON_TITLE });
    await appendLessonToDay(lessonId, dayIndex, ctx);
  });

  const linkBtn = createIconButton(lineIcon("link", "line-icon"), "Link Lesson", () => {
    showLessonSearchPopup({
      onSelect: (lessonId) => appendLessonToDay(lessonId, dayIndex, ctx)
    });
  });

  container.appendChild(newBtn);
  container.appendChild(linkBtn);
  return container;
}

/**
 * Create a day row's Date cell, e.g. "Mon 11/2".
 * @param {string} dateLabel - From getDateForDayIndex
 * @returns {HTMLTableCellElement}
 */
export function createDateCell(dateLabel) {
  const tdDate = document.createElement("td");
  tdDate.className = "date-cell";
  tdDate.textContent = dateLabel;
  return tdDate;
}

/**
 * Attach drop handlers to a day's lessons cell, scoped to one Class: a lesson
 * dragged from a different Class's pane (only possible on the Lesson Planning
 * page, which shows several Classes at once) is ignored rather than moved.
 * @param {HTMLTableCellElement} tdLessons
 * @param {number} toDayIndex
 * @param {{classId: string, onReload: () => void}} ctx
 */
export function setupLessonDropHandlers(tdLessons, toDayIndex, ctx) {
  setupDropHandlers(tdLessons, async (data) => {
    const { fromDayIndex, fromLessonIndex, classId: fromClassId } = data;

    // Block drops originating from a different Class's pane.
    if (fromClassId && fromClassId !== ctx.classId) return;

    // Prevent dropping into the same day
    if (Number(fromDayIndex) === Number(toDayIndex)) return;

    // The same move the ⋮ menu's "Move to previous/next day" makes.
    await moveLessonBetweenDays(ctx.classId, Number(fromDayIndex), Number(fromLessonIndex), toDayIndex);
    ctx.onReload();
  }, {
    // Reject the hover state (and let the browser show its "not allowed"
    // cursor) while a lesson from a different Class is being dragged over.
    canDrop: (dragData) => !dragData?.classId || dragData.classId === ctx.classId
  });
}

/**
 * Create a full day row: Day Index, Date, Lessons (with drag-and-drop and
 * Link/New Lesson buttons), and the delete-day action.
 * @param {number} dayIndex
 * @param {string[]} lessons - Lesson hashes for this day
 * @param {number|undefined} todayDayIndex - Today's Day Index, for highlighting
 * @param {string} dateLabel - This Day Index's calendar date (see getDateForDayIndex)
 * @param {{classId: string, onReload: () => void, onDeleteDay: (dayIndex: number) => void,
 *   onInsertDay?: (dayIndex: number) => void}} ctx - With onInsertDay, the row gets an
 *   Insert Day "+" on the line above it (see addInsertDayPlus)
 * @returns {Promise<HTMLTableRowElement>}
 */
export async function createDayRow(dayIndex, lessons, todayDayIndex, dateLabel, ctx) {
  const tr = document.createElement("tr");

  if (todayDayIndex !== undefined && dayIndex === todayDayIndex) {
    tr.className = "today-row";
  }

  const tdDay = document.createElement("td");
  tdDay.className = "day-index-cell";
  tdDay.textContent = dayIndex;
  tr.appendChild(tdDay);

  tr.appendChild(createDateCell(dateLabel));

  const tdLessons = document.createElement("td");
  tdLessons.className = "lessons-cell";

  const titles = await getLessonTitles(lessons);
  for (let i = 0; i < lessons.length; i++) {
    const lessonHash = lessons[i];
    tdLessons.appendChild(createLessonClusterWithDB({
      lessonHash,
      dayIndex,
      lessonIndex: i,
      lessons,
      lessonTitle: titles[i] || DEFAULT_LESSON_TITLE,
      classId: ctx.classId,
      onScheduleReload: ctx.onReload
    }));
  }

  tdLessons.appendChild(createEndButtonsContainer(dayIndex, ctx));
  setupLessonDropHandlers(tdLessons, dayIndex, ctx);

  tr.appendChild(tdLessons);
  tr.appendChild(createActionsCell(dayIndex, ctx.onDeleteDay));
  if (ctx.onInsertDay) addInsertDayPlus(tr, dayIndex, ctx.onInsertDay);

  return tr;
}
