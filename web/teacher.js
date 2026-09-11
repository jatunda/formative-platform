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

// Check authentication before proceeding
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

async function main() {

// Initialize lesson search module
initializeLessonSearch(db);

renderTeacherNav('teacher');

// Constants
const BUTTON_CONFIG = {
  width: "110px",
  minWidth: "110px",
  maxWidth: "110px"
};

// Constants imported from constants.js
const POPUP_MAX_HEIGHT = "50vh";

const classSelect = document.getElementById("classSelect");
const scheduleTableBody = document.querySelector("#scheduleTable tbody");
const dateOffsetContainer = document.getElementById("dateOffsetContainer");

let currentClassId = "";
let currentDateOffset = 0;
let dateOffsetControl = null;

// Scroll position management
const SCROLL_STORAGE_KEY = 'teacher-schedule-scroll';
const LAST_VISIT_KEY = 'teacher-schedule-last-visit';
const VISIT_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function saveScrollPosition() {
  const schedulePane = document.getElementById('schedulePane');
  if (schedulePane && currentClassId) {
    const scrollData = {
      classId: currentClassId,
      scrollTop: schedulePane.scrollTop,
      timestamp: Date.now()
    };
    localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollData));
  }
}

function getSavedScrollPosition() {
  try {
    const saved = localStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.classId === currentClassId) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved scroll position:', e);
  }
  return null;
}

function isFirstVisitInAWhile() {
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

function markVisit() {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

async function loadClasses() {
  const snap = await get(ref(db, "classes"));
  const classes = snap.val();
  
  // Clear loading option
  classSelect.innerHTML = "";
  
  // Get class from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const urlClassId = urlParams.get('class');
  
  Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
    .forEach(([id, data]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = data.name;
      classSelect.appendChild(option);
    });

  // Set the class from URL parameter if it exists
  if (urlClassId && classSelect.querySelector(`option[value="${urlClassId}"]`)) {
    classSelect.value = urlClassId;
    
    // Update the editor link immediately if we have a class from URL
    const editorLink = document.getElementById('goToEditorLink');
    if (editorLink) {
      editorLink.href = `editor.html?fromClass=${urlClassId}`;
    }
  }
}

// Use the shared date calculation function
async function getDateForDayIndex(dayIndex, classStartDate = DEFAULT_CLASS_START_DATE) {
  return await sharedGetDateForDayIndex(dayIndex, currentClassId, classStartDate);
}

async function applyDateOffset(newOffset) {
  try {
    await setClassDateOffset(currentClassId, newOffset);
    currentDateOffset = newOffset;
    if (currentClassId) {
      await loadFullSchedule();
    }
    showNotification("Date offset updated successfully!", "success");
  } catch (error) {
    console.error(`Failed to set date offset for class ${currentClassId}:`, error);
    showNotification("Failed to update date offset", "error");
    throw error;
  }
}

// showNotification is imported from notification-utils.js

async function loadFullSchedule() {
  const classId = classSelect.value;
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
    await renderScheduleTable(schedule);
    
    // Hide loading state and show table
    if (loadingState) loadingState.style.display = 'none';
    if (scheduleTable) scheduleTable.style.display = 'table';
    
    // Handle scrolling after table is rendered
    await handleScrollPositioning();
    
  } catch (error) {
    console.error('Error loading schedule:', error);
    showScheduleError();
  }
}

function showScheduleError() {
  showErrorState({
    container: 'schedule-loading-state',
    title: 'Unable to load schedule'
  });
}

async function handleScrollPositioning() {
  const schedulePane = document.getElementById('schedulePane');
  if (!schedulePane) return;
  
  // Get today's day index
  let todayDayIndex;
  try {
    todayDayIndex = await getTodayDayIndex(currentClassId);
  } catch (e) {
    console.warn('Could not determine today\'s day index:', e);
  }
  
  const isFirstVisit = isFirstVisitInAWhile();
  const savedScrollData = getSavedScrollPosition();
  
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
  schedulePane.addEventListener('scroll', debounce(saveScrollPosition, 500));
}

function scrollToToday() {
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
function debounce(func, wait) {
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
async function createFinalRow(nextIndex, ctx) {
  const addRow = document.createElement("tr");

  // Day Index column
  const tdDay = document.createElement("td");
  tdDay.textContent = nextIndex;
  addRow.appendChild(tdDay);

  // Date column
  const tdDate = document.createElement("td");
  tdDate.textContent = await getDateForDayIndex(nextIndex);
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

async function renderScheduleTable(schedule) {
  scheduleTableBody.innerHTML = "";
  const dayIndexes = Object.keys(schedule).map(Number).sort((a, b) => a - b);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;

  // Get today's day index for highlighting
  let todayDayIndex;
  try {
    todayDayIndex = await getTodayDayIndex(currentClassId);
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

  const classId = classSelect.value;
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
    const dateLabel = await getDateForDayIndex(dayIndex);
    const dayRow = await createDayRow(dayIndex, lessons, todayDayIndex, dateLabel, ctx);
    scheduleTableBody.appendChild(dayRow);
  }

  // Final row for adding a new day
  const nextIndex = maxDayIndex + 1;
  const finalRow = await createFinalRow(nextIndex, ctx);
  scheduleTableBody.appendChild(finalRow);
}

classSelect.onchange = loadFullSchedule;

// Initialize date offset control
function initializeDateOffsetControl() {
  dateOffsetControl = createDateOffsetControl({
    currentOffset: currentDateOffset,
    onApply: applyDateOffset,
    computeTodayDayIndex: () => getTodayDayIndex(currentClassId),
    onGoToToday: () => scrollToToday()
  });
  dateOffsetContainer.innerHTML = '';
  dateOffsetContainer.appendChild(dateOffsetControl);
}

// Initial load with optimized parallel loading
async function initializeTeacherApp() {
  try {
    // Start loading classes immediately
    await loadClasses();
    
    // Initialize date offset control
    initializeDateOffsetControl();
    
    // Load the schedule for the first class
    await loadFullSchedule();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showScheduleError();
  }
}

initializeTeacherApp();

// Global function for scrolling to today
window.scrollToToday = scrollToToday;

} // End of main function