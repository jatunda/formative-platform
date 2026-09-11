// public/landing.js
import { ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import { initializeDateUtils, getTodayDayIndex, primeDateOffsetCache } from './date-utils.js';
import { showErrorState, showSlowConnectionMessage, withConnectionTimeout } from './error-ui-utils.js';


// Initialize date utilities with database
initializeDateUtils(db);

/**
 * Fetch every Class, each with today's Day Index and that day's Schedule
 * (a list of Lesson ids, empty if there's nothing scheduled).
 * @returns {Promise<Array<{classId: string, name: string, dayIndex: number, schedule: string[]}>>}
 *   Sorted by each Class's displayOrder.
 */
export async function getClassesWithTodaySchedule() {
  if (!db) {
    throw new Error("Database not initialized");
  }

  console.log("Fetching classes from database...");
  const classesSnap = await get(ref(db, "classes"));

  if (!classesSnap.exists()) {
    console.warn("Classes node does not exist in database");
    return [];
  }

  const classes = classesSnap.val() || {};
  console.log("Classes data:", classes);

  if (Object.keys(classes).length === 0) {
    console.warn("No classes found in database");
    return [];
  }

  const classEntries = Object.entries(classes)
    .sort(([, a], [, b]) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // The classes payload above already carries each Class's dateOffset, so
  // seed the cache with it before computing day indices - otherwise
  // getTodayDayIndex would trigger one redundant per-class Firebase read to
  // re-fetch a value already sitting in memory.
  primeDateOffsetCache(classes);

  // Calculate today's day index for each class in parallel
  console.log("Calculating day indices for", classEntries.length, "classes");
  const dayIndexResults = await Promise.all(classEntries.map(async ([classId]) => {
    try {
      const todayDayIndex = await getTodayDayIndex(classId);
      return { classId, todayDayIndex };
    } catch (error) {
      console.error(`Error getting day index for class ${classId}:`, error);
      return { classId, todayDayIndex: 0 };
    }
  }));

  // Batch fetch all of today's schedules at once
  const scheduleSnaps = await Promise.all(
    dayIndexResults.map(({ classId, todayDayIndex }) => get(ref(db, `schedule/${classId}/${todayDayIndex}`)))
  );

  return dayIndexResults.map(({ classId, todayDayIndex }, index) => ({
    classId,
    name: classes[classId].name,
    dayIndex: todayDayIndex,
    schedule: scheduleSnaps[index].val() || []
  }));
}

/**
 * Render the class list: a clickable link for a Class with Lessons today,
 * inactive text for one without. Replaces the container's existing content.
 * @param {HTMLElement} container
 * @param {Array<{classId: string, name: string, dayIndex: number, schedule: string[]}>} classesWithSchedule
 */
export function renderClassList(container, classesWithSchedule) {
  container.innerHTML = "";

  classesWithSchedule.forEach(({ classId, name, dayIndex, schedule }) => {
    if (Array.isArray(schedule) && schedule.length > 0) {
      const link = document.createElement("a");
      link.textContent = name;
      link.className = "class-link";
      link.href = `view.html?class=${classId}&day=${dayIndex}`;
      container.appendChild(link);
    } else {
      const item = document.createElement("div");
      item.textContent = `${name} - nothing today`;
      item.className = "class-link-inactive";
      container.appendChild(item);
    }
  });
}

/**
 * Fetch and render the class list into the given container, hiding the
 * loading state once data arrives.
 * @param {HTMLElement} container
 * @param {HTMLElement|null} loadingState
 */
export async function loadAndRenderClasses(container, loadingState) {
  const classesWithSchedule = await getClassesWithTodaySchedule();
  if (loadingState) {
    loadingState.style.display = "none";
  }
  renderClassList(container, classesWithSchedule);
}

/**
 * Load and render the class list, escalating the UI if it's taking unusually
 * long (e.g. a device still negotiating Wi-Fi on wake) rather than leaving
 * the skeleton showing indefinitely with no feedback.
 */
export async function loadWithErrorHandling() {
  const container = document.getElementById("class-list");
  const loadingState = document.getElementById("loading-state");

  try {
    await withConnectionTimeout(loadAndRenderClasses(container, loadingState), {
      onSlow: () => showSlowConnectionMessage(loadingState),
      onTimeout: () => showErrorState({
        container: 'class-list',
        loadingState: 'loading-state',
        title: 'Unable to load lessons',
        message: 'This is taking longer than expected. Check your Wi-Fi connection and try again.',
        withPadding: true
      }),
    });
  } catch (error) {
    console.error("Error loading classes:", error);

    showErrorState({
      container: 'class-list',
      loadingState: 'loading-state',
      title: 'Unable to load lessons',
      withPadding: true
    });
  }
}

// Only run automatically when actually loaded on a page with a #class-list
// element (i.e. index.html) - importing this module elsewhere (tests) never
// triggers real Firebase/DOM side effects on its own.
if (document.getElementById("class-list")) {
  loadWithErrorHandling();
}
