/**
 * DSL Validation Module
 * Provides validation functions for Domain-Specific Language content
 */

/**
 * Validate parsed DSL content and return an error message if invalid
 * @param {string} dslText - The raw DSL text
 * @param {Object} parsed - The parsed content object from parseDSL
 * @returns {string|null} Error message if validation fails, null if valid
 */
export function validateDSL(dslText, parsed) {
	// Check if the parsed result is valid and complete
	if (!parsed || typeof parsed !== 'object') {
		return 'Parser returned invalid data';
	}

	// Check for empty content
	if (!dslText.trim()) {
		return 'Content is empty';
	}

	// Check for missing title
	if (!parsed.title || parsed.title.trim() === '') {
		return 'Missing title - content should start with "# Title"';
	}

	// Check for no content blocks
	if (!parsed.blocks || parsed.blocks.length === 0) {
		return 'No content blocks found - add some text or questions after the title';
	}

	// Check for unmatched code blocks with language support
	const lines = dslText.split('\n');
	const codeBlockMarkers = lines.filter(line => 
		line.trim() === '```' || line.trim().match(/^```\s*\w+$/)
	);
	if (codeBlockMarkers.length % 2 !== 0) {
		return 'Unmatched code block - every ``` opening must have a closing ```';
	}

	// Check if blocks have content
	const hasContent = parsed.blocks.some(block => 
		block.content && block.content.length > 0
	);
	if (!hasContent) {
		return 'Content blocks are empty - add text or code to your questions';
	}

	// All validation checks passed
	return null;
}

