// public/view.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { initializeDateUtils, getTodayDayIndex } from './date-utils.js';

const app = initializeApp({ 
	databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

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
  
  // Render all pages
  pageIds.forEach(pageId => {
    const data = pageCache[pageId];
    renderContent(data);
  });
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

function renderContent(data) {
	if (!data) {
		contentEl.textContent = "Content not found.";
		return;
	}

	if(data.title){
		const title = document.createElement("h2");
		title.textContent = data.title;
		contentEl.appendChild(title);
	}

	data.blocks.forEach(block => {
		if (block.type === "question" && Array.isArray(block.content)) {
			block.content.forEach(item => {
				if (item.type === "text") {
					const p = document.createElement("p");
					// Process inline code formatting with backticks
					p.innerHTML = processInlineCode(item.value);
					contentEl.appendChild(p);
				}
				if (item.type === "code") {
					const pre = document.createElement("pre");
					pre.textContent = item.value;
					contentEl.appendChild(pre);
				}
			});
		}
	});
}

// Function to process inline code formatting with backticks
function processInlineCode(text) {
	// Escape HTML to prevent XSS, then process backticks
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
	
	// Replace backtick-enclosed text with <code> tags
	return escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
}

function loadPage() {
	for (let idx = 0; idx < pageIds.length; idx++) {
		const page = pageIds[idx];
		if (idx !== 0) {
			const hr = document.createElement("hr");
			contentEl.appendChild(hr);
		}
		const data = pageCache[page];
		renderContent(data);
	}
}

// Start the application
initializePage();
