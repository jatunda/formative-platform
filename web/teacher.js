// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { 
  initializeDateUtils, 
  getDateForDayIndex as sharedGetDateForDayIndex,
  getTodayDayIndex,
  DEFAULT_CLASS_START_DATE,
  clearDateOffsetCache
} from './date-utils.js';
import {
  initializeLessonSearch,
  showLessonSearchPopup,
  getCachedTitle
} from "./lesson-search.js";

const app = initializeApp({
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

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

const DEFAULT_LESSON_TITLE = "Empty Lesson";
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

// Date offset functions
async function getClassDateOffset(classId) {
  try {
    const snap = await get(ref(db, `classes/${classId}/dateOffset`));
    return snap.exists() ? snap.val() : 0;
  } catch (error) {
    console.error(`Failed to get date offset for class ${classId}:`, error);
    return 0;
  }
}

async function setClassDateOffset(classId, offset) {
  try {
    await set(ref(db, `classes/${classId}/dateOffset`), Number(offset));
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
      pageTitles[pageId] = snap.exists() ? snap.val() : "(Untitled)";
    }

    const li = document.createElement("li");
    li.className = "schedule-list-item";

    const textSpan = document.createElement("span");
    textSpan.textContent = `#${i}: ${pageTitles[pageId]} (Hash:${pageId})`;

    const btnSpan = document.createElement("span");
    btnSpan.className = "flex-row-buttons";

    const upBtn = createArrowButton("up", false, () => moveItem(i, i - 1));
    upBtn.textContent = "↑";
    
    const downBtn = createArrowButton("down", false, () => moveItem(i, i + 1));
    downBtn.textContent = "↓";
    
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

// Show notification messages
function showNotification(message, type = "info") {
  // Remove any existing notification
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '12px 16px';
  notification.style.borderRadius = '8px';
  notification.style.zIndex = '1000';
  notification.style.maxWidth = '300px';
  
  if (type === 'success') {
    notification.style.backgroundColor = '#d4edda';
    notification.style.color = '#155724';
    notification.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f8d7da';
    notification.style.color = '#721c24';
    notification.style.border = '1px solid #f5c6cb';
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

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
  const loadingState = document.getElementById('schedule-loading-state');
  if (loadingState) {
    loadingState.innerHTML = `
      <div style="text-align: center; color: #e53e3e;">
        <h3>Unable to load schedule</h3>
        <p style="color: #a0aec0; margin-bottom: 1rem;">There was a problem connecting to the server.</p>
        <button onclick="location.reload()" style="width: auto; padding: 0.5rem 1rem;">
          Try Again
        </button>
      </div>
    `;
  }
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

  // Helper to insert a new day at a given index
  async function insertDayAt(index) {
    const classId = classSelect.value;
    
    // Read all schedule data at once
    const scheduleSnap = await get(ref(db, `schedule/${classId}`));
    const scheduleData = scheduleSnap.exists() ? scheduleSnap.val() : {};
    
    // Shift all days >= index up by 1 in memory
    const dayIndices = Object.keys(scheduleData).map(Number).sort((a, b) => b - a); // Sort descending for shifting
    
    // Build array of all updates needed
    const writeOperations = [];
    
    for (const dayIdx of dayIndices) {
      if (dayIdx >= index) {
        // Move this day's data to the next index
        writeOperations.push(
          set(ref(db, `schedule/${classId}/${dayIdx + 1}`), scheduleData[dayIdx])
        );
      }
    }
    
    // Set the new day to empty
    writeOperations.push(
      set(ref(db, `schedule/${classId}/${index}`), [])
    );
    
    // Perform all updates
    await Promise.all(writeOperations);
    loadFullSchedule();
  }

  // Helper to delete a day at a given index
  async function deleteDayAt(index) {
    const classId = classSelect.value;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete day ${index}? This will shift all future days back by one.`)) {
      return;
    }
    
    // Read all schedule data at once
    const scheduleSnap = await get(ref(db, `schedule/${classId}`));
    const scheduleData = scheduleSnap.exists() ? scheduleSnap.val() : {};
    
    // Get all day indices and find max
    const dayIndices = Object.keys(scheduleData).map(Number).sort((a, b) => a - b);
    const maxDayIndex = dayIndices.length > 0 ? Math.max(...dayIndices) : 0;
    
    // Build array of all updates needed
    const writeOperations = [];
    
    // Shift all days > index down by 1 in memory
    for (const dayIdx of dayIndices) {
      if (dayIdx > index) {
        // Move this day's data to the previous index
        writeOperations.push(
          set(ref(db, `schedule/${classId}/${dayIdx - 1}`), scheduleData[dayIdx])
        );
      }
    }
    
    // Remove the last day (set to null to delete it)
    writeOperations.push(
      set(ref(db, `schedule/${classId}/${maxDayIndex}`), null)
    );
    
    // Perform all updates
    await Promise.all(writeOperations);
    loadFullSchedule();
  }

  for (let dayIndex = 0; dayIndex <= maxDayIndex; dayIndex++) {
    // --- Insert Day Button (before each row) ---
    const insertRow = document.createElement("tr");
    const insertTd = document.createElement("td");
    insertTd.colSpan = 4;
    insertTd.className = "insert-day-cell";
    insertTd.appendChild(createInsertDayButton(dayIndex, insertDayAt));
    insertRow.appendChild(insertTd);
    scheduleTableBody.appendChild(insertRow);

    // --- Normal Day Row ---
    const lessons = schedule[dayIndex] || [];
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

    // Drop target events
    tdLessons.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      tdLessons.classList.add("td-drop-hover");
    });
    tdLessons.addEventListener("dragleave", (e) => {
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
      const toDayIndex = dayIndex;

      // Prevent dropping into the same day and position
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

    tr.appendChild(tdLessons);

    // Actions column (delete button)
    const tdActions = document.createElement("td");
    tdActions.style.textAlign = "center";
    tdActions.style.verticalAlign = "middle";
    tdActions.style.padding = "4px";
    
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "🗑️";
    deleteButton.className = "delete-day-btn";
    deleteButton.title = `Delete day ${dayIndex}`;
    deleteButton.onclick = () => deleteDayAt(dayIndex);
    tdActions.appendChild(deleteButton);
    
    tr.appendChild(tdActions);

    scheduleTableBody.appendChild(tr);
  }

  // --- Final row for the next day index ---
  const nextIndex = maxDayIndex + 1;
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

  // Add the stacked Link Lesson and New Lesson buttons
  tdLessons.appendChild(createEndButtonsContainer(nextIndex));

  addRow.appendChild(tdLessons);

  // Empty actions column for the final row
  const tdActions = document.createElement("td");
  addRow.appendChild(tdActions);

  scheduleTableBody.appendChild(addRow);
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

// Use CSS classes for styled buttons
function createStyledButton(text, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = "schedule-action-btn";
  btn.onclick = onClick;
  return btn;
}

// Button helper functions
function createNewLessonButton(dayIndex) {
  const btn = document.createElement("button");
  btn.textContent = "New Lesson";
  btn.className = "schedule-action-btn new-lesson-btn";
  btn.onclick = () => addLessonToDay(dayIndex);
  return btn;
}

function createCloseButton(popup) {
  const btn = document.createElement("button");
  btn.textContent = "Close";
  btn.className = "schedule-action-btn";
  btn.onclick = () => document.body.removeChild(popup);
  return btn;
}

function createArrowButton(direction, isDisabled, onClick) {
  const btn = document.createElement("button");
  btn.textContent = direction === "left" ? "←" : "→";
  btn.disabled = isDisabled;
  btn.onclick = onClick;
  return btn;
}

function createDeleteButton(onClick) {
  const btn = document.createElement("button");
  btn.textContent = "🗑️";
  btn.className = "schedule-action-btn delete-btn";
  btn.onclick = onClick;
  return btn;
}

function createInsertDayButton(dayIndex, insertFunction) {
  const btn = document.createElement("button");
  btn.textContent = "+ Insert Day Here";
  btn.className = "schedule-action-btn insert-day-btn";
  btn.onclick = () => insertFunction(dayIndex);
  return btn;
}

// Use CSS classes for lesson clusters
function createLessonCluster(lessonHash, dayIndex, i, lessons) {
  const cluster = document.createElement("span");
  cluster.className = "lesson-cluster";
  cluster.draggable = true;
  cluster.dataset.lessonHash = lessonHash;
  cluster.dataset.dayIndex = dayIndex;
  cluster.dataset.lessonIndex = i;

  cluster.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      lessonHash,
      fromDayIndex: dayIndex,
      fromLessonIndex: i
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
  // Use cached title instead of async loading for better performance
  mainBtn.textContent = pageTitles[lessonHash] || DEFAULT_LESSON_TITLE;
  mainBtn.className = "schedule-action-btn lesson-main-btn";
  mainBtn.onclick = () => {
    window.location.href = `editor.html?page=${lessonHash}&fromClass=${classSelect.value}`;
  };
  topRow.appendChild(mainBtn);

  // Bottom row: left, right, delete
  const bottomRow = document.createElement("div");
  bottomRow.className = "lesson-cluster-bottom";

  // Left arrow
  const leftBtn = createArrowButton("left", i === 0, async () => {
    if (i > 0) {
      const classId = classSelect.value;
      const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
      const newLessons = [...lessons];
      [newLessons[i - 1], newLessons[i]] = [newLessons[i], newLessons[i - 1]];
      await set(dayRef, newLessons);
      loadFullSchedule();
    }
  });
  bottomRow.appendChild(leftBtn);

  // Right arrow
  const rightBtn = createArrowButton("right", i === lessons.length - 1, async () => {
    if (i < lessons.length - 1) {
      const classId = classSelect.value;
      const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
      const newLessons = [...lessons];
      [newLessons[i], newLessons[i + 1]] = [newLessons[i + 1], newLessons[i]];
      await set(dayRef, newLessons);
      loadFullSchedule();
    }
  });
  bottomRow.appendChild(rightBtn);

  // Delete button
  const delBtn = createDeleteButton(async () => {
    const classId = classSelect.value;
    const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
    const newLessons = lessons.filter((_, idx) => idx !== i);
    await set(dayRef, newLessons);
    loadFullSchedule();
  });
  bottomRow.appendChild(delBtn);

  cluster.appendChild(topRow);
  cluster.appendChild(bottomRow);

  return cluster;
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