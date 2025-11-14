// public/view.js
import { ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import { initializeDateUtils, getTodayDayIndex } from './date-utils.js';
import { renderContent, renderMultipleContent } from './content-renderer.js';

// Initialize date utilities with database
initializeDateUtils(db);

const params = new URLSearchParams(window.location.search);
const classId = params.get("class");
const dayFromUrl = params.get("day"); // Get day from URL if provided

let dayIndex;
let pageIds = [];
let pageCache = {};
const contentEl = document.getElementById("content");

// Initialize the page
async function initializePage() {
  if (dayFromUrl !== null) {
    // Use day index from URL (from landing page)
    dayIndex = parseInt(dayFromUrl);
    console.log("view.js using day index from URL: %s", dayIndex);
  } else {
    // Fallback: calculate today's day index for this class
    dayIndex = await getTodayDayIndex(classId);
    console.log("view.js calculated day index: %s", dayIndex);
  }
  
  // Load and display the content
  await loadContent();
}

async function loadContent() {
  // Fetch today's schedule for this class
  const scheduleSnap = await get(ref(db, `schedule/${classId}/${dayIndex}`));
  pageIds = scheduleSnap.val() || [];
  
  if (pageIds.length === 0) {
    contentEl.textContent = "No content for today.";
    return;
  }
  
  await cachePages();
  
  // Prepare all content data for rendering
  const contentData = pageIds.map(pageId => pageCache[pageId]).filter(data => data);
  
  // Render all content using the shared renderer
  renderMultipleContent(contentData, contentEl);
}

async function cachePages() {
	// Fetch all pages in parallel and cache them
	const fetches = pageIds.map(id => 
		get(ref(db, `content/${id}`)).then(snap => {
			pageCache[id] = snap.val();
		})
	);
	await Promise.all(fetches);
}

// Start the application
initializePage();
