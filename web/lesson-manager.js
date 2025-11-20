/**
 * Lesson Manager Module
 * Provides functions for creating and managing lesson UI components
 */

import { ref, set } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_LESSON_TITLE } from './constants.js';
import {
  createLeftArrowButton,
  createRightArrowButton,
  createDeleteButton
} from './ui-components.js';

/**
 * Create a lesson cluster UI component with drag-and-drop support
 * @param {Object} options - Configuration options
 * @param {string} options.lessonHash - The lesson hash/ID
 * @param {number} options.dayIndex - The day index
 * @param {number} options.lessonIndex - The index of this lesson in the lessons array
 * @param {string[]} options.lessons - Array of all lesson hashes for this day
 * @param {string} options.lessonTitle - The lesson title to display
 * @param {string} options.classId - The current class ID
 * @param {Function} options.onMoveLeft - Callback when left arrow is clicked
 * @param {Function} options.onMoveRight - Callback when right arrow is clicked
 * @param {Function} options.onDelete - Callback when delete button is clicked
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
  onDelete,
  onClick
}) {
  const cluster = document.createElement("span");
  cluster.className = "lesson-cluster";
  cluster.draggable = true;
  cluster.dataset.lessonHash = lessonHash;
  cluster.dataset.dayIndex = dayIndex;
  cluster.dataset.lessonIndex = lessonIndex;

  // Drag and drop handlers
  cluster.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      lessonHash,
      fromDayIndex: dayIndex,
      fromLessonIndex: lessonIndex
    }));
    cluster.style.opacity = "0.5";
  });
  
  cluster.addEventListener("dragend", () => {
    cluster.style.opacity = "1";
  });

  // Top row: Main lesson button
  const topRow = document.createElement("div");
  topRow.className = "lesson-cluster-top";
  const mainBtn = document.createElement("button");
  mainBtn.textContent = lessonTitle || DEFAULT_LESSON_TITLE;
  mainBtn.className = "schedule-action-btn lesson-main-btn";
  mainBtn.onclick = onClick;
  topRow.appendChild(mainBtn);

  // Bottom row: left, right, delete
  const bottomRow = document.createElement("div");
  bottomRow.className = "lesson-cluster-bottom";

  // Left arrow
  const leftBtn = createLeftArrowButton(lessonIndex === 0, onMoveLeft);
  bottomRow.appendChild(leftBtn);

  // Right arrow
  const rightBtn = createRightArrowButton(lessonIndex === lessons.length - 1, onMoveRight);
  bottomRow.appendChild(rightBtn);

  // Delete button
  const delBtn = createDeleteButton(onDelete);
  bottomRow.appendChild(delBtn);

  cluster.appendChild(topRow);
  cluster.appendChild(bottomRow);

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
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} options.database - The Firebase database instance
 * @param {Function} options.onScheduleReload - Callback to reload the schedule after changes
 * @param {Function} options.onLessonClick - Callback when lesson is clicked (optional)
 * @returns {HTMLElement} The lesson cluster element
 */
export function createLessonClusterWithDB({
  lessonHash,
  dayIndex,
  lessonIndex,
  lessons,
  lessonTitle,
  classId,
  database,
  onScheduleReload,
  onLessonClick
}) {
  // Default click handler
  const defaultOnClick = () => {
    window.location.href = `editor.html?page=${lessonHash}&fromClass=${classId}`;
  };

  return createLessonCluster({
    lessonHash,
    dayIndex,
    lessonIndex,
    lessons,
    lessonTitle,
    classId,
    onMoveLeft: async () => {
      if (lessonIndex > 0) {
        const dayRef = ref(database, `schedule/${classId}/${dayIndex}`);
        const newLessons = [...lessons];
        [newLessons[lessonIndex - 1], newLessons[lessonIndex]] = [newLessons[lessonIndex], newLessons[lessonIndex - 1]];
        await set(dayRef, newLessons);
        onScheduleReload();
      }
    },
    onMoveRight: async () => {
      if (lessonIndex < lessons.length - 1) {
        const dayRef = ref(database, `schedule/${classId}/${dayIndex}`);
        const newLessons = [...lessons];
        [newLessons[lessonIndex], newLessons[lessonIndex + 1]] = [newLessons[lessonIndex + 1], newLessons[lessonIndex]];
        await set(dayRef, newLessons);
        onScheduleReload();
      }
    },
    onDelete: async () => {
      const dayRef = ref(database, `schedule/${classId}/${dayIndex}`);
      const newLessons = lessons.filter((_, idx) => idx !== lessonIndex);
      await set(dayRef, newLessons);
      onScheduleReload();
    },
    onClick: onLessonClick || defaultOnClick
  });
}

