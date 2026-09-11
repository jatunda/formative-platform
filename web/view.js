// public/view.js
import { ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import { initializeDateUtils, getTodayDayIndex } from './date-utils.js';
import { renderContent, renderMultipleContent } from './content-renderer.js';
import { NO_CONTENT_FOR_TODAY } from './constants.js';

// Initialize date utilities with database
initializeDateUtils(db);

/**
 * Decide which Day Index to show: the one the landing page passed via the
 * URL, or today's Day Index for this Class if none was passed.
 * @param {string|null} classId
 * @param {string|null} dayFromUrl
 * @returns {Promise<number>}
 */
export async function resolveDayIndex(classId, dayFromUrl) {
  if (dayFromUrl !== null) {
    return parseInt(dayFromUrl);
  }
  return await getTodayDayIndex(classId);
}

/**
 * Fetch a set of Lessons' content in parallel, keyed by Lesson id.
 * @param {string[]} pageIds
 * @returns {Promise<Object>}
 */
export async function fetchPages(pageIds) {
  const cache = {};
  await Promise.all(pageIds.map(async (id) => {
    const snap = await get(ref(db, `content/${id}`));
    cache[id] = snap.val();
  }));
  return cache;
}

/**
 * Load a Class's Schedule for a given Day Index and render it into a
 * container, or show NO_CONTENT_FOR_TODAY if the day has no Lessons.
 * @param {string} classId
 * @param {number} dayIndex
 * @param {HTMLElement} contentEl
 */
export async function loadContent(classId, dayIndex, contentEl) {
  const scheduleSnap = await get(ref(db, `schedule/${classId}/${dayIndex}`));
  const pageIds = scheduleSnap.val() || [];

  if (pageIds.length === 0) {
    contentEl.textContent = NO_CONTENT_FOR_TODAY;
    return;
  }

  const pageCache = await fetchPages(pageIds);
  const contentData = pageIds.map(pageId => pageCache[pageId]).filter(data => data);
  renderMultipleContent(contentData, contentEl);
}

/**
 * Read the page's own URL/DOM state and load the right content into it.
 */
export async function initializePage() {
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("class");
  const dayFromUrl = params.get("day");
  const contentEl = document.getElementById("content");

  const dayIndex = await resolveDayIndex(classId, dayFromUrl);
  console.log("view.js using day index: %s", dayIndex);

  await loadContent(classId, dayIndex, contentEl);
}

// Only run automatically when actually loaded on a page with a #content
// element (i.e. view.html) - importing this module elsewhere (tests) never
// triggers real Firebase/DOM side effects on its own.
if (document.getElementById("content")) {
  initializePage();
}
