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


const app = initializeApp({
	databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

const contentIdEl = document.getElementById("contentId");
const dslInput = document.getElementById("dslInput");
const parsedOutput = document.getElementById("parsedOutput");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");

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
  const id = contentIdEl.value.trim();
  if (!id) return alert("Enter a content ID.");
  loadContent(id);
};

saveBtn.onclick = async () => {
	const id = contentIdEl.value.trim();
	if (!id) return alert("Enter a content ID.");

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
  if (!selectedId) return;
  contentIdEl.value = selectedId;
  loadContent(selectedId);
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
    // Set the contentId input to the new hash
    contentIdEl.value = newHash;
    // Optionally, you can pre-fill the DSL input with a template
    dslInput.value = `title: New Lesson\nblocks:\n  - type: text\n    text: ""\n`;
    updatePreview();
    // Optionally, focus the title or DSL input
    dslInput.focus();
    // You can also store the dayIndex in a variable if needed for later use
    window._newLessonDayIndex = params.dayIndex;
  }
})();

(async function handleExistingPageContext() {
  const params = getQueryParams();
  if (params.page) {
    // Set the contentId input and select the option in the dropdown
    contentIdEl.value = params.page;
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
  }
})();