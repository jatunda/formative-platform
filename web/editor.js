// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

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
import {
	renderContent
} from "./content-renderer.js";


const app = initializeApp({
	databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

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

// Function to provide detailed error explanations
function getErrorExplanation(error, dslText) {
	const errorMessage = error.message || error.toString();
	
	// Common DSL formatting issues and their explanations
	const explanations = {
		'title': {
			issue: 'Missing or invalid title',
			solution: 'Start your content with a title line beginning with "# " (hash and space)',
			example: '# My Lesson Title'
		},
		'separator': {
			issue: 'Question separator format',
			solution: 'Use exactly three dashes "---" on their own line to separate questions',
			example: '---'
		},
		'code': {
			issue: 'Unmatched code block markers',
			solution: 'Each code block must start and end with exactly three backticks. Language specification is optional on opening block only.',
			example: 'Plain code:\n```\nconsole.log("Hello");\n```\n\nWith language:\n```javascript\nconsole.log("Hello");\n```'
		},
		'empty': {
			issue: 'Empty or invalid content',
			solution: 'Make sure you have a title and at least one question with content',
			example: '# Title\n\nSome content here...'
		},
		'structure': {
			issue: 'Invalid content structure',
			solution: 'Content should have a title, followed by text or code blocks, separated by "---" for multiple questions',
			example: '# Title\n\nText content\n\n```\ncode here\n```\n\n---\n\nNext question'
		}
	};
	
	// Try to detect the specific issue by analyzing the DSL content
	let detectedIssue = null;
	
	if (!dslText.trim()) {
		detectedIssue = explanations.empty;
	} else if (!dslText.includes('# ') || errorMessage.includes('Missing title')) {
		detectedIssue = explanations.title;
	} else if (dslText.includes('```')) {
		// Check for unmatched code blocks and invalid language specifications
		const lines = dslText.split('\n');
		const codeBlockMarkers = lines.filter(line => 
			line.trim() === '```' || line.trim().match(/^```\s*\w+$/)
		);
		const invalidCodeMarkers = lines.filter(line => 
			line.trim().startsWith('```') && 
			line.trim() !== '```' && 
			!line.trim().match(/^```\s*\w+$/)
		);
		
		// Check for language specifications on closing code blocks
		const linesWithNumbers = lines.map((line, index) => ({line: line.trim(), number: index + 1}));
		let inCodeBlock = false;
		const invalidClosingLanguages = [];
		
		for (const {line, number} of linesWithNumbers) {
			if (line === '```' || line.match(/^```\s*\w+$/)) {
				if (inCodeBlock) {
					// This is a closing block - check if it has language specification
					if (line.match(/^```\s*\w+$/)) {
						invalidClosingLanguages.push(number);
					}
					inCodeBlock = false;
				} else {
					// This is an opening block
					inCodeBlock = true;
				}
			}
		}
		
		if (codeBlockMarkers.length % 2 !== 0) {
			detectedIssue = explanations.code;
		} else if (invalidClosingLanguages.length > 0) {
			detectedIssue = {
				issue: 'Language specification on closing code block',
				solution: 'Language can only be specified on the opening ``` line, not the closing one',
				example: `Correct:\n\`\`\`java\nSystem.out.println("Hello");\n\`\`\`\n\nIncorrect:\n\`\`\`java\nSystem.out.println("Hello");\n\`\`\`java`
			};
		} else if (invalidCodeMarkers.length > 0) {
			// Special case: code blocks with invalid format
			detectedIssue = {
				issue: 'Invalid code block format',
				solution: 'Code block language can be specified as "```language" or "``` language"',
				example: 'Correct:\n```java\nSystem.out.println("Hello");\n```\n\nAlso correct:\n``` python\nprint("Hello")\n```'
			};
		}
	} else if (dslText.includes('---')) {
		// Check for separator issues (like spaces around dashes)
		const lines = dslText.split('\n');
		const invalidSeparators = lines.filter(line => 
			line.trim().includes('-') && 
			line.trim() !== '---' && 
			line.trim().match(/^-+$/)
		);
		if (invalidSeparators.length > 0) {
			detectedIssue = explanations.separator;
		}
	} else if (errorMessage.includes('empty') || errorMessage.includes('No content')) {
		detectedIssue = explanations.structure;
	}
	
	// If no specific issue detected but there's still an error, use general structure advice
	if (!detectedIssue) {
		detectedIssue = explanations.structure;
	}
	
	// Build the error display
	let errorHtml = `
		<div class="error-container">
			<h3 class="error-title">⚠️ Parsing Error</h3>
			<p class="error-message"><strong>Error:</strong> ${errorMessage}</p>
			<div class="error-explanation">
				<p><strong>Likely Issue:</strong> ${detectedIssue.issue}</p>
				<p><strong>Solution:</strong> ${detectedIssue.solution}</p>
				<div class="error-example">
					<strong>Example:</strong>
					<pre><code>${detectedIssue.example}</code></pre>
				</div>
			</div>
			<div class="error-help">
				<p><strong>DSL Format Reminder:</strong></p>
				<ul>
					<li>Start with a title: <code># Your Title</code></li>
					<li>Write content as regular text</li>
					<li>Use inline code: <code>\`code\`</code></li>
					<li>Use code blocks: <code>\`\`\`</code> on separate lines</li>
					<li>Separate questions with: <code>---</code> on its own line</li>
				</ul>
			</div>
		</div>
	`;
	
	return errorHtml;
}

function updatePreview() {
	const dslText = dslInput.value;
	
	try {
		const parsed = parseDSL(dslText);
		
		// Check if the parsed result is valid and complete
		if (!parsed || typeof parsed !== 'object') {
			throw new Error('Parser returned invalid data');
		}
		
		// Check for common issues even if parsing didn't throw an error
		let validationError = null;
		
		if (!dslText.trim()) {
			validationError = 'Content is empty';
		} else if (!parsed.title || parsed.title.trim() === '') {
			validationError = 'Missing title - content should start with "# Title"';
		} else if (!parsed.blocks || parsed.blocks.length === 0) {
			validationError = 'No content blocks found - add some text or questions after the title';
		} else {
			// Check for unmatched code blocks with language support
			const lines = dslText.split('\n');
			const codeBlockMarkers = lines.filter(line => 
				line.trim() === '```' || line.trim().match(/^```\s*\w+$/)
			);
			if (codeBlockMarkers.length % 2 !== 0) {
				validationError = 'Unmatched code block - every ``` opening must have a closing ```';
			} else {
				// Check if blocks have content
				const hasContent = parsed.blocks.some(block => 
					block.content && block.content.length > 0
				);
				if (!hasContent) {
					validationError = 'Content blocks are empty - add text or code to your questions';
				}
			}
		}
		
		if (validationError) {
			// Create a fake error object for consistent error display
			const fakeError = new Error(validationError);
			preview.innerHTML = getErrorExplanation(fakeError, dslText);
		} else {
			// Use the shared content renderer for valid content
			renderContent(parsed, preview);
		}
	} catch (err) {
		preview.innerHTML = getErrorExplanation(err, dslText);
	}
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
		const title = contentMap[id]?.title || "(untitled)";
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
    contentIdEl.textContent = "(No content selected)";
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