import {
	initializeApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
	getDatabase,
	ref,
	get,
	set,
	remove
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
const saveBtn = document.getElementById("saveBtn");
const duplicateBtn = document.getElementById("duplicateBtn");
const deleteBtn = document.getElementById("deleteBtn");
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

// Function to enable/disable the DSL input and save button
function setEditingEnabled(enabled) {
  dslInput.disabled = !enabled;
  saveBtn.disabled = !enabled;
  duplicateBtn.disabled = !enabled;
  deleteBtn.disabled = !enabled;
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
	
	// Get current timestamp
	const now = new Date();
	const timestamp = now.toLocaleString(); // This includes date and time down to seconds
	
	// Get the lesson title
	const lessonTitle = parsed.title || "(Untitled)";
	
	showNotification(`"${lessonTitle}" saved successfully at ${timestamp}`, "success");
};

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
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  notification.style.fontSize = '14px';
  notification.style.fontWeight = '500';
  
  if (type === 'success') {
    notification.style.backgroundColor = '#d4edda';
    notification.style.color = '#155724';
    notification.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f8d7da';
    notification.style.color = '#721c24';
    notification.style.border = '1px solid #f5c6cb';
  } else if (type === 'info') {
    notification.style.backgroundColor = '#d1ecf1';
    notification.style.color = '#0c5460';
    notification.style.border = '1px solid #bee5eb';
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

duplicateBtn.onclick = async () => {
	const currentId = contentIdEl.textContent.trim();
	if (!currentId || currentId === "(No content selected)") return alert("No content ID available.");

	// Check if current content is valid
	let parsed;
	try {
		parsed = parseDSL(dslInput.value);
		if (!parsed.title || !parsed.blocks) {
			alert("Cannot duplicate: Current content is malformed or empty.");
			return;
		}
	} catch (err) {
		alert("Cannot duplicate: Failed to parse current content.");
		return;
	}

	try {
		// Generate a new unique hash
		const newHash = await generateUniqueHash();
		
		// Create a copy with modified title to indicate it's a duplicate
		const duplicatedContent = { ...parsed };
		duplicatedContent.title = `${parsed.title} (Copy)`;
		
		// Save the duplicated content to Firebase
		await set(ref(db, `content/${newHash}`), duplicatedContent);
		
		// Update the editor to show the duplicated content
		contentIdEl.textContent = newHash;
		
		// Update the DSL input to reflect the new title
		const newDslText = generateDSLFromContent(duplicatedContent);
		dslInput.value = newDslText;
		updatePreview();
		
		// Clear dropdown selection since this is a new item
		existingContentSelect.value = "";
		
		// Reload the content list to include the new item
		await loadExistingContentList();
		
		// Try to select the new item in the dropdown
		for (let i = 0; i < existingContentSelect.options.length; i++) {
			if (existingContentSelect.options[i].value === newHash) {
				existingContentSelect.selectedIndex = i;
				break;
			}
		}
		
		alert(`Content duplicated successfully!\nNew ID: ${newHash}`);
	} catch (error) {
		console.error("Error duplicating content:", error);
		showNotification("Failed to duplicate content. Please try again.", "error");
	}
};

deleteBtn.onclick = async () => {
	const id = contentIdEl.textContent.trim();
	if (!id || id === "(No content selected)") return alert("No content ID available.");

	// Get the title from the current content
	let title = "(Untitled)";
	try {
		const parsed = parseDSL(dslInput.value);
		if (parsed && parsed.title) {
			title = parsed.title;
		}
	} catch (err) {
		// If parsing fails, try to get title from database
		try {
			const snap = await get(ref(db, `content/${id}/title`));
			if (snap.exists()) {
				title = snap.val();
			}
		} catch (dbErr) {
			// Keep default title if both methods fail
		}
	}

	// Show confirmation dialog with title
	const confirmed = confirm(`Are you sure you want to delete the lesson "${title}"?\n\nContent ID: ${id}\nThis action cannot be undone.`);
	if (!confirmed) return;

	try {
		// Delete the content from Firebase
		await remove(ref(db, `content/${id}`));
		
		// Clear the editor
		contentIdEl.textContent = "(No content selected)";
		dslInput.value = "";
		parsedOutput.textContent = "";
		
		// Clear the dropdown selection
		existingContentSelect.value = "";
		
		// Disable editing
		setEditingEnabled(false);
		
		// Reload the content list to remove the deleted item
		await loadExistingContentList();
		
		showNotification("Content deleted successfully!", "success");
	} catch (error) {
		console.error("Error deleting content:", error);
		showNotification("Failed to delete content. Please try again.", "error");
	}
};

async function loadExistingContentList() {
	// Clear existing options except the first one
	existingContentSelect.innerHTML = '<option value="">-- Select a lesson --</option>';
	
	const snap = await get(child(ref(db), "content"));
	if (!snap.exists()) return;

	const contentMap = snap.val();
	const sortedKeys = Object.keys(contentMap).sort();

	for (let id of sortedKeys) {
		const title = contentMap[id]?.title || "(untitled)";
		const option = document.createElement("option");
		option.value = id;
		option.textContent = title;
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