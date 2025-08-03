import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { 
  initializeDateUtils, 
  getDateForDayIndex as sharedGetDateForDayIndex,
  getTodayDayIndex,
  DEFAULT_CLASS_START_DATE
} from './date-utils.js';

const app = initializeApp({
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

// Initialize date utilities
initializeDateUtils(db);

// Constants
const BUTTON_CONFIG = {
  width: "110px",
  minWidth: "110px",
  maxWidth: "110px"
};

const DEFAULT_LESSON_TITLE = "Empty Lesson";
const POPUP_MAX_HEIGHT = "50vh";

const pageTitles = {}; // id → title

const classSelect = document.getElementById("classSelect");
const dayInput = document.getElementById("dayInput");
const loadBtn = document.getElementById("loadSchedule");
const scheduleList = document.getElementById("scheduleList");
const newPageIdInput = document.getElementById("newPageId");
const insertPosInput = document.getElementById("insertPosition");
const scheduleTableBody = document.querySelector("#scheduleTable tbody");
const dateOffsetContainer = document.getElementById("dateOffsetContainer");

let currentClassId = "";
let currentSchedule = [];
let currentDateOffset = 0;
let dateOffsetControl = null;

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
    return true;
  } catch (error) {
    console.error(`Failed to set date offset for class ${classId}:`, error);
    return false;
  }
}

async function loadClasses() {
  const snap = await get(ref(db, "classes"));
  const classes = snap.val();
  Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
    .forEach(([id, data]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = data.name;
      classSelect.appendChild(option);
    });
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

loadBtn.onclick = loadSchedule;

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
  
  container.appendChild(label);
  container.appendChild(currentDisplay);
  container.appendChild(exampleDisplay);
  container.appendChild(input);
  container.appendChild(applyBtn);
  
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
  currentClassId = classId;
  
  // Load the date offset for this class
  currentDateOffset = await getClassDateOffset(classId);
  
  // Update the date offset control if it exists
  if (dateOffsetControl) {
    await dateOffsetControl.updateOffset(currentDateOffset);
  }
  
  // Fetch all days for this class
  const snap = await get(ref(db, `schedule/${classId}`));
  const schedule = snap.val() || {};
  renderScheduleTable(schedule);
}

async function renderScheduleTable(schedule) {
  scheduleTableBody.innerHTML = "";
  const dayIndexes = Object.keys(schedule).map(Number).sort((a, b) => a - b);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;

  // Helper to insert a new day at a given index
  async function insertDayAt(index) {
    const classId = classSelect.value;
    // Shift all days >= index up by 1
    for (let i = maxDayIndex; i >= index; i--) {
      const fromRef = ref(db, `schedule/${classId}/${i}`);
      const toRef = ref(db, `schedule/${classId}/${i + 1}`);
      const snap = await get(fromRef);
      if (snap.exists()) {
        await set(toRef, snap.val());
      } else {
        await set(toRef, []);
      }
    }
    // Set the new day to empty
    await set(ref(db, `schedule/${classId}/${index}`), []);
    loadFullSchedule();
  }

  for (let dayIndex = 0; dayIndex <= maxDayIndex; dayIndex++) {
    // --- Insert Day Button (before each row except the first) ---
    if (dayIndex > 0) {
      const insertRow = document.createElement("tr");
      const insertTd = document.createElement("td");
      insertTd.colSpan = 3;
      insertTd.className = "insert-day-cell";
      insertTd.appendChild(createInsertDayButton(dayIndex, insertDayAt));
      insertRow.appendChild(insertTd);
      scheduleTableBody.appendChild(insertRow);
    }

    // --- Normal Day Row ---
    const lessons = schedule[dayIndex] || [];
    const tr = document.createElement("tr");

    // Day Index
    const tdDay = document.createElement("td");
    tdDay.textContent = dayIndex;
    tr.appendChild(tdDay);

    // Lessons (horizontal buttons or just a plus if empty)
    const tdLessons = document.createElement("td");
    tdLessons.className = "lessons-cell";

    for (let i = 0; i < lessons.length; i++) {
      const lessonHash = lessons[i];
      tdLessons.appendChild(await createLessonCluster(lessonHash, dayIndex, i, lessons));
    }

    // Insert the "Link Lesson" button before the "+ New Lesson" button
    appendLinkLessonButton(tdLessons, dayIndex);

    // Always add the "+ New Lesson" button
    tdLessons.appendChild(createNewLessonButton(dayIndex));

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

      // Remove from old day
      const classId = classSelect.value;
      const fromDayRef = ref(db, `schedule/${classId}/${fromDayIndex}`);
      const fromSnap = await get(fromDayRef);
      const fromLessons = fromSnap.exists() ? fromSnap.val() : [];
      fromLessons.splice(fromLessonIndex, 1);
      await set(fromDayRef, fromLessons);

      // Add to new day
      const toDayRef = ref(db, `schedule/${classId}/${toDayIndex}`);
      const toSnap = await get(toDayRef);
      const toLessons = toSnap.exists() ? toSnap.val() : [];
      toLessons.push(lessonHash);
      await set(toDayRef, toLessons);

      loadFullSchedule();
    });

    tr.appendChild(tdLessons);

    // Date column
    const tdDate = document.createElement("td");
    tdDate.textContent = await getDateForDayIndex(dayIndex);
    tr.appendChild(tdDate);

    scheduleTableBody.appendChild(tr);
  }

  // --- Final row for the next day index ---
  const nextIndex = maxDayIndex + 1;
  const addRow = document.createElement("tr");

  // Day Index column
  const tdDay = document.createElement("td");
  tdDay.textContent = nextIndex;
  addRow.appendChild(tdDay);

  // Lessons column with "Link Lesson" and "+ New Lesson" buttons
  const tdLessons = document.createElement("td");
  tdLessons.className = "lessons-cell";

  // "Link Lesson" button
  appendLinkLessonButton(tdLessons, nextIndex);

  // "+ New Lesson" button
  tdLessons.appendChild(createNewLessonButton(nextIndex));

  addRow.appendChild(tdLessons);

  // Date column
  const tdDate = document.createElement("td");
  tdDate.textContent = await getDateForDayIndex(nextIndex);
  addRow.appendChild(tdDate);

  scheduleTableBody.appendChild(addRow);
}

async function getLessonTitle(hash) {
  if (pageTitles[hash]) return pageTitles[hash];
  const snap = await get(ref(db, `content/${hash}/title`));
  pageTitles[hash] = snap.exists() ? snap.val() : "(Untitled)";
  return pageTitles[hash];
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

  // 2. Create a blank lesson in the database
  await set(ref(db, `content/${hash}`), {
    title: DEFAULT_LESSON_TITLE
  });

  // 3. Add the new lesson hash to the schedule for the given day
  const classId = classSelect.value;
  const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
  const snap = await get(dayRef);
  const lessons = snap.exists() ? snap.val() : [];
  lessons.push(hash);
  await set(dayRef, lessons);

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

// Initial load
loadClasses().then(() => {
  initializeDateOffsetControl();
  loadFullSchedule();
});

function showLessonLinkPopup({ onSelect }) {
  (async () => {
    const snap = await get(ref(db, "content"));
    if (!snap.exists()) {
      alert("No lessons found.");
      return;
    }
    const contentMap = snap.val();
    // Create popup
    const popup = document.createElement("div");
    popup.className = "lesson-popup";

    const box = document.createElement("div");
    box.className = "lesson-popup-box";

    const closeBtn = createCloseButton(popup);
    closeBtn.className = "popup-close-btn";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search lessons by name...";
    searchInput.className = "lesson-popup-search";

    const resultsDiv = document.createElement("div");
    resultsDiv.className = "lesson-popup-results";

    function renderResults(filter) {
      resultsDiv.innerHTML = "";
      const filterLower = filter.trim().toLowerCase();
      const items = Object.entries(contentMap)
        .map(([id, data]) => ({
          id,
          title: (data.title || "(Untitled)").toString()
        }))
        .filter(item => item.title.toLowerCase().includes(filterLower) || item.id.includes(filterLower))
        .sort((a, b) => a.title.localeCompare(b.title));
      if (items.length === 0) {
        const noRes = document.createElement("div");
        noRes.textContent = "No results.";
        resultsDiv.appendChild(noRes);
        return;
      }
      for (const item of items) {
        const btn = document.createElement("button");
        btn.textContent = `${item.title} (${item.id})`;
        btn.className = "lesson-popup-result-btn";
        btn.onclick = async () => {
          document.body.removeChild(popup);
          onSelect(item.id);
        };
        resultsDiv.appendChild(btn);
      }
    }

    searchInput.oninput = () => renderResults(searchInput.value);
    renderResults("");

    box.appendChild(closeBtn);
    box.appendChild(searchInput);
    box.appendChild(resultsDiv);
    popup.appendChild(box);
    document.body.appendChild(popup);
  })();
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
  btn.textContent = "+ New Lesson";
  btn.className = "new-lesson-btn";
  btn.onclick = () => addLessonToDay(dayIndex);
  return btn;
}

function createCloseButton(popup) {
  const btn = document.createElement("button");
  btn.textContent = "Close";
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
  btn.onclick = onClick;
  return btn;
}

function createInsertDayButton(dayIndex, insertFunction) {
  const btn = document.createElement("button");
  btn.textContent = "+ Insert Day Here";
  btn.className = "insert-day-btn";
  btn.onclick = () => insertFunction(dayIndex);
  return btn;
}

// Use CSS classes for lesson clusters
async function createLessonCluster(lessonHash, dayIndex, i, lessons) {
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
  mainBtn.textContent = await getLessonTitle(lessonHash);
  mainBtn.className = "lesson-main-btn";
  mainBtn.onclick = () => {
    window.location.href = `editor.html?page=${lessonHash}`;
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
        await set(dayRef, lessons);
        loadFullSchedule();
      }
    });
  }));
}