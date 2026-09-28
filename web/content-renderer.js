// Shared content rendering module
// Used by both view.js and editor.js for consistent rendering
import { CONTENT_NOT_FOUND } from './constants.js';
import { PAGE_LINK_PATTERN, parsePageLinkMatch } from './page-links.js';

/**
 * Turn heading text into a URL-safe id fragment for Section Link targets.
 * @private
 */
function slugifyHeadingText(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

/**
 * Normalize heading text for matching a Section Link against it - case and
 * whitespace shouldn't matter for `[[#Header Text]]` to find "Header Text".
 * @private
 */
function normalizeHeadingText(text) {
	return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Walk every heading in this content (including inside collapsibles) in
 * document order. Two things fall out of this, deliberately kept separate:
 * every heading occurrence gets its OWN unique DOM id (a GitHub-style -2/-3
 * suffix when the text repeats - two "## Notes" headings must not share one
 * id), while a Section Link like `[[#Notes]]` is inherently ambiguous
 * between them and always resolves to the FIRST occurrence only. Scoped to
 * one content object at a time (renderContent calls this per item), matching
 * Section Links being same-page only, never spanning multiple rendered
 * Lessons on one Schedule day.
 * @param {{blocks: Array}} data
 * @returns {{lookupByText: Map<string,string>, idsInOrder: string[]}}
 * @private
 */
function collectHeadingIds(data) {
	const lookupByText = new Map();
	const idsInOrder = [];
	const usedIds = new Set();

	function visitItems(items) {
		for (const item of items || []) {
			if (item.type === "text") {
				for (const line of item.value.split('\n')) {
					const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
					if (!headingMatch) continue;
					const headingText = headingMatch[2].trim();
					const normalized = normalizeHeadingText(headingText);

					const baseId = slugifyHeadingText(headingText);
					let id = baseId;
					let suffix = 2;
					while (usedIds.has(id)) {
						id = `${baseId}-${suffix}`;
						suffix++;
					}
					usedIds.add(id);
					idsInOrder.push(id);
					if (!lookupByText.has(normalized)) {
						lookupByText.set(normalized, id);
					}
				}
			} else if (item.type === "collapsible") {
				visitItems(item.content);
			}
		}
	}

	for (const block of (data && data.blocks) || []) {
		if (block.type === "question") {
			visitItems(block.content);
		}
	}

	return { lookupByText, idsInOrder };
}

/**
 * Process Page Links (`[[slug]]`/`[[slug|text]]`) and Section Links
 * (`[[#Header]]`/`[[#Header|text]]`). A Page Link always renders as a plain
 * link - no validation against the database at render time, by design (see
 * docs/adr/0007) - a stale slug just leads to the site's existing "Page not
 * found" page on click. A Section Link resolves against `headingIds` (free,
 * same-page, no DB needed) or renders as a Broken Link if nothing matches.
 * @param {string} text - Already HTML-escaped text
 * @param {Map<string, string>} headingIds - From collectHeadingIds
 * @private
 */
function processPageAndSectionLinks(text, headingIds) {
	return text.replace(PAGE_LINK_PATTERN, (fullMatch, slugGroup, headerGroup, displayGroup) => {
		const { slug, header, display } = parsePageLinkMatch(slugGroup, headerGroup, displayGroup);

		if (slug) {
			const label = display || slug;
			return `<a href="/p/${slug}" class="lesson-link">${label}</a>`;
		}

		if (header) {
			const label = display || header;
			const id = headingIds.get(normalizeHeadingText(header));
			if (id) {
				return `<a href="#${id}" class="lesson-link">${label}</a>`;
			}
			return `<span class="broken-link">${label}</span>`;
		}

		return fullMatch;
	});
}

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
function processInlineCode(text, headingIds = new Map()) {
	// Escape HTML to prevent XSS, then process backticks
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

	// Process in order: Page/Section Links, plain links, text formatting, then code
	const withPageLinks = processPageAndSectionLinks(escaped, headingIds);
	const withLinks = processMarkdownLinks(withPageLinks);
	const withFormatting = processTextFormatting(withLinks);

	// Replace backtick-enclosed text with <code> tags
	return withFormatting.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Render an array of content items (text, code, and collapsible sections)
 * into a container. This is the one implementation of block-content
 * rendering: renderContent calls it for a question block's top-level
 * content, and it calls itself for a collapsible section's nested content.
 * @param {Array<Object>} contentItems - Array of content items to render
 * @param {HTMLElement} containerEl - The container element to render into
 * @param {Map<string, string>} [headingIds] - lookupByText from collectHeadingIds, for resolving Section Links
 * @param {string[]} [headingIdQueue] - idsInOrder from collectHeadingIds, consumed one per heading rendered
 * @private
 */
function renderContentItems(contentItems, containerEl, headingIds = new Map(), headingIdQueue = []) {
	// Stack to track list hierarchy (separate from parent list stack)
	const listStack = [];
	let indentUnit = null;
	
	contentItems.forEach(item => {
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
					if (indentUnit === null) indentUnit = 'tab';
					return tabCount;
				}
				
				const spaceCount = indent.length;
				if (spaceCount === 0) return 0;
				
				if (indentUnit === null) {
					indentUnit = spaceCount;
					return 1;
				}
				
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
				while (listStack.length > depth + 1) {
					listStack.pop();
				}
				
				while (listStack.length <= depth) {
					listStack.push({ list: null, lastItem: null });
				}
				
				const entry = listStack[depth];
				let list = entry.list;
				
				const needsNewList = !list || list.tagName !== listType.toUpperCase();
				
				if (needsNewList) {
					list = document.createElement(listType);
					list.className = 'lesson-list';
					
					if (depth === 0) {
						containerEl.appendChild(list);
					} else {
						const parentEntry = listStack[depth - 1];
						if (parentEntry && parentEntry.lastItem) {
							parentEntry.lastItem.appendChild(list);
						} else {
							containerEl.appendChild(list);
						}
					}
					
					entry.list = list;
				}
				
				return list;
			}
			
			lines.forEach(line => {
				const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
				
				if (headingMatch) {
					listStack.length = 0;
					indentUnit = null;
					
					const level = headingMatch[1].length;
					const heading = document.createElement(`h${level}`);
					heading.className = `lesson-heading lesson-h${level}`;
					heading.innerHTML = processInlineCode(headingMatch[2], headingIds);
					const id = headingIdQueue.shift();
					if (id) heading.id = id;
					containerEl.appendChild(heading);
				} else {
					const ulMatch = line.match(/^(\s*)([*-])\s+(.+)$/);
					if (ulMatch) {
						const [, indent, marker, content] = ulMatch;
						const depth = calculateDepth(indent);
						const ul = getListAtDepth(depth, 'ul');
						
						const li = document.createElement('li');
						li.className = 'lesson-list-item';
						li.innerHTML = processInlineCode(content, headingIds);
						ul.appendChild(li);
						
						if (listStack[depth]) {
							listStack[depth].lastItem = li;
						}
					} else {
						const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
						if (olMatch) {
							const [, indent, number, content] = olMatch;
							const depth = calculateDepth(indent);
							const ol = getListAtDepth(depth, 'ol');
							
							const li = document.createElement('li');
							li.className = 'lesson-list-item';
							li.innerHTML = processInlineCode(content, headingIds);
							ol.appendChild(li);
							
							if (listStack[depth]) {
								listStack[depth].lastItem = li;
							}
						} else if (line.trim() !== '') {
							listStack.length = 0;
							indentUnit = null;
							
							const p = document.createElement("p");
							p.className = "lesson-text";
							p.innerHTML = processInlineCode(line, headingIds);
							containerEl.appendChild(p);
						}
					}
				}
			});
		} else if (item.type === "code") {
			const pre = document.createElement("pre");
			pre.className = "lesson-code";
			
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
			
			if (typeof Prism !== 'undefined') {
				Prism.highlightElement(code);
			}
		} else if (item.type === "collapsible") {
			// Reset list state, like headings do, before starting a nested section
			listStack.length = 0;
			indentUnit = null;

			const details = document.createElement("details");
			details.className = "lesson-collapsible";
			if (item.expanded) {
				details.setAttribute("open", "");
			}

			const summary = document.createElement("summary");
			summary.className = "lesson-collapsible-summary";
			if (!item.title || item.title.trim() === "") {
				summary.classList.add("lesson-collapsible-summary-empty");
			} else {
				summary.innerHTML = processInlineCode(item.title, headingIds);
			}

			const contentDiv = document.createElement("div");
			contentDiv.className = "collapsible-content";

			// Firebase RTDB silently drops empty arrays on write, so a
			// collapsible saved with no content of its own comes back with
			// `content` missing entirely, not `[]` - guard against that here
			// rather than crash when rendering it back.
			renderContentItems(item.content || [], contentDiv, headingIds, headingIdQueue);

			details.appendChild(summary);
			details.appendChild(contentDiv);
			containerEl.appendChild(details);
		}
	});
	
	// Trigger Prism.js highlighting for code blocks if available
	if (typeof Prism !== 'undefined') {
		Prism.highlightAllUnder(containerEl);
	}
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

	const { lookupByText, idsInOrder } = collectHeadingIds(data);

	if (data.blocks && Array.isArray(data.blocks)) {
		data.blocks.forEach((block, blockIndex) => {
			if (block.type === "question" && Array.isArray(block.content)) {
				// Add separator between questions, but not before the first one
				if (blockIndex > 0) {
					const hr = document.createElement("hr");
					hr.className = "lesson-separator";
					containerEl.appendChild(hr);
				}
				
				renderContentItems(block.content, containerEl, lookupByText, idsInOrder);
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
