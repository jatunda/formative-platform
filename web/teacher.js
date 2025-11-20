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
import { DEFAULT_CLASS_START_DATE, DEFAULT_LESSON_TITLE, UNTITLED_LESSON } from './constants.js';
import { showNotification } from './notification-utils.js';
import {
	createStyledButton,
	createNewLessonButton as createNewLessonButtonShared,
	createCloseButton,
	createArrowButton,
	createDeleteButton,
	createInsertDayButton,
	createUpArrowButton,
	createDownArrowButton,
	createLeftArrowButton,
	createRightArrowButton
} from './ui-components.js';
import {
  initializeLessonSearch,
  showLessonSearchPopup,
  getCachedTitle
} from "./lesson-search.js";
import {
  insertDayAt,
  deleteDayAt,
  initializeDatabase,
  getClassDateOffset as getClassDateOffsetDB,
  setClassDateOffset as setClassDateOffsetDB
} from "./database-utils.js";
import {
  showErrorState
} from "./error-ui-utils.js";
import {
  createLessonClusterWithDB
} from "./lesson-manager.js";

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
 * Create a row with an insert day button
 * @param {number} dayIndex - The day index to insert before
 * @param {Function} onInsert - Callback function when insert is clicked
 * @returns {HTMLTableRowElement} The insert row element
 */
function createInsertDayRow(dayIndex, onInsert) {
  const insertRow = document.createElement("tr");
  const insertTd = document.createElement("td");
  insertTd.colSpan = 4;
  insertTd.className = "insert-day-cell";
  insertTd.appendChild(createInsertDayButton(dayIndex, onInsert));
  insertRow.appendChild(insertTd);
  return insertRow;
}

/**
 * Setup drag-and-drop handlers for a lessons cell
 * @param {HTMLTableCellElement} tdLessons - The lessons cell element
 * @param {number} toDayIndex - The target day index for drops
 */
function setupDropHandlers(tdLessons, toDayIndex) {
  tdLessons.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    tdLessons.classList.add("td-drop-hover");
  });
  
  tdLessons.addEventListener("dragleave", () => {
    tdLessons.classList.remove("td-drop-hover");
  });
  
  tdLessons.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    tdLessons.classList.remove("td-drop-hover");
    
    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    
    const { lessonHash, fromDayIndex, fromLessonIndex } = data;
    
    // Prevent dropping into the same day
    if (Number(fromDayIndex) === Number(toDayIndex)) return;
    
    // Batch the drag and drop operation
    const classId = classSelect.value;
    
    // Read both days at once
    const [fromSnap, toSnap] = await Promise.all([
      get(ref(db, `schedule/${classId}/${fromDayIndex}`)),
      get(ref(db, `schedule/${classId}/${toDayIndex}`))
    ]);
    
    const fromLessons = fromSnap.exists() ? fromSnap.val() : [];
    const toLessons = toSnap.exists() ? toSnap.val() : [];
    
    // Modify arrays in memory
    fromLessons.splice(fromLessonIndex, 1);
    toLessons.push(lessonHash);
    
    // Write both changes as individual operations
    await Promise.all([
      set(ref(db, `schedule/${classId}/${fromDayIndex}`), fromLessons),
      set(ref(db, `schedule/${classId}/${toDayIndex}`), toLessons)
    ]);
    loadFullSchedule();
  });
}

/**
 * Create the actions column with delete button
 * @param {number} dayIndex - The day index
 * @returns {HTMLTableCellElement} The actions cell element
 */
function createActionsCell(dayIndex) {
  const tdActions = document.createElement("td");
  tdActions.style.textAlign = "center";
  tdActions.style.verticalAlign = "middle";
  tdActions.style.padding = "4px";
  
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "🗑️";
  deleteButton.className = "delete-day-btn";
  deleteButton.title = `Delete day ${dayIndex}`;
  deleteButton.onclick = async () => {
    const classId = classSelect.value;
    if (!confirm(`Are you sure you want to delete day ${dayIndex}? This will shift all future days back by one.`)) {
      return;
    }
    try {
      await deleteDayAt(classId, dayIndex);
      loadFullSchedule();
    } catch (error) {
      console.error("Failed to delete day:", error);
      showNotification("Failed to delete day. Please try again.", "error");
    }
  };
  tdActions.appendChild(deleteButton);
  
  return tdActions;
}

/**
 * Create a day row in the schedule table
 * @param {number} dayIndex - The day index
 * @param {string[]} lessons - Array of lesson hashes for this day
 * @param {number|undefined} todayDayIndex - Today's day index for highlighting
 * @returns {Promise<HTMLTableRowElement>} The day row element
 */
async function createDayRow(dayIndex, lessons, todayDayIndex) {
  const tr = document.createElement("tr");
  
  // Highlight today's row
  if (todayDayIndex !== undefined && dayIndex === todayDayIndex) {
    tr.className = "today-row";
  }
  
  // Day Index
  const tdDay = document.createElement("td");
  tdDay.textContent = dayIndex;
  tr.appendChild(tdDay);
  
  // Date column
  const tdDate = document.createElement("td");
  tdDate.textContent = await getDateForDayIndex(dayIndex);
  tr.appendChild(tdDate);
  
  // Lessons (horizontal buttons or just a plus if empty)
  const tdLessons = document.createElement("td");
  tdLessons.className = "lessons-cell";
  
  for (let i = 0; i < lessons.length; i++) {
    const lessonHash = lessons[i];
    tdLessons.appendChild(createLessonCluster(lessonHash, dayIndex, i, lessons));
  }
  
  // Add the stacked Link Lesson and New Lesson buttons
  tdLessons.appendChild(createEndButtonsContainer(dayIndex));
  
  // Setup drag-and-drop handlers
  setupDropHandlers(tdLessons, dayIndex);
  
  tr.appendChild(tdLessons);
  
  // Actions column (delete button)
  tr.appendChild(createActionsCell(dayIndex));
  
  return tr;
}

/**
 * Create the final row for adding a new day
 * @param {number} nextIndex - The next day index
 * @returns {Promise<HTMLTableRowElement>} The final row element
 */
async function createFinalRow(nextIndex) {
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
  tdLessons.appendChild(createEndButtonsContainer(nextIndex));
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
  // Remove duplicates and load titles in batch
  const uniqueHashes = [...new Set(allLessonHashes)];
  if (uniqueHashes.length > 0) {
    await getLessonTitles(uniqueHashes);
  }

  // Wrapper function for inserting a day
  async function handleInsertDay(index) {
    const classId = classSelect.value;
    try {
      await insertDayAt(classId, index, maxDayIndex);
      loadFullSchedule();
    } catch (error) {
      console.error("Failed to insert day:", error);
      showNotification("Failed to insert day. Please try again.", "error");
    }
  }

  // Render all days
  for (let dayIndex = 0; dayIndex <= maxDayIndex; dayIndex++) {
    // Insert row before each day
    scheduleTableBody.appendChild(createInsertDayRow(dayIndex, handleInsertDay));

    // Day row
    const lessons = schedule[dayIndex] || [];
    const dayRow = await createDayRow(dayIndex, lessons, todayDayIndex);
    scheduleTableBody.appendChild(dayRow);
  }

  // Final row for adding a new day
  const nextIndex = maxDayIndex + 1;
  const finalRow = await createFinalRow(nextIndex);
  scheduleTableBody.appendChild(finalRow);
}

// Optimize title fetching with batching
async function getLessonTitles(hashes) {
  const missingHashes = hashes.filter(hash => !pageTitles[hash]);
  
  if (missingHashes.length > 0) {
    // Batch fetch missing titles
    const titlePromises = missingHashes.map(async (hash) => {
      const snap = await get(ref(db, `content/${hash}/title`));
      return { hash, title: snap.exists() ? snap.val() : "(Untitled)" };
    });
    
    const results = await Promise.all(titlePromises);
    results.forEach(({ hash, title }) => {
      pageTitles[hash] = title;
    });
  }
  
  return hashes.map(hash => pageTitles[hash]);
}

async function getLessonTitle(hash) {
  if (pageTitles[hash]) return pageTitles[hash];
  const titles = await getLessonTitles([hash]);
  return titles[0];
}

async function addLessonToDay(dayIndex) {
  // 1. Generate a unique hash for the new lesson
  let hash;
  let exists = true;
  while (exists) {
    hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const snap = await get(ref(db, `content/${hash}`));
    exists = snap.exists();
  }

  const classId = classSelect.value;
  
  // 2. Read current schedule for the day
  const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
  const snap = await get(dayRef);
  const lessons = snap.exists() ? snap.val() : [];
  lessons.push(hash);

  // 3. Create lesson content and update schedule as separate operations
  await Promise.all([
    set(ref(db, `content/${hash}`), { title: DEFAULT_LESSON_TITLE }),
    set(ref(db, `schedule/${classId}/${dayIndex}`), lessons)
  ]);

  // 4. Reload the table to show the new lesson
  loadFullSchedule();
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

// Use the shared lesson search popup
function showLessonLinkPopup({ onSelect }) {
  showLessonSearchPopup({ onSelect });
}

// UI component functions are imported from ui-components.js
// Wrapper for createNewLessonButton to match local usage pattern
function createNewLessonButton(dayIndex) {
	return createNewLessonButtonShared(dayIndex, addLessonToDay);
}

// createLessonCluster is imported from lesson-manager.js
// Wrapper function to match local usage pattern
function createLessonCluster(lessonHash, dayIndex, i, lessons) {
  return createLessonClusterWithDB({
    lessonHash,
    dayIndex,
    lessonIndex: i,
    lessons,
    lessonTitle: pageTitles[lessonHash] || DEFAULT_LESSON_TITLE,
    classId: classSelect.value,
    database: db,
    onScheduleReload: loadFullSchedule
  });
}

function appendLinkLessonButton(td, dayIndex) {
  td.appendChild(createStyledButton("Link Lesson", () => {
    showLessonLinkPopup({
      onSelect: async (lessonId) => {
        const classId = classSelect.value;
        const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
        const snap = await get(dayRef);
        const lessons = snap.exists() ? snap.val() : [];
        lessons.push(lessonId);
        
        // Single database write operation
        await set(dayRef, lessons);
        loadFullSchedule();
      }
    });
  }));
}

// Helper function to create the stacked button container
function createEndButtonsContainer(dayIndex) {
  const container = document.createElement("div");
  container.className = "lessons-end-buttons";
  
  // Link Lesson button
  const linkBtn = createStyledButton("Link Lesson", () => {
    showLessonLinkPopup({
      onSelect: async (lessonId) => {
        const classId = classSelect.value;
        const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
        const snap = await get(dayRef);
        const lessons = snap.exists() ? snap.val() : [];
        lessons.push(lessonId);
        
        // Single database write operation
        await set(dayRef, lessons);
        loadFullSchedule();
      }
    });
  });
  
  // New Lesson button
  const newBtn = createNewLessonButton(dayIndex);
  
  container.appendChild(linkBtn);
  container.appendChild(newBtn);
  
  return container;
}

} // End of main function