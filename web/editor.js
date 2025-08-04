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
	child
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import {
	parseDSL,
	generateDSLFromContent
} from "./dsl.js";
import {
	initializeLessonSearch,
	showLessonSearchPopup
} from "./lesson-search.js";


const app = initializeApp({
	databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

// Initialize the lesson search module with database reference
initializeLessonSearch(db);

const contentIdEl = document.getElementById("contentId");
const dslInput = document.getElementById("dslInput");
const parsedOutput = document.getElementById("parsedOutput");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const searchLessonBtn = document.getElementById("searchLessonBtn");

// Content ID is now a div, no need for readOnly property

dslInput.addEventListener("input", updatePreview);
const existingContentSelect = document.getElementById("existingContent");


function updatePreview() {
	const dslText = dslInput.value;
	let parsed;
	try {
		parsed = parseDSL(dslText);
		parsedOutput.textContent = JSON.stringify(parsed, null, 2);
	} catch (err) {
		parsedOutput.textContent = "Error parsing DSL: " + err.message;
	}
	parsedOutput.textContent = JSON.stringify(parsed, null, 2);
}

loadBtn.onclick = async () => {
  const id = contentIdEl.textContent.trim();
  if (!id || id === "(No content selected)") return alert("No content ID available.");
  loadContent(id);
};

// Function to enable/disable the DSL input and save button
function setEditingEnabled(enabled) {
  dslInput.disabled = !enabled;
  saveBtn.disabled = !enabled;
  if (!enabled) {
    dslInput.placeholder = "Select a file from the dropdown or use a URL parameter to edit content";
  } else {
    dslInput.placeholder = "";
  }
}

// Search lesson button functionality
searchLessonBtn.onclick = () => {
  showLessonSearchPopup({
    onSelect: async (lessonId) => {
      // Set the selected lesson in the dropdown if it exists
      for (let i = 0; i < existingContentSelect.options.length; i++) {
        if (existingContentSelect.options[i].value === lessonId) {
          existingContentSelect.selectedIndex = i;
          break;
        }
      }
      
      // Update the content ID display
      contentIdEl.textContent = lessonId;
      
      // Load the content
      await loadContent(lessonId);
      setEditingEnabled(true);
    }
  });
};

saveBtn.onclick = async () => {
	const id = contentIdEl.textContent.trim();
	if (!id || id === "(No content selected)") return alert("No content ID available.");

	const parsed = parseDSL(dslInput.value);
	if (!parsed.title || !parsed.blocks) return alert("Parsing failed or content is malformed.");

	await set(ref(db, `content/${id}`), parsed);
	alert("Saved to Firebase!");
};

async function loadExistingContentList() {
	const snap = await get(child(ref(db), "content"));
	if (!snap.exists()) return;

	const contentMap = snap.val();
	const sortedKeys = Object.keys(contentMap).sort();

	for (let id of sortedKeys) {
		const title = contentMap[id]?.title || "(untitled)";
		const option = document.createElement("option");
		option.value = id;
		option.textContent = `${id} — ${title}`;
		existingContentSelect.appendChild(option);
	}
}

loadExistingContentList();

existingContentSelect.onchange = async () => {
  const selectedId = existingContentSelect.value;
  if (!selectedId) {
    // If nothing is selected, disable editing
    contentIdEl.textContent = "(No content selected)";
    dslInput.value = "";
    parsedOutput.textContent = "";
    setEditingEnabled(false);
    return;
  }
  contentIdEl.textContent = selectedId;
  await loadContent(selectedId);
  setEditingEnabled(true);
};

async function loadContent(id) {
  const snap = await get(ref(db, `content/${id}`));
  if (!snap.exists()) {
    alert("No content found.");
    return;
  }

  const data = snap.val();
  const dslText = generateDSLFromContent(data);
  dslInput.value = dslText;
  updatePreview();
  setEditingEnabled(true);
}

function getQueryParams() {
  const params = {};
  window.location.search.substring(1).split("&").forEach(pair => {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return params;
}

async function generateUniqueHash() {
  // Use crypto API for random hash
  let hash;
  let exists = true;
  while (exists) {
    hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const snap = await get(ref(db, `content/${hash}`));
    exists = snap.exists();
  }
  return hash;
}

(async function handleNewLessonContext() {
  const params = getQueryParams();
  if (params.new === "1") {
    // Generate a new unique hash
    const newHash = await generateUniqueHash();
    // Set the contentId display to the new hash
    contentIdEl.textContent = newHash;
    // Optionally, you can pre-fill the DSL input with a template
    dslInput.value = `title: New Lesson\nblocks:\n  - type: text\n    text: ""\n`;
    updatePreview();
    // Optionally, focus the title or DSL input
    dslInput.focus();
    // You can also store the dayIndex in a variable if needed for later use
    window._newLessonDayIndex = params.dayIndex;
    // Enable editing for new lessons
    setEditingEnabled(true);
  }
})();

(async function handleExistingPageContext() {
  const params = getQueryParams();
  if (params.page) {
    // Set the contentId display and select the option in the dropdown
    contentIdEl.textContent = params.page;
    // If the dropdown is already populated, select the correct option
    if (existingContentSelect) {
      for (let i = 0; i < existingContentSelect.options.length; i++) {
        if (existingContentSelect.options[i].value === params.page) {
          existingContentSelect.selectedIndex = i;
          break;
        }
      }
    }
    // Load the content into the editor
    await loadContent(params.page);
  } else {
    // No content ID provided, disable editing until something is selected
    setEditingEnabled(false);
  }
})();