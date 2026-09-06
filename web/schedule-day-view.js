/**
 * Schedule Day View Module
 *
 * Renders a single Day Index row of a Class's Schedule (lessons, drag-and-drop,
 * Insert/Delete Day) so the full scheduling table (teacher.js) and the
 * Lesson Planning page (lesson-planning.js) can share one implementation
 * instead of two. See docs/adr/0002-extract-shared-schedule-editing-module.md.
 */

import {
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_LESSON_TITLE, UNTITLED_LESSON } from './constants.js';
import {
  createStyledButton,
  createNewLessonButton as createNewLessonButtonShared,
  createInsertDayButton
} from './ui-components.js';
import { createLessonClusterWithDB } from './lesson-manager.js';
import { setupDropHandlers } from './drag-drop-utils.js';
import { showLessonSearchPopup } from './lesson-search.js';
import { showNotification } from './notification-utils.js';
import {
  insertDayAt,
  deleteDayAt,
  generateUniqueHash
} from './database-utils.js';

// Lesson titles are keyed by content hash, which is global (not per-Class),
// so a single cache here is correct even when multiple Classes are rendered
// at once on the Lesson Planning page.
const titleCache = {};

/**
 * Get titles for a batch of lesson hashes, fetching only the ones not already cached.
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} db
 * @param {string[]} hashes
 * @returns {Promise<string[]>} Titles in the same order as `hashes`
 */
export async function getLessonTitles(db, hashes) {
  const missing = [...new Set(hashes)].filter(hash => !(hash in titleCache));

  if (missing.length > 0) {
    const results = await Promise.all(missing.map(async (hash) => {
      const snap = await get(ref(db, `content/${hash}/title`));
      return [hash, snap.exists() ? snap.val() : UNTITLED_LESSON];
    }));
    results.forEach(([hash, title]) => {
      titleCache[hash] = title;
    });
  }

  return hashes.map(hash => titleCache[hash]);
}

/**
 * Get the title for a single lesson hash (see getLessonTitles).
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} db
 * @param {string} hash
 * @returns {Promise<string>}
 */
export async function getLessonTitle(db, hash) {
  const [title] = await getLessonTitles(db, [hash]);
  return title;
}

/**
 * Build an onDeleteDay handler: confirms, deletes via deleteDayAt, reloads, and
 * reports failure through showNotification. Shared so both pages behave identically.
 * @param {string} classId
 * @param {() => void} onReload
 * @returns {(dayIndex: number) => Promise<void>}
 */
export function makeDeleteDayHandler(classId, onReload) {
  return async (dayIndex) => {
    if (!confirm(`Are you sure you want to delete day ${dayIndex}? This will shift all future days back by one.`)) {
      return;
    }
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
 * Create a row with an "Insert Day Here" button.
 * @param {number} dayIndex - The day index to insert before
 * @param {(dayIndex: number) => void} onInsert - Callback function when insert is clicked
 * @returns {HTMLTableRowElement}
 */
export function createInsertDayRow(dayIndex, onInsert) {
  const insertRow = document.createElement("tr");
  const insertTd = document.createElement("td");
  insertTd.colSpan = 4;
  insertTd.className = "insert-day-cell";
  insertTd.appendChild(createInsertDayButton(dayIndex, onInsert));
  insertRow.appendChild(insertTd);
  return insertRow;
}

/**
 * Create the actions column (delete-day button) for a day row.
 * @param {number} dayIndex
 * @param {(dayIndex: number) => void} onDeleteDay
 * @returns {HTMLTableCellElement}
 */
export function createActionsCell(dayIndex, onDeleteDay) {
  const tdActions = document.createElement("td");
  tdActions.style.textAlign = "center";
  tdActions.style.verticalAlign = "middle";
  tdActions.style.padding = "4px";

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "🗑️";
  deleteButton.className = "delete-day-btn";
  deleteButton.title = `Delete day ${dayIndex}`;
  deleteButton.onclick = () => onDeleteDay(dayIndex);
  tdActions.appendChild(deleteButton);

  return tdActions;
}

/**
 * Create the stacked "Link Lesson" / "New Lesson" buttons for a day's lessons cell.
 * @param {number} dayIndex
 * @param {{classId: string, db: object, onReload: () => void}} ctx
 * @returns {HTMLDivElement}
 */
export function createEndButtonsContainer(dayIndex, ctx) {
  const container = document.createElement("div");
  container.className = "lessons-end-buttons";

  const linkBtn = createStyledButton("Link Lesson", () => {
    showLessonSearchPopup({
      onSelect: async (lessonId) => {
        const dayRef = ref(ctx.db, `schedule/${ctx.classId}/${dayIndex}`);
        const snap = await get(dayRef);
        const lessons = snap.exists() ? snap.val() : [];
        lessons.push(lessonId);
        await set(dayRef, lessons);
        ctx.onReload();
      }
    });
  });

  const newBtn = createNewLessonButtonShared(dayIndex, async (idx) => {
    const hash = await generateUniqueHash();
    const dayRef = ref(ctx.db, `schedule/${ctx.classId}/${idx}`);
    const snap = await get(dayRef);
    const lessons = snap.exists() ? snap.val() : [];
    lessons.push(hash);
    await Promise.all([
      set(ref(ctx.db, `content/${hash}`), { title: DEFAULT_LESSON_TITLE }),
      set(dayRef, lessons)
    ]);
    ctx.onReload();
  });

  container.appendChild(linkBtn);
  container.appendChild(newBtn);
  return container;
}

/**
 * Attach drop handlers to a day's lessons cell, scoped to one Class: a lesson
 * dragged from a different Class's pane (only possible on the Lesson Planning
 * page, which shows several Classes at once) is ignored rather than moved.
 * @param {HTMLTableCellElement} tdLessons
 * @param {number} toDayIndex
 * @param {{classId: string, db: object, onReload: () => void}} ctx
 */
export function setupLessonDropHandlers(tdLessons, toDayIndex, ctx) {
  setupDropHandlers(tdLessons, async (data) => {
    const { lessonHash, fromDayIndex, fromLessonIndex, classId: fromClassId } = data;

    // Block drops originating from a different Class's pane.
    if (fromClassId && fromClassId !== ctx.classId) return;

    // Prevent dropping into the same day
    if (Number(fromDayIndex) === Number(toDayIndex)) return;

    const [fromSnap, toSnap] = await Promise.all([
      get(ref(ctx.db, `schedule/${ctx.classId}/${fromDayIndex}`)),
      get(ref(ctx.db, `schedule/${ctx.classId}/${toDayIndex}`))
    ]);

    const fromLessons = fromSnap.exists() ? fromSnap.val() : [];
    const toLessons = toSnap.exists() ? toSnap.val() : [];

    fromLessons.splice(fromLessonIndex, 1);
    toLessons.push(lessonHash);

    await Promise.all([
      set(ref(ctx.db, `schedule/${ctx.classId}/${fromDayIndex}`), fromLessons),
      set(ref(ctx.db, `schedule/${ctx.classId}/${toDayIndex}`), toLessons)
    ]);
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
 * @param {string} dateLabel - Pre-formatted calendar date for this Day Index
 * @param {{classId: string, db: object, onReload: () => void, onDeleteDay: (dayIndex: number) => void}} ctx
 * @returns {Promise<HTMLTableRowElement>}
 */
export async function createDayRow(dayIndex, lessons, todayDayIndex, dateLabel, ctx) {
  const tr = document.createElement("tr");

  if (todayDayIndex !== undefined && dayIndex === todayDayIndex) {
    tr.className = "today-row";
  }

  const tdDay = document.createElement("td");
  tdDay.textContent = dayIndex;
  tr.appendChild(tdDay);

  const tdDate = document.createElement("td");
  tdDate.textContent = dateLabel;
  tr.appendChild(tdDate);

  const tdLessons = document.createElement("td");
  tdLessons.className = "lessons-cell";

  const titles = await getLessonTitles(ctx.db, lessons);
  for (let i = 0; i < lessons.length; i++) {
    const lessonHash = lessons[i];
    tdLessons.appendChild(createLessonClusterWithDB({
      lessonHash,
      dayIndex,
      lessonIndex: i,
      lessons,
      lessonTitle: titles[i] || DEFAULT_LESSON_TITLE,
      classId: ctx.classId,
      database: ctx.db,
      onScheduleReload: ctx.onReload
    }));
  }

  tdLessons.appendChild(createEndButtonsContainer(dayIndex, ctx));
  setupLessonDropHandlers(tdLessons, dayIndex, ctx);

  tr.appendChild(tdLessons);
  tr.appendChild(createActionsCell(dayIndex, ctx.onDeleteDay));

  return tr;
}
