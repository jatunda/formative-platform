// Schedule Management Functions
import {
  getScheduleForDay,
  updateScheduleForDay,
  getFullSchedule,
  getClasses,
  getLessonTitleFromDB,
  moveLessonInSchedule,
  removeLessonFromSchedule,
  moveLessonBetweenDays,
  insertDayAt,
  getClassDateOffset
} from "./database-utils.js";
import {
  createInsertDayButton,
  createNewLessonButton,
  createElement,
  createUpArrowButton,
  createDownArrowButton,
  createDeleteButton
} from "./ui-components.js";
import {
  createLessonCluster,
  appendLinkLessonButton,
  addLessonToDay,
  getLessonTitle
} from "./lesson-manager.js";
import { DEFAULT_CLASS_START_DATE, UNTITLED_LESSON } from "./constants.js";

// Date calculation with offset support
export async function getDateForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  let dateOffset = 0;
  if (classId) {
    try {
      dateOffset = await getClassDateOffset(classId);
    } catch (error) {
      console.warn(`Could not load date offset for class ${classId}, using default 0`);
    }
  }
  
  const start = new Date(classStartDate);
  const date = new Date(start);
  // Apply both day index and date offset
  date.setDate(start.getDate() + Number(dayIndex) + Number(dateOffset));
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long"
  });
  return `${date.toLocaleDateString()} (${weekday})`;
}

// Load all classes into the class select dropdown
export async function loadClasses(classSelectElement) {
  const classes = await getClasses();
  if (!classes) return; // Handle null/undefined
  Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
    .forEach(([id, data]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = data.name;
      classSelectElement.appendChild(option);
    });
}

// Load full schedule for the selected class
export async function loadFullSchedule(classSelectElement, renderCallback) {
  const classId = classSelectElement.value;
  const schedule = await getFullSchedule(classId);
  renderCallback(schedule);
}

// Load schedule for a specific day (for the simple schedule list view)
export async function loadSchedule(classSelectElement, dayInputElement, renderCallback) {
  const classId = classSelectElement.value;
  const dayIndex = dayInputElement.value;
  const schedule = await getScheduleForDay(classId, dayIndex);
  renderCallback(schedule);
}

// Get date string for a given day index (sync version, without classId)
export function getDateForDayIndexSync(dayIndex, classStartDate = DEFAULT_CLASS_START_DATE) {
  // Example: classStartDate is a Monday in ISO format
  const start = new Date(classStartDate);
  const date = new Date(start);
  date.setDate(start.getDate() + Number(dayIndex));
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long"
  });
  return `${date.toLocaleDateString()} (${weekday})`;
}

// Render the main schedule table
export async function renderScheduleTable(schedule, scheduleTableBody, classSelectElement, loadFullScheduleCallback) {
  scheduleTableBody.innerHTML = "";
  const dayIndexes = Object.keys(schedule).map(Number).sort((a, b) => a - b);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;

  // Helper to insert a new day at a given index
  async function insertDayAtIndex(index) {
    const classId = classSelectElement.value;
    await insertDayAt(classId, index, maxDayIndex);
    loadFullScheduleCallback();
  }

  for (let dayIndex = 0; dayIndex <= maxDayIndex; dayIndex++) {
    // --- Insert Day Button (before each row except the first) ---
    if (dayIndex > 0) {
      const insertRow = document.createElement("tr");
      const insertTd = document.createElement("td");
      insertTd.colSpan = 3;
      insertTd.className = "insert-day-cell";
      insertTd.appendChild(createInsertDayButton(dayIndex, insertDayAtIndex));
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
      tdLessons.appendChild(await createLessonCluster(lessonHash, dayIndex, i, lessons, loadFullScheduleCallback, classSelectElement));
    }

    // Insert the "Link Lesson" button before the "+ New Lesson" button
    appendLinkLessonButton(tdLessons, dayIndex, classSelectElement, loadFullScheduleCallback);

    // Always add the "+ New Lesson" button
    tdLessons.appendChild(createNewLessonButton(dayIndex, (dayIdx) => addLessonToDay(dayIdx, classSelectElement, loadFullScheduleCallback)));

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

      // Move lesson between days using database utility
      await moveLessonBetweenDays(classSelectElement.value, fromDayIndex, fromLessonIndex, toDayIndex);

      loadFullScheduleCallback();
    });

    tr.appendChild(tdLessons);

    // Date column
    const tdDate = document.createElement("td");
    tdDate.textContent = await getDateForDayIndex(dayIndex, classSelectElement.value);
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
  appendLinkLessonButton(tdLessons, nextIndex, classSelectElement, loadFullScheduleCallback);

  // "+ New Lesson" button
  tdLessons.appendChild(createNewLessonButton(nextIndex, (dayIdx) => addLessonToDay(dayIdx, classSelectElement, loadFullScheduleCallback)));

  addRow.appendChild(tdLessons);

  // Date column
  const tdDate = document.createElement("td");
  tdDate.textContent = await getDateForDayIndex(nextIndex, classSelectElement.value);
  addRow.appendChild(tdDate);

  scheduleTableBody.appendChild(addRow);
}

// Render the simple schedule list (for individual day editing)
export async function renderScheduleList(schedule, scheduleListElement, currentClassId, dayInputElement, renderCallback) {
  scheduleListElement.innerHTML = "";

  for (let i = 0; i < schedule.length; i++) {
    const pageId = schedule[i];

    // Get lesson title
    const title = await getLessonTitle(pageId);

    const li = createElement("li", "schedule-list-item");

    const textSpan = createElement("span", "", `#${i}: ${title} (Hash:${pageId})`);

    const btnSpan = createElement("span", "flex-row-buttons");

    const upBtn = createUpArrowButton(() => moveItem(i, i - 1, schedule, currentClassId, dayInputElement, renderCallback));
    const downBtn = createDownArrowButton(() => moveItem(i, i + 1, schedule, currentClassId, dayInputElement, renderCallback));
    const delBtn = createDeleteButton(() => deleteItem(i, schedule, currentClassId, dayInputElement, renderCallback));

    btnSpan.appendChild(upBtn);
    btnSpan.appendChild(downBtn);
    btnSpan.appendChild(delBtn);

    li.appendChild(textSpan);
    li.appendChild(btnSpan);
    scheduleListElement.appendChild(li);
  }
}

// Move item within schedule list
async function moveItem(from, to, schedule, currentClassId, dayInputElement, renderCallback) {
  const dayIndex = dayInputElement.value;
  const success = await moveLessonInSchedule(currentClassId, dayIndex, from, to);
  if (success) {
    // Update local state to match database
    const [moved] = schedule.splice(from, 1);
    schedule.splice(to, 0, moved);
    renderCallback(schedule);
  }
}

// Delete item from schedule list
async function deleteItem(index, schedule, currentClassId, dayInputElement, renderCallback) {
  const dayIndex = dayInputElement.value;
  await removeLessonFromSchedule(currentClassId, dayIndex, index);
  // Update local state to match database
  schedule.splice(index, 1);
  renderCallback(schedule);
}

// Update schedule in database (for simple schedule list)
export async function updateScheduleInDB(schedule, currentClassId, dayInputElement) {
  const dayIndex = dayInputElement.value;
  await updateScheduleForDay(currentClassId, dayIndex, schedule);
}
