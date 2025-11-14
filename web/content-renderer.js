// Shared content rendering module
// Used by both view.js and editor.js for consistent rendering
import { CONTENT_NOT_FOUND } from './constants.js';

/**
 * Process text formatting (bold, italic, bold-italic) using markdown syntax
 * @param {string} text - The text to process
 * @returns {string} The HTML formatted text
 * @private
 */
function processTextFormatting(text) {
    return text
        // Bold-italic (must come before bold and italic)
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');
}

/**
 * Process markdown-style links: [text](url)
 * @param {string} text - The text to process
 * @returns {string} The HTML with links converted to anchor tags
 * @private
 */
function processMarkdownLinks(text) {
    // Match markdown links: [text](url)
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="lesson-link">$1</a>');
}

/**
 * Process inline code formatting with backticks, escaping HTML to prevent XSS
 * Processes text in order: HTML escape, links, text formatting, then code blocks
 * @param {string} text - The text to process
 * @returns {string} The HTML formatted text with code tags
 */
function processInlineCode(text) {
	// Escape HTML to prevent XSS, then process backticks
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
	
	// Process in order: links, text formatting, then code
	const withLinks = processMarkdownLinks(escaped);
	const withFormatting = processTextFormatting(withLinks);
	
	// Replace backtick-enclosed text with <code> tags
	return withFormatting.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Render parsed content data into a container element
 * Supports titles, text blocks, code blocks, headings, lists (ordered/unordered), and inline formatting
 * @param {Object} data - The parsed content data
 * @param {string} data.title - The lesson title
 * @param {Array<Object>} data.blocks - Array of question blocks
 * @param {HTMLElement} containerEl - The container element to render into
 */
function renderContent(data, containerEl) {
	if (!data) {
		containerEl.textContent = CONTENT_NOT_FOUND;
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
		data.blocks.forEach((block, blockIndex) => {
			if (block.type === "question" && Array.isArray(block.content)) {
				// Add separator between questions, but not before the first one
				if (blockIndex > 0) {
					const hr = document.createElement("hr");
					hr.className = "lesson-separator";
					containerEl.appendChild(hr);
				}
				
				block.content.forEach(item => {
					if (item.type === "text") {
						// Split text into lines to process each separately
						const lines = item.value.split('\n');
						
						lines.forEach(line => {
							// Check for heading pattern (1-6 #s followed by space)
							const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
							
							if (headingMatch) {
								// Create heading element (h1-h6 based on # count)
								const level = headingMatch[1].length;
								const heading = document.createElement(`h${level}`);
								heading.className = `lesson-heading lesson-h${level}`;
								heading.innerHTML = processInlineCode(headingMatch[2]);
								containerEl.appendChild(heading);
							} else if (line.match(/^[*-]\s+/)) {
								// Handle unordered list items
								let ul = containerEl.lastElementChild;
								if (!ul || ul.tagName !== 'UL') {
									ul = document.createElement('ul');
									ul.className = 'lesson-list';
									containerEl.appendChild(ul);
								}
								const li = document.createElement('li');
								li.className = 'lesson-list-item';
								li.innerHTML = processInlineCode(line.replace(/^[*-]\s+/, ''));
								ul.appendChild(li);
							} else if (line.match(/^\d+\.\s+/)) {
								// Handle ordered list items
								let ol = containerEl.lastElementChild;
								if (!ol || ol.tagName !== 'OL') {
									ol = document.createElement('ol');
									ol.className = 'lesson-list';
									containerEl.appendChild(ol);
								}
								const li = document.createElement('li');
								li.className = 'lesson-list-item';
								li.innerHTML = processInlineCode(line.replace(/^\d+\.\s+/, ''));
								ol.appendChild(li);
							} else if (line.trim() !== '') {
								// Create paragraph for non-heading text
								const p = document.createElement("p");
								p.className = "lesson-text";
								p.innerHTML = processInlineCode(line);
								containerEl.appendChild(p);
							}
						});
					}
					if (item.type === "code") {
						const pre = document.createElement("pre");
						pre.className = "lesson-code";
						
						// Add language class if specified
						if (item.language) {
							pre.classList.add(`language-${item.language}`);
							pre.setAttribute('data-language', item.language);
						}
						
						const code = document.createElement("code");
						if (item.language) {
							code.className = `language-${item.language}`;
						}
						code.textContent = item.value;
						
						pre.appendChild(code);
						containerEl.appendChild(pre);
						
						// Trigger Prism.js highlighting if available
						if (typeof Prism !== 'undefined') {
							Prism.highlightElement(code);
						}
					}
				});
			}
		});
	}
	
	// Trigger Prism.js highlighting for all code blocks if available
	if (typeof Prism !== 'undefined') {
		Prism.highlightAllUnder(containerEl);
	}
}

/**
 * Render multiple content items with separators between them
 * @param {Array<Object>} dataArray - Array of parsed content data objects
 * @param {HTMLElement} containerEl - The container element to render into
 */
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
	
	// Trigger Prism.js highlighting for all code blocks if available
	if (typeof Prism !== 'undefined') {
		Prism.highlightAllUnder(containerEl);
	}
}

// Export functions for ES modules
export {
	renderContent,
	renderMultipleContent,
	processInlineCode
};
