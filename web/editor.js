// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import {
	ref,
	get,
	set,
	remove,
	child
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import {
	parseDSL,
	generateDSLFromContent
} from "./dsl.js";
import {
	validateDSL,
	getErrorExplanation
} from "./dsl-validation.js";
import {
	initializeLessonSearch,
	showLessonSearchPopup
} from "./lesson-search.js";
import {
	renderContent
} from "./content-renderer.js";
import {
	AIQuestionGenerator
} from "./ai-generator.js";

// Handle AI generation
async function handleAIGeneration(event) {
  event.preventDefault();
  
  const classId = document.getElementById('aiClassSelect').value;
  const objectives = document.getElementById('learningObjectives').value;
  
  if (!classId || !objectives) {
    alert('Please select a class and enter learning objectives');
    return;
  }
  
  try {
    // Show loading state
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    
    // Generate content
    const content = await generateFormativeQuestions(classId, objectives);
    
    // Update editor
    document.getElementById('dslInput').value = content;
    
    // Trigger preview update
    document.getElementById('dslInput').dispatchEvent(new Event('input'));
    
    // Close modal
    closeModal();
  } catch (error) {
    console.error('Error generating questions:', error);
    alert('Error generating questions: ' + error.message);
  } finally {
    // Reset button state
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
  }
}
import {
	AI_CONFIG,
	validateConfig
} from "./ai-config.js";
import { NO_CONTENT_SELECTED, UNTITLED_LESSON, UNTITLED_LESSON_LOWERCASE, CONTENT_NOT_FOUND } from './constants.js';
import { showNotification } from './notification-utils.js';


// Database is imported from centralized firebase-config.js

// Check authentication before proceeding
(async () => {
  const isAuthenticated = await window.teacherAuth.requireAuth();
  if (!isAuthenticated) {
    return; // Stop execution if not authenticated
  }
  
  // Setup activity listeners for session management
  window.teacherAuth.setupActivityListeners();
  
  // Continue with normal editor.js execution
  main();
})();

async function main() {

// Initialize the lesson search module with database reference
initializeLessonSearch(db);

// Update back to schedule link to preserve class selection
const urlParams = new URLSearchParams(window.location.search);
const classParam = urlParams.get('fromClass');
if (classParam) {
    const backLink = document.getElementById('backToScheduleLink');
    if (backLink) {
        backLink.href = `teacher.html?class=${classParam}`;
    }
}

// Initialize AI Question Generator
try {
  validateConfig();
  const aiGenerator = new AIQuestionGenerator(db, AI_CONFIG.OPENAI_API_KEY);
} catch (error) {
  console.warn('AI Generator not available:', error.message);
  // Disable the AI button if configuration is missing
  const aiBtn = document.getElementById('generateAIBtn');
  if (aiBtn) {
    aiBtn.disabled = true;
    aiBtn.title = 'AI Generation requires OpenAI API key configuration';
    aiBtn.textContent = '🤖 Generate Questions (Not Configured)';
  }
}

const contentIdEl = document.getElementById("contentId");
const dslInput = document.getElementById("dslInput");
const preview = document.getElementById("preview");
const saveBtn = document.getElementById("saveBtn");
const duplicateBtn = document.getElementById("duplicateBtn");
const deleteBtn = document.getElementById("deleteBtn");
const searchLessonBtn = document.getElementById("searchLessonBtn");

// Content ID is now a div, no need for readOnly property

dslInput.addEventListener("input", updatePreview);

// Handle Tab key in DSL input to insert 4 spaces instead of changing focus
dslInput.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault(); // Prevent default tab behavior
    
    const start = dslInput.selectionStart;
    const end = dslInput.selectionEnd;
    const value = dslInput.value;
    
    // Insert 4 spaces at cursor position
    const newValue = value.substring(0, start) + "    " + value.substring(end);
    dslInput.value = newValue;
    
    // Move cursor to after the inserted spaces
    dslInput.selectionStart = dslInput.selectionEnd = start + 4;
    
    // Trigger input event to update preview
    dslInput.dispatchEvent(new Event('input'));
  }
  
  // Handle smart backspace for indentation
  if (event.key === "Backspace") {
    const start = dslInput.selectionStart;
    const end = dslInput.selectionEnd;
    const value = dslInput.value;
    
    // Only do smart backspace if nothing is selected
    if (start === end && start > 0) {
      // Find the start of the current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineBeforeCursor = value.substring(lineStart, start);
      
      // Check if we're at the beginning of the line's text (only spaces before cursor)
      if (/^ +$/.test(lineBeforeCursor) && lineBeforeCursor.length >= 4) {
        event.preventDefault();
        
        // Calculate how many spaces to delete to reach the next multiple of 4
        const spacesToDelete = lineBeforeCursor.length % 4 || 4;
        
        // Delete the spaces
        const newValue = value.substring(0, start - spacesToDelete) + value.substring(start);
        dslInput.value = newValue;
        
        // Move cursor back
        dslInput.selectionStart = dslInput.selectionEnd = start - spacesToDelete;
        
        // Trigger input event to update preview
        dslInput.dispatchEvent(new Event('input'));
      }
    }
  }
  
  // Handle auto-indentation on Enter
  if (event.key === "Enter") {
    const start = dslInput.selectionStart;
    const end = dslInput.selectionEnd;
    const value = dslInput.value;
    
    // Only do auto-indent if nothing is selected
    if (start === end) {
      // Find the start of the current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      
      // Extract the leading whitespace from the current line
      const indentMatch = currentLine.match(/^( *)/);
      const indent = indentMatch ? indentMatch[1] : '';
      
      if (indent.length > 0) {
        event.preventDefault();
        
        // Insert newline followed by the same indentation
        const newValue = value.substring(0, start) + '\n' + indent + value.substring(end);
        dslInput.value = newValue;
        
        // Move cursor to after the inserted indentation
        dslInput.selectionStart = dslInput.selectionEnd = start + 1 + indent.length;
        
        // Trigger input event to update preview
        dslInput.dispatchEvent(new Event('input'));
      }
    }
  }
});

const existingContentSelect = document.getElementById("existingContent");

// Add keyboard shortcut for save (Ctrl+S on Windows, Cmd+S on Mac)
document.addEventListener("keydown", (event) => {
  // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault(); // Prevent browser's default save dialog
    
    // Only trigger save if editing is enabled (content is loaded)
    if (!saveBtn.disabled) {
      saveBtn.click(); // Trigger the existing save functionality
    }
  }
});

function updatePreview() {
	const dslText = dslInput.value;
	
	try {
		const parsed = parseDSL(dslText);
		
		// Validate the parsed content
		const validationError = validateDSL(dslText, parsed);
		
		if (validationError) {
			// Create an error object for consistent error display
			const error = new Error(validationError);
			preview.innerHTML = getErrorExplanation(error, dslText);
		} else {
			// Use the shared content renderer for valid content
			renderContent(parsed, preview);
		}
	} catch (err) {
		preview.innerHTML = getErrorExplanation(err, dslText);
	}
}

// Function to enable/disable the DSL input and save button
// Make setEditingEnabled available globally
window.setEditingEnabled = function(enabled) {
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
	if (!id || id === NO_CONTENT_SELECTED) return alert("No content ID available.");

	const parsed = parseDSL(dslInput.value);
	if (!parsed.title || !parsed.blocks) return alert("Parsing failed or content is malformed.");

	await set(ref(db, `content/${id}`), parsed);
	
	// Get current timestamp
	const now = new Date();
	const timestamp = now.toLocaleString(); // This includes date and time down to seconds
	
	// Get the lesson title
	const lessonTitle = parsed.title || UNTITLED_LESSON;
	
	showNotification(`"${lessonTitle}" saved successfully at ${timestamp}`, "success");
};


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
	if (!id || id === NO_CONTENT_SELECTED) return alert("No content ID available.");

	// Get the title from the current content
	let title = UNTITLED_LESSON;
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
		contentIdEl.textContent = NO_CONTENT_SELECTED;
		dslInput.value = "";
		preview.innerHTML = "";
		
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

async function loadExistingContentList(selectLessonId = null) {
	// Clear existing options except the first one
	existingContentSelect.innerHTML = '<option value="">-- Select a lesson --</option>';
	
	const snap = await get(child(ref(db), "content"));
	if (!snap.exists()) return;

	const contentMap = snap.val();
	const sortedKeys = Object.keys(contentMap).sort();

	for (let id of sortedKeys) {
		const title = contentMap[id]?.title || UNTITLED_LESSON_LOWERCASE;
		const option = document.createElement("option");
		option.value = id;
		option.textContent = title;
		existingContentSelect.appendChild(option);
	}
	
	// If a specific lesson ID was provided, select it in the dropdown
	if (selectLessonId) {
		for (let i = 0; i < existingContentSelect.options.length; i++) {
			if (existingContentSelect.options[i].value === selectLessonId) {
				existingContentSelect.selectedIndex = i;
				break;
			}
		}
	}
}

// Check for URL parameters first to see if we need to select a specific lesson
const params = getQueryParams();
const initialLessonId = params.page || null;

// Load the content list and potentially select a specific lesson
loadExistingContentList(initialLessonId);

existingContentSelect.onchange = async () => {
  const selectedId = existingContentSelect.value;
  if (!selectedId) {
    // If nothing is selected, disable editing
    contentIdEl.textContent = NO_CONTENT_SELECTED;
    dslInput.value = "";
    preview.innerHTML = "";
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
    alert(CONTENT_NOT_FOUND);
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
    // Set the contentId display (dropdown selection is handled by loadExistingContentList)
    contentIdEl.textContent = params.page;
    // Load the content into the editor
    await loadContent(params.page);
  } else {
    // No content ID provided, disable editing until something is selected
    setEditingEnabled(false);
  }
})();

} // End of main function