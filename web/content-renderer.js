/* global Prism -- loaded from a CDN <script> on the pages that render code blocks */
// Shared content rendering module
// Used by both view.js and editor.js for consistent rendering
import { CONTENT_NOT_FOUND } from './constants.js';
import { PAGE_LINK_PATTERN, parsePageLinkMatch } from './page-links.js';
import { QUESTION_LINK_PATTERN, parseQuestionLinkMatch } from './question-links.js';

/**
 * A blockquote line: `> text`. A line starting `>>>` is a collapsible marker
 * (parseDSL takes those before they reach a text item), so it never starts a
 * quote, and one inside a quote (`> >>> x`) stays literal text.
 */
const QUOTE_LINE_PATTERN = /^\s*>(?!>>) ?(.*)$/;

/** Every leading quote marker on a line, nested ones (`>> `) included. */
const QUOTE_PREFIX_PATTERN = /^(\s*>(?!>>) ?)+/;

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
					// Headings inside quotes render too, so look past the `>`s.
					const headingMatch = line.replace(QUOTE_PREFIX_PATTERN, '').match(/^(#{1,6})\s+(.+)$/);
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
 * A spoiler: `||hidden text||`. Runs after links and formatting, so they
 * work inside it; inline code is already set aside, so `||x||` inside
 * backticks stays literal. Like Markdown emphasis, the hidden text can't
 * start or end with whitespace, so `a || b || c` in prose stays as typed
 * while `||x y||` is still a spoiler.
 */
const SPOILER_PATTERN = /\|\|(?!\s)(.+?)(?<!\s)\|\|/g;

/** Opening tag of a spoiler span; installSpoilerToggle reveals it on tap. */
const SPOILER_OPEN_TAG = '<span class="spoiler" tabindex="0" role="button" aria-expanded="false">';

/** Documents that already have the spoiler toggle listeners. */
const spoilerToggleDocuments = new WeakSet();

/**
 * Flip a spoiler between hidden and revealed.
 * @param {Element} spoiler
 */
function toggleSpoiler(spoiler) {
	const revealed = spoiler.classList.toggle('spoiler-revealed');
	spoiler.setAttribute('aria-expanded', String(revealed));
}

/**
 * Let a tap, click, Enter or Space toggle any spoiler in the document. One
 * delegated listener covers every renderer and every re-render (the editor
 * preview re-renders on each keystroke). Hover and keyboard focus reveal
 * through CSS alone (style.css). Safe to call more than once per document.
 * @param {Document} doc
 */
function installSpoilerToggle(doc) {
	if (spoilerToggleDocuments.has(doc)) return;
	spoilerToggleDocuments.add(doc);

	doc.addEventListener('click', (event) => {
		const target = /** @type {Element} */ (event.target);
		const spoiler = target.closest('.spoiler');
		if (!spoiler) return;
		const onLink = target.closest('a') !== null;
		// A link inside a revealed spoiler works as normal.
		if (onLink && spoiler.classList.contains('spoiler-revealed')) return;
		// A tap on a link inside a hidden spoiler reveals it rather than
		// following the link; one in a Question option's <label> or a
		// collapsible's <summary> doesn't also pick the option or toggle the
		// section.
		if (onLink || spoiler.closest('label, summary')) event.preventDefault();
		toggleSpoiler(spoiler);
	});

	doc.addEventListener('keydown', (event) => {
		const target = /** @type {Element} */ (event.target);
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (!target.classList.contains('spoiler')) return;
		event.preventDefault();
		toggleSpoiler(target);
	});
}

if (typeof document !== 'undefined') installSpoilerToggle(document);

/** Backtick-enclosed inline code span. */
const INLINE_CODE_PATTERN = /`([^`]+)`/g;

/**
 * Stands in for an inline code span while links and formatting run: a
 * Private Use Area character, which no link or formatting pattern matches.
 */
const CODE_SPAN_PLACEHOLDER = /î€€(\d+)î€€/g;

/**
 * Process inline formatting, escaping HTML to prevent XSS.
 * Order: HTML escape, set inline code spans aside, links, text formatting,
 * then put the code spans back - so text inside backticks renders exactly
 * as typed (no links, bold or italic inside it).
 * @param {string} text - The text to process
 * @returns {string} The HTML formatted text with code tags
 */
function processInlineCode(text, headingIds = new Map()) {
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

	/** @type {string[]} */
	const codeSpans = [];
	const withoutCode = escaped.replace(INLINE_CODE_PATTERN, (_match, code) => {
		codeSpans.push(code);
		return `î€€${codeSpans.length - 1}î€€`;
	});

	const withPageLinks = processPageAndSectionLinks(withoutCode, headingIds);
	const withLinks = processMarkdownLinks(withPageLinks);
	const withFormatting = processTextFormatting(withLinks);
	const withSpoilers = withFormatting.replace(SPOILER_PATTERN, `${SPOILER_OPEN_TAG}$1</span>`);

	return withSpoilers.replace(CODE_SPAN_PLACEHOLDER, (_match, index) => `<code>${codeSpans[Number(index)]}</code>`);
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
/**
 * Split a text item's raw lines on any [[q:slug]] Question Link occurrences,
 * replacing each match with a placeholder marker object interspersed between
 * the surrounding plain-text lines. A Question Link always renders as its
 * own block (see docs/adr/0010 and the implementation plan's decision C) -
 * it mounts a live, stateful, interactive widget via question-embed.js,
 * which a synchronous string substitution (like a Page Link's static <a>)
 * can't produce - so even a Question Link in the middle of a sentence breaks
 * that line into separate text-before / embed / text-after pieces.
 * @param {string[]} rawLines
 * @returns {Array<string|{type: "questionLink", slug: string}>}
 * @private
 */
function expandQuestionLinkLines(rawLines) {
	const expanded = [];
	for (const rawLine of rawLines) {
		// A Question Link typed inside backticks is literal code, not an embed.
		const codeSpans = [...rawLine.matchAll(INLINE_CODE_PATTERN)]
			.map((span) => [span.index, span.index + span[0].length]);
		const matches = [...rawLine.matchAll(QUESTION_LINK_PATTERN)]
			.filter((match) => !codeSpans.some(([start, end]) => match.index >= start && match.index < end));
		if (matches.length === 0) {
			expanded.push(rawLine);
			continue;
		}
		let cursor = 0;
		for (const match of matches) {
			const before = rawLine.slice(cursor, match.index);
			if (before.trim() !== '') expanded.push(before);
			const { slug } = parseQuestionLinkMatch(match[1], match[2]);
			expanded.push({ type: 'questionLink', slug });
			cursor = match.index + match[0].length;
		}
		const after = rawLine.slice(cursor);
		if (after.trim() !== '') expanded.push(after);
	}
	return expanded;
}

/** A quote's first line `[!type] Optional title` makes it a callout. */
const CALLOUT_HEADER_PATTERN = /^\[!([A-Za-z]+)\](.*)$/;

/** Callout types and their icons; any other type draws as a note. */
const CALLOUT_ICONS = new Map([
	["note", "📝"],
	["tip", "💡"],
	["warning", "⚠️"],
	["danger", "⛔"],
	["question", "❓"],
	["example", "📋"],
]);

/**
 * Split text items into runs of plain lines and runs of quote lines, so
 * consecutive `>` lines become one quote item even though parseDSL stores
 * each line as its own text item. Code and collapsible items pass through.
 * @param {Array<Object>} contentItems
 * @returns {Array<Object>} items, where `{type: "quote", lines}` holds a quote's lines with the `>` removed
 * @private
 */
function groupQuoteLines(contentItems) {
	const grouped = [];
	for (const item of contentItems) {
		if (item.type !== "text") {
			grouped.push(item);
			continue;
		}
		for (const line of item.value.split('\n')) {
			const last = grouped[grouped.length - 1];
			const quoteMatch = line.match(QUOTE_LINE_PATTERN);
			if (quoteMatch) {
				// A `[!type]` line always starts a new callout.
				if (last && last.type === "quote" && !CALLOUT_HEADER_PATTERN.test(quoteMatch[1])) {
					last.lines.push(quoteMatch[1]);
				} else {
					grouped.push({ type: "quote", lines: [quoteMatch[1]] });
				}
			} else if (last && last.type === "text") {
				last.value += `\n${line}`;
			} else {
				grouped.push({ type: "text", value: line });
			}
		}
	}
	return grouped;
}

/**
 * Render one quote run: inline formatting and lists work inside it, through
 * the same text rendering as everywhere else.
 * @param {string[]} lines - The quote's lines, `>` removed
 * @param {HTMLElement} containerEl
 * @param {Map<string, string>} headingIds
 * @param {string[]} headingIdQueue
 * @private
 */
function renderQuote(lines, containerEl, headingIds, headingIdQueue) {
	const calloutMatch = lines[0].match(CALLOUT_HEADER_PATTERN);
	if (!calloutMatch) {
		const blockquote = document.createElement("blockquote");
		blockquote.className = "lesson-blockquote";
		renderContentItems([{ type: "text", value: lines.join('\n') }], blockquote, headingIds, headingIdQueue);
		containerEl.appendChild(blockquote);
		return;
	}

	const typedName = calloutMatch[1].toLowerCase();
	const type = CALLOUT_ICONS.has(typedName) ? typedName : "note";
	const title = calloutMatch[2].trim() || typedName.charAt(0).toUpperCase() + typedName.slice(1);

	const callout = document.createElement("div");
	callout.className = `lesson-callout lesson-callout-${type}`;
	callout.setAttribute("role", "note");

	const titleEl = document.createElement("div");
	titleEl.className = "lesson-callout-title";
	const icon = document.createElement("span");
	icon.className = "lesson-callout-icon";
	icon.setAttribute("aria-hidden", "true");
	icon.textContent = CALLOUT_ICONS.get(type);
	const titleText = document.createElement("span");
	titleText.className = "lesson-callout-title-text";
	titleText.innerHTML = processInlineCode(title, headingIds);
	titleEl.append(icon, titleText);

	const content = document.createElement("div");
	content.className = "lesson-callout-content";
	renderContentItems([{ type: "text", value: lines.slice(1).join('\n') }], content, headingIds, headingIdQueue);

	callout.append(titleEl, content);
	containerEl.appendChild(callout);
}

function renderContentItems(contentItems, containerEl, headingIds = new Map(), headingIdQueue = []) {
	// Stack to track list hierarchy (separate from parent list stack)
	const listStack = [];
	let indentUnit = null;

	groupQuoteLines(contentItems).forEach(item => {
		if (item.type === "quote") {
			listStack.length = 0;
			indentUnit = null;
			renderQuote(item.lines, containerEl, headingIds, headingIdQueue);
			return;
		}
		if (item.type === "text") {
			// Split text into lines to process each separately, expanding out
			// any [[q:slug]] Question Links into their own placeholder markers
			// first (see expandQuestionLinkLines above).
			const lines = expandQuestionLinkLines(item.value.split('\n'));
			
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
				if (line && typeof line === "object" && line.type === "questionLink") {
					// A Question Link always renders as its own block (see
					// expandQuestionLinkLines's doc comment) - reset list/heading
					// state the same way a heading does, then mount a placeholder
					// for question-embed.js to hydrate asynchronously afterward.
					listStack.length = 0;
					indentUnit = null;

					const placeholder = document.createElement("div");
					placeholder.className = "question-embed-placeholder";
					placeholder.dataset.questionSlug = line.slug;
					containerEl.appendChild(placeholder);
					return;
				}

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
						const [, indent, , content] = ulMatch;
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
							const [, indent, , content] = olMatch;
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
	processInlineCode,
	renderContentItems,
	installSpoilerToggle
};
