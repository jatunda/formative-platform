// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import {
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import {
  initializeDateUtils,
  getDateForDayIndex as sharedGetDateForDayIndex,
  getTodayDayIndex,
  clearDateOffsetCache
} from './date-utils.js';
import { DEFAULT_CLASS_START_DATE, UNTITLED_LESSON } from './constants.js';
import { showNotification } from './notification-utils.js';
import {
	createUpArrowButton,
	createDownArrowButton,
	createDeleteButton
} from './ui-components.js';
import {
  initializeLessonSearch
} from "./lesson-search.js";
import {
  initializeDatabase,
  getClassDateOffset as getClassDateOffsetDB,
  setClassDateOffset as setClassDateOffsetDB
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

// Keep local pageTitles cache for existing functionality until fully refactored
const pageTitles = {}; // id → title

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
const dayInput = document.getElementById("dayInput");
const scheduleList = document.getElementById("scheduleList");
const newPageIdInput = document.getElementById("newPageId");
const insertPosInput = document.getElementById("insertPosition");
const scheduleTableBody = document.querySelector("#scheduleTable tbody");
const dateOffsetContainer = document.getElementById("dateOffsetContainer");

let currentClassId = "";
let currentSchedule = [];
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

// Date offset functions - wrappers around database-utils functions
// These handle local state (currentDateOffset) and cache clearing
async function getClassDateOffset(classId) {
  try {
    const offset = await getClassDateOffsetDB(classId);
    return offset;
  } catch (error) {
    console.error(`Failed to get date offset for class ${classId}:`, error);
    return 0;
  }
}

async function setClassDateOffset(classId, offset) {
  try {
    await setClassDateOffsetDB(classId, offset);
    currentDateOffset = Number(offset);
    // Clear cache so next query gets fresh data
    clearDateOffsetCache(classId);
    return true;
  } catch (error) {
    console.error(`Failed to set date offset for class ${classId}:`, error);
    return false;
  }
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

async function loadSchedule() {
  currentClassId = classSelect.value;
  const dayIndex = dayInput.value;
  const snap = await get(ref(db, `schedule/${currentClassId}/${dayIndex}`));
  currentSchedule = snap.val() || [];

  renderScheduleList();
}

async function renderScheduleList() {
  scheduleList.innerHTML = "";

  for (let i = 0; i < currentSchedule.length; i++) {
    const pageId = currentSchedule[i];

    if (!pageTitles[pageId]) {
      const snap = await get(ref(db, `content/${pageId}/title`));
      pageTitles[pageId] = snap.exists() ? snap.val() : UNTITLED_LESSON;
    }

    const li = document.createElement("li");
    li.className = "schedule-list-item";

    const textSpan = document.createElement("span");
    textSpan.textContent = `#${i}: ${pageTitles[pageId]} (Hash:${pageId})`;

    const btnSpan = document.createElement("span");
    btnSpan.className = "flex-row-buttons";

    const upBtn = createUpArrowButton(() => moveItem(i, i - 1));
    const downBtn = createDownArrowButton(() => moveItem(i, i + 1));
    
    const delBtn = createDeleteButton(() => deleteItem(i));

    btnSpan.appendChild(upBtn);
    btnSpan.appendChild(downBtn);
    btnSpan.appendChild(delBtn);

    li.appendChild(textSpan);
    li.appendChild(btnSpan);
    scheduleList.appendChild(li);
  }
}


async function updateScheduleInDB() {
  const dayIndex = dayInput.value;
  const path = `schedule/${currentClassId}/${dayIndex}`;
  await set(ref(db, path), currentSchedule);
}

function moveItem(from, to) {
  if (to < 0 || to >= currentSchedule.length) return;
  const [moved] = currentSchedule.splice(from, 1);
  currentSchedule.splice(to, 0, moved);
  renderScheduleList();
  updateScheduleInDB();
}

function deleteItem(index) {
  currentSchedule.splice(index, 1);
  renderScheduleList();
  updateScheduleInDB();
}

// Use the shared date calculation function
async function getDateForDayIndex(dayIndex, classStartDate = DEFAULT_CLASS_START_DATE) {
  return await sharedGetDateForDayIndex(dayIndex, currentClassId, classStartDate);
}

// Create date offset control UI
function createDateOffsetControl() {
  const container = document.createElement("div");
  container.className = "date-offset-control";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "8px";
  
  const label = document.createElement("label");
  label.textContent = "Date Offset (days): ";
  
  // Current offset display
  const currentDisplay = document.createElement("span");
  currentDisplay.className = "current-offset-display";
  currentDisplay.textContent = `Current: ${currentDateOffset}`;
  currentDisplay.style.fontWeight = "bold";
  currentDisplay.style.color = "#007cba";
  currentDisplay.style.backgroundColor = "#e8f4fd";
  currentDisplay.style.padding = "4px 8px";
  currentDisplay.style.borderRadius = "4px";
  currentDisplay.style.border = "1px solid #b3d9f7";
  currentDisplay.style.fontSize = "0.9rem";
  
  // Today's day index display
  const exampleDisplay = document.createElement("span");
  exampleDisplay.className = "today-dayindex-display";
  exampleDisplay.style.fontSize = "0.85rem";
  exampleDisplay.style.color = "#666";
  exampleDisplay.style.fontStyle = "italic";
  
  async function updateTodayDayIndex(offset) {
    // Use the shared utility function to get today's day index
    const todayDayIndex = await getTodayDayIndex(currentClassId);
    exampleDisplay.textContent = `(Today is Day ${todayDayIndex})`;
  }
  
  updateTodayDayIndex(currentDateOffset);
  
  const input = document.createElement("input");
  input.type = "number";
  input.value = currentDateOffset;
  input.style.width = "80px";
  input.placeholder = "New offset";
  
  const applyBtn = document.createElement("button");
  applyBtn.textContent = "Apply";
  applyBtn.className = "schedule-action-btn";
  applyBtn.style.padding = "4px 12px";
  applyBtn.style.fontSize = "0.9rem";
  
  applyBtn.onclick = async () => {
    const newOffset = parseInt(input.value) || 0;
    const success = await setClassDateOffset(currentClassId, newOffset);
    if (success) {
      // Update the current display
      currentDisplay.textContent = `Current: ${newOffset}`;
      await updateTodayDayIndex(newOffset);
      // Update the display immediately
      if (currentClassId) {
        await loadFullSchedule();
      }
      // Show success message
      showNotification("Date offset updated successfully!", "success");
    } else {
      showNotification("Failed to update date offset", "error");
    }
  };
  
  // Go to Today button
  const goToTodayBtn = document.createElement("button");
  goToTodayBtn.textContent = "Go to Today";
  goToTodayBtn.className = "schedule-action-btn go-to-today-btn";
  goToTodayBtn.style.padding = "4px 12px";
  goToTodayBtn.style.fontSize = "0.9rem";
  goToTodayBtn.onclick = () => scrollToToday();
  
  container.appendChild(label);
  container.appendChild(currentDisplay);
  container.appendChild(exampleDisplay);
  container.appendChild(input);
  container.appendChild(applyBtn);
  container.appendChild(goToTodayBtn);
  
  // Method to update the displayed offset
  container.updateOffset = async (newOffset) => {
    input.value = newOffset;
    currentDisplay.textContent = `Current: ${newOffset}`;
    await updateTodayDayIndex(newOffset);
  };
  
  return container;
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
  dateOffsetControl = createDateOffsetControl();
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