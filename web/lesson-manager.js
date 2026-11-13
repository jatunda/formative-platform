/**
 * Lesson Manager Module
 * Provides functions for creating and managing lesson UI components
 */

import { DEFAULT_LESSON_TITLE } from './constants.js';
import { withWorkingIndicator } from './ui-components.js';
import { createMenuButton } from './action-menu.js';
import { setupDragHandlers } from './drag-drop-utils.js';
import { moveLessonBetweenDays, updateScheduleForDay } from './database-utils.js';

/**
 * Create a lesson cluster: one row holding the Lesson's title button and a ⋮
 * button whose menu moves or removes this placement. Drag-and-drop still
 * moves it between days on a mouse; the menu is the touch way (ADR 0003).
 * @param {Object} options - Configuration options
 * @param {string} options.lessonHash - The lesson hash/ID
 * @param {number} options.dayIndex - The day index
 * @param {number} options.lessonIndex - The index of this lesson in the lessons array
 * @param {string[]} options.lessons - Array of all lesson hashes for this day
 * @param {string} options.lessonTitle - The lesson title to display
 * @param {string} options.classId - The current class ID
 * @param {Function} options.onMoveLeft - Move left (earlier in the day)
 * @param {Function} options.onMoveRight - Move right (later in the day)
 * @param {Function} options.onMoveToPreviousDay - Move to the end of the previous Day Index
 * @param {Function} options.onMoveToNextDay - Move to the end of the next Day Index
 * @param {Function} options.onRemove - Remove this placement (the Lesson itself stays)
 * @param {Function} options.onClick - Callback when main lesson button is clicked
 * @returns {HTMLElement} The lesson cluster element
 */
export function createLessonCluster({
  lessonHash,
  dayIndex,
  lessonIndex,
  lessons,
  lessonTitle,
  classId,
  onMoveLeft,
  onMoveRight,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onRemove,
  onClick
}) {
  const cluster = document.createElement("span");
  cluster.className = "lesson-cluster";
  cluster.draggable = true;
  cluster.dataset.lessonHash = lessonHash;
  cluster.dataset.dayIndex = dayIndex;
  cluster.dataset.lessonIndex = lessonIndex;

  // Setup drag handlers. classId travels with the drag data so a drop target
  // belonging to a different Class (only possible on the Lesson Planning page,
  // which shows several Classes at once) can be detected and ignored.
  setupDragHandlers(cluster, {
    lessonHash,
    fromDayIndex: dayIndex,
    fromLessonIndex: lessonIndex,
    classId
  });

  const title = lessonTitle || DEFAULT_LESSON_TITLE;

  const row = document.createElement("div");
  row.className = "lesson-cluster-row";

  const mainBtn = document.createElement("button");
  mainBtn.textContent = title;
  // A long title is cut off with … in the row; hovering shows all of it.
  mainBtn.title = title;
  mainBtn.className = "schedule-action-btn lesson-main-btn";
  mainBtn.onclick = onClick;

  // The items are built when the menu opens, by which point menuBtn exists;
  // it shows an hourglass while a slow move is saving.
  const run = (fn) => withWorkingIndicator(menuBtn, fn, { workingLabel: "⏳" });
  const menuBtn = createMenuButton(`Actions for ${title}`, () => [
    { label: "Move left", disabled: lessonIndex === 0, onSelect: run(onMoveLeft) },
    { label: "Move right", disabled: lessonIndex === lessons.length - 1, onSelect: run(onMoveRight) },
    { label: "Move to previous day", disabled: dayIndex === 0, onSelect: run(onMoveToPreviousDay) },
    { label: "Move to next day", onSelect: run(onMoveToNextDay) },
    { label: "Remove from this day", onSelect: run(onRemove) }
  ]);

  row.append(mainBtn, menuBtn);
  cluster.appendChild(row);

  return cluster;
}

/**
 * Create a lesson cluster with database operations
 * Helper function that wraps createLessonCluster with database update logic
 * @param {Object} options - Configuration options
 * @param {string} options.lessonHash - The lesson hash/ID
 * @param {number} options.dayIndex - The day index
 * @param {number} options.lessonIndex - The index of this lesson in the lessons array
 * @param {string[]} options.lessons - Array of all lesson hashes for this day
 * @param {string} options.lessonTitle - The lesson title to display
 * @param {string} options.classId - The current class ID
 * @param {Function} options.onScheduleReload - Callback to reload the schedule after changes
 * @param {Function} [options.onLessonClick] - Callback when lesson is clicked (optional)
 * @returns {HTMLElement} The lesson cluster element
 */
export function createLessonClusterWithDB({
  lessonHash,
  dayIndex,
  lessonIndex,
  lessons,
  lessonTitle,
  classId,
  onScheduleReload,
  onLessonClick
}) {
  // Default click handler
  const defaultOnClick = () => {
    window.location.href = `editor.html?page=${lessonHash}&fromClass=${classId}`;
  };

  const writeDay = async (newLessons) => {
    await updateScheduleForDay(classId, dayIndex, newLessons);
    onScheduleReload();
  };

  /** Swap this Lesson with its neighbour `step` places away (-1 or +1). */
  const swap = (step) => () => {
    const newLessons = [...lessons];
    const other = lessonIndex + step;
    [newLessons[other], newLessons[lessonIndex]] = [newLessons[lessonIndex], newLessons[other]];
    return writeDay(newLessons);
  };

  // Appends to the end of the target day, same as a drag-and-drop move; it
  // reads that day from the database, so it works for a Day Index outside
  // the visible Planning Window too.
  const moveToDay = (step) => async () => {
    await moveLessonBetweenDays(classId, dayIndex, lessonIndex, dayIndex + step);
    onScheduleReload();
  };

  return createLessonCluster({
    lessonHash,
    dayIndex,
    lessonIndex,
    lessons,
    lessonTitle,
    classId,
    onMoveLeft: swap(-1),
    onMoveRight: swap(1),
    onMoveToPreviousDay: moveToDay(-1),
    onMoveToNextDay: moveToDay(1),
    onRemove: () => writeDay(lessons.filter((_, idx) => idx !== lessonIndex)),
    onClick: onLessonClick || defaultOnClick
  });
}
