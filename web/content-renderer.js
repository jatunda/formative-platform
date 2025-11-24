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
				
				// Stack to track list hierarchy across all text items in this block
				// Moved outside item loop so list state persists across separate text items
				const listStack = [];
				let indentUnit = null; // Will be detected from first nested item (2-5 spaces or 1 tab)
				
				block.content.forEach(item => {
					if (item.type === "text") {
						// Split text into lines to process each separately
						const lines = item.value.split('\n');
						
						/**
						 * Calculate nesting depth from indentation
						 * @param {string} indent - The leading whitespace
						 * @returns {number} The nesting depth (0 = top level)
						 */
						function calculateDepth(indent) {
							if (!indent) return 0;
							
							// Check for tabs first
							const tabCount = (indent.match(/\t/g) || []).length;
							if (tabCount > 0) {
								// If tabs are used, 1 tab = 1 level
								if (indentUnit === null) indentUnit = 'tab';
								return tabCount;
							}
							
							// Count spaces
							const spaceCount = indent.length;
							if (spaceCount === 0) return 0;
							
							// Detect indentation unit from first nested item
							if (indentUnit === null) {
								// For first nested item, detect unit size (2-5 spaces)
								// Use the actual space count as the unit
								indentUnit = spaceCount;
								return 1;
							}
							
							// Use detected unit to calculate depth
							if (typeof indentUnit === 'number') {
								return Math.floor(spaceCount / indentUnit);
							}
							
							return 0;
						}
						
						/**
						 * Get or create the appropriate list at the given depth
						 * @param {number} depth - The nesting depth
						 * @param {string} listType - 'ul' or 'ol'
						 * @returns {HTMLElement} The list element at that depth
						 */
						function getListAtDepth(depth, listType) {
							// If we're going shallower, pop deeper levels (only if we have more than depth+1 entries)
							while (listStack.length > depth + 1) {
								listStack.pop();
							}
							
							// Ensure stack has entries up to this depth
							while (listStack.length <= depth) {
								listStack.push({ list: null, lastItem: null });
							}
							
							// Get or create list at this depth
							const entry = listStack[depth];
							let list = entry.list;
							
							// Check if we need to create a new list
							// We need a new list if:
							// 1. No list exists at this depth, OR
							// 2. The existing list is a different type (ul vs ol)
							const needsNewList = !list || list.tagName !== listType.toUpperCase();
							
							if (needsNewList) {
								// Need to create a new list
								list = document.createElement(listType);
								list.className = 'lesson-list';
								
								if (depth === 0) {
									// Top-level list: append to container
									containerEl.appendChild(list);
								} else {
									// Nested list: append to parent list item
									const parentEntry = listStack[depth - 1];
									if (parentEntry && parentEntry.lastItem) {
										// Append nested list to the last item of parent list
										parentEntry.lastItem.appendChild(list);
									} else {
										// This shouldn't happen in normal flow, but if it does,
										// we need to find the most recent item at the parent depth
										// and append to it, or create a new top-level list
										if (parentEntry && parentEntry.list) {
											// If parent list exists but no lastItem, append to container
											// (this handles edge cases)
											containerEl.appendChild(list);
										} else {
											// No parent entry at all - treat as top-level
											containerEl.appendChild(list);
										}
									}
								}
								
								// Store the list in the stack
								entry.list = list;
							}
							
							return list;
						}
						
						lines.forEach(line => {
							// Check for heading pattern (1-6 #s followed by space)
							const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
							
							if (headingMatch) {
								// Reset list state when encountering non-list content
								listStack.length = 0;
								indentUnit = null;
								
								// Create heading element (h1-h6 based on # count)
								const level = headingMatch[1].length;
								const heading = document.createElement(`h${level}`);
								heading.className = `lesson-heading lesson-h${level}`;
								heading.innerHTML = processInlineCode(headingMatch[2]);
								containerEl.appendChild(heading);
							} else {
								// Check for unordered list item with indentation
								const ulMatch = line.match(/^(\s*)([*-])\s+(.+)$/);
								if (ulMatch) {
									const [, indent, marker, content] = ulMatch;
									const depth = calculateDepth(indent);
									const ul = getListAtDepth(depth, 'ul');
									
									const li = document.createElement('li');
									li.className = 'lesson-list-item';
									li.innerHTML = processInlineCode(content);
									ul.appendChild(li);
									
									// Track last item for potential nesting
									if (listStack[depth]) {
										listStack[depth].lastItem = li;
									}
								} else {
									// Check for ordered list item with indentation
									const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
									if (olMatch) {
										const [, indent, number, content] = olMatch;
										const depth = calculateDepth(indent);
										const ol = getListAtDepth(depth, 'ol');
										
										const li = document.createElement('li');
										li.className = 'lesson-list-item';
										li.innerHTML = processInlineCode(content);
										ol.appendChild(li);
										
										// Track last item for potential nesting
										if (listStack[depth]) {
											listStack[depth].lastItem = li;
										}
									} else if (line.trim() !== '') {
										// Reset list state when encountering non-list content
										listStack.length = 0;
										indentUnit = null;
										
										// Create paragraph for non-heading text
										const p = document.createElement("p");
										p.className = "lesson-text";
										p.innerHTML = processInlineCode(line);
										containerEl.appendChild(p);
									}
								}
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
