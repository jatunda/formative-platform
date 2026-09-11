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
  getDateForDayIndex as sharedGetDateForDayIndex,
  getTodayDayIndex,
  getClassDateOffset,
  setClassDateOffset
} from './date-utils.js';
import { DEFAULT_CLASS_START_DATE } from './constants.js';
import { showNotification } from './notification-utils.js';
import {
  initializeLessonSearch
} from "./lesson-search.js";
import {
  createDateOffsetControl
} from "./ui-components.js";
import {
  initializeDatabase
} from "./database-utils.js";
import {
  showErrorState
} from "./error-ui-utils.js";
import {
  createDayRow,
  createInsertDayRow,
  createEndButtonsContainer,
  makeInsertDayHandler,
  makeDeleteDayHandler,
  getLessonTitles
} from "./schedule-day-view.js";
import { renderTeacherNav } from "./teacher-nav.js";

// Database is imported from centralized firebase-config.js

// Initialize database utilities
initializeDatabase(db);

// Initialize date utilities
initializeDateUtils(db);

// The currently-selected Class and its Date Offset control. Module-level
// because they're genuinely shared, mutable "current selection" state, not
// because functions need to close over DOM refs - those are queried fresh
// each time (see e.g. scrollToToday, saveScrollPosition below).
let currentClassId = "";
let currentDateOffset = 0;
let dateOffsetControl = null;

// Scroll position management
const SCROLL_STORAGE_KEY = 'teacher-schedule-scroll';
const LAST_VISIT_KEY = 'teacher-schedule-last-visit';
const VISIT_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function saveScrollPosition(classId = currentClassId) {
  const schedulePane = document.getElementById('schedulePane');
  if (schedulePane && classId) {
    const scrollData = {
      classId,
      scrollTop: schedulePane.scrollTop,
      timestamp: Date.now()
    };
    localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollData));
  }
}

export function getSavedScrollPosition(classId = currentClassId) {
  try {
    const saved = localStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.classId === classId) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved scroll position:', e);
  }
  return null;
}

export function isFirstVisitInAWhile() {
  try {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (!lastVisit) return true;

    const lastVisitTime = parseInt(lastVisit);
    const now = Date.now();
    return (now - lastVisitTime) > VISIT_TIMEOUT;
  } catch (e) {
    return true;
  }
}

export function markVisit() {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

export async function loadClasses(classSelectEl) {
  const snap = await get(ref(db, "classes"));
  const classes = snap.val();

  // Clear loading option
  classSelectEl.innerHTML = "";

  // Get class from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const urlClassId = urlParams.get('class');

  Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
    .forEach(([id, data]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = data.name;
      classSelectEl.appendChild(option);
    });

  // Set the class from URL parameter if it exists
  if (urlClassId && classSelectEl.querySelector(`option[value="${urlClassId}"]`)) {
    classSelectEl.value = urlClassId;

    // Update the editor link immediately if we have a class from URL
    const editorLink = document.getElementById('goToEditorLink');
    if (editorLink) {
      editorLink.href = `editor.html?fromClass=${urlClassId}`;
    }
  }
}

// Use the shared date calculation function
export async function getDateForDayIndex(dayIndex, classId = currentClassId, classStartDate = DEFAULT_CLASS_START_DATE) {
  return await sharedGetDateForDayIndex(dayIndex, classId, classStartDate);
}

export async function applyDateOffset(newOffset, classId = currentClassId) {
  try {
    await setClassDateOffset(classId, newOffset);
    currentDateOffset = newOffset;
    if (classId) {
      await loadFullSchedule();
    }
    showNotification("Date offset updated successfully!", "success");
  } catch (error) {
    console.error(`Failed to set date offset for class ${classId}:`, error);
    showNotification("Failed to update date offset", "error");
    throw error;
  }
}

export function showScheduleError() {
  showErrorState({
    container: 'schedule-loading-state',
    title: 'Unable to load schedule'
  });
}

export async function loadFullSchedule() {
  const classSelectEl = document.getElementById("classSelect");
  const classId = classSelectEl.value;
  if (!classId) return;

  currentClassId = classId;

  // Update URL with the selected class
  const url = new URL(window.location);
  url.searchParams.set('class', classId);
  history.replaceState({}, '', url);

  // Update the editor link to include the class parameter
  const editorLink = document.getElementById('goToEditorLink');
  if (editorLink) {
    editorLink.href = `editor.html?fromClass=${classId}`;
  }

  // Show loading state
  const loadingState = document.getElementById('schedule-loading-state');
  const scheduleTable = document.getElementById('scheduleTable');

  if (loadingState) loadingState.style.display = 'flex';
  if (scheduleTable) scheduleTable.style.display = 'none';

  try {
    // Load the date offset for this class
    currentDateOffset = await getClassDateOffset(classId);

    // Update the date offset control if it exists
    if (dateOffsetControl) {
      await dateOffsetControl.updateOffset(currentDateOffset);
    }

    // Fetch all days for this class
    const snap = await get(ref(db, `schedule/${classId}`));
    const schedule = snap.val() || {};
    await renderScheduleTable(schedule, classId);

    // Hide loading state and show table
    if (loadingState) loadingState.style.display = 'none';
    if (scheduleTable) scheduleTable.style.display = 'table';

    // Handle scrolling after table is rendered
    await handleScrollPositioning(classId);

  } catch (error) {
    console.error('Error loading schedule:', error);
    showScheduleError();
  }
}

export async function handleScrollPositioning(classId = currentClassId) {
  const schedulePane = document.getElementById('schedulePane');
  if (!schedulePane) return;

  // Get today's day index
  let todayDayIndex;
  try {
    todayDayIndex = await getTodayDayIndex(classId);
  } catch (e) {
    console.warn('Could not determine today\'s day index:', e);
  }

  const isFirstVisit = isFirstVisitInAWhile();
  const savedScrollData = getSavedScrollPosition(classId);

  // Determine scrolling behavior
  if (isFirstVisit && todayDayIndex !== undefined) {
    // First visit in a while - scroll to today
    setTimeout(() => scrollToToday(), 100);
  } else if (savedScrollData && !isFirstVisit) {
    // Recent visit - restore scroll position
    setTimeout(() => {
      schedulePane.scrollTop = savedScrollData.scrollTop;
    }, 100);
  }

  // Mark this visit and set up scroll saving
  markVisit();

  // Save scroll position on scroll
  schedulePane.addEventListener('scroll', debounce(() => saveScrollPosition(classId), 500));
}

export function scrollToToday() {
  const todayRow = document.querySelector('.today-row');
  if (todayRow) {
    const schedulePane = document.getElementById('schedulePane');
    if (schedulePane) {
      const rowRect = todayRow.getBoundingClientRect();
      const paneRect = schedulePane.getBoundingClientRect();
      const scrollTop = schedulePane.scrollTop + rowRect.top - paneRect.top - 50; // 50px offset from top

      schedulePane.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }
}

// Debounce utility function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create the final row for adding a new day past the end of the schedule
 * @param {number} nextIndex - The next day index
 * @param {{classId: string, db: object, onReload: () => void}} ctx
 * @returns {Promise<HTMLTableRowElement>} The final row element
 */
export async function createFinalRow(nextIndex, ctx) {
  const addRow = document.createElement("tr");

  // Day Index column
  const tdDay = document.createElement("td");
  tdDay.textContent = nextIndex;
  addRow.appendChild(tdDay);

  // Date column
  const tdDate = document.createElement("td");
  tdDate.textContent = await getDateForDayIndex(nextIndex, ctx.classId);
  addRow.appendChild(tdDate);

  // Lessons column with "Link Lesson" and "New Lesson" buttons
  const tdLessons = document.createElement("td");
  tdLessons.className = "lessons-cell";
  tdLessons.appendChild(createEndButtonsContainer(nextIndex, ctx));
  addRow.appendChild(tdLessons);

  // Empty actions column for the final row
  const tdActions = document.createElement("td");
  addRow.appendChild(tdActions);

  return addRow;
}

export async function renderScheduleTable(schedule, classId = currentClassId) {
  const scheduleTableBody = document.querySelector("#scheduleTable tbody");
  scheduleTableBody.innerHTML = "";
  const dayIndexes = Object.keys(schedule).map(Number).sort((a, b) => a - b);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;

  // Get today's day index for highlighting
  let todayDayIndex;
  try {
    todayDayIndex = await getTodayDayIndex(classId);
  } catch (e) {
    console.warn('Could not determine today\'s day index:', e);
  }

  // OPTIMIZATION: Pre-load all lesson titles in batch for better performance
  const allLessonHashes = [];
  for (const dayIndex of dayIndexes) {
    const lessons = schedule[dayIndex] || [];
    allLessonHashes.push(...lessons);
  }
  await getLessonTitles(db, allLessonHashes);

  const ctx = {
    classId,
    db,
    onReload: loadFullSchedule,
    onDeleteDay: makeDeleteDayHandler(classId, loadFullSchedule)
  };
  const onInsertDay = makeInsertDayHandler(classId, maxDayIndex, loadFullSchedule);

  // Render all days
  for (let dayIndex = 0; dayIndex <= maxDayIndex; dayIndex++) {
    // Insert row before each day
    scheduleTableBody.appendChild(createInsertDayRow(dayIndex, onInsertDay));

    // Day row
    const lessons = schedule[dayIndex] || [];
    const dateLabel = await getDateForDayIndex(dayIndex, classId);
    const dayRow = await createDayRow(dayIndex, lessons, todayDayIndex, dateLabel, ctx);
    scheduleTableBody.appendChild(dayRow);
  }

  // Final row for adding a new day
  const nextIndex = maxDayIndex + 1;
  const finalRow = await createFinalRow(nextIndex, ctx);
  scheduleTableBody.appendChild(finalRow);
}

// Initialize date offset control
export function initializeDateOffsetControl() {
  dateOffsetControl = createDateOffsetControl({
    currentOffset: currentDateOffset,
    onApply: applyDateOffset,
    computeTodayDayIndex: () => getTodayDayIndex(currentClassId),
    onGoToToday: () => scrollToToday()
  });
  const dateOffsetContainer = document.getElementById("dateOffsetContainer");
  dateOffsetContainer.innerHTML = '';
  dateOffsetContainer.appendChild(dateOffsetControl);
}

// Initial load with optimized parallel loading
export async function initializeTeacherApp() {
  try {
    // Start loading classes immediately
    await loadClasses(document.getElementById("classSelect"));

    // Initialize date offset control
    initializeDateOffsetControl();

    // Load the schedule for the first class
    await loadFullSchedule();

  } catch (error) {
    console.error('Failed to initialize app:', error);
    showScheduleError();
  }
}

export async function main() {
  initializeLessonSearch(db);
  renderTeacherNav('teacher');
  document.getElementById("classSelect").onchange = loadFullSchedule;
  await initializeTeacherApp();
}

// Check authentication before proceeding. Only run automatically when
// actually loaded on teacher.html - importing this module elsewhere (tests)
// never triggers real auth/Firebase/DOM side effects on its own.
if (document.getElementById('classSelect')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) {
      return; // Stop execution if not authenticated
    }

    // Setup activity listeners for session management
    window.teacherAuth.setupActivityListeners();

    // Continue with normal teacher.js execution
    main();
  })();
}
