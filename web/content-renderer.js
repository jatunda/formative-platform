// Shared content rendering module
// Used by both view.js and editor.js for consistent rendering

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

// Function to render parsed content data into a container element
function renderContent(data, containerEl) {
	if (!data) {
		containerEl.textContent = "Content not found.";
		return;
	}

	// Clear existing content
	containerEl.innerHTML = '';
	
	// Add lesson-content class to container for consistent styling
	containerEl.classList.add('lesson-content');

	if (data.title) {
		const title = document.createElement("h2");
		title.className = "lesson-title";
		title.textContent = data.title;
		containerEl.appendChild(title);
	}

	if (data.blocks && Array.isArray(data.blocks)) {
		data.blocks.forEach(block => {
			if (block.type === "question" && Array.isArray(block.content)) {
				block.content.forEach(item => {
					if (item.type === "text") {
						const p = document.createElement("p");
						p.className = "lesson-text";
						// Process inline code formatting with backticks
						p.innerHTML = processInlineCode(item.value);
						containerEl.appendChild(p);
					}
					if (item.type === "code") {
						const pre = document.createElement("pre");
						pre.className = "lesson-code";
						pre.textContent = item.value;
						containerEl.appendChild(pre);
					}
				});
			}
		});
	}
}

// Function to render multiple content items with separators
function renderMultipleContent(dataArray, containerEl) {
	// Clear existing content
	containerEl.innerHTML = '';
	
	// Add lesson-content class to container for consistent styling
	containerEl.classList.add('lesson-content');
	
	dataArray.forEach((data, idx) => {
		if (idx !== 0) {
			const hr = document.createElement("hr");
			hr.className = "lesson-separator";
			containerEl.appendChild(hr);
		}
		
		// Create a wrapper div for each content item
		const contentWrapper = document.createElement("div");
		renderContent(data, contentWrapper);
		
		// Move the rendered content directly to the main container
		while (contentWrapper.firstChild) {
			containerEl.appendChild(contentWrapper.firstChild);
		}
	});
}

// Export functions for ES modules
export {
	renderContent,
	renderMultipleContent,
	processInlineCode
};
