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

	// Check for unmatched collapsible sections
	const collapsibleOpeners = lines.filter(line => {
		const trimmed = line.trim();
		return trimmed.startsWith('>>>') && !trimmed.startsWith('>>>!');
	}).length;
	const collapsibleExpandedOpeners = lines.filter(line => 
		line.trim().startsWith('>>>!')
	).length;
	const collapsibleClosers = lines.filter(line => 
		line.trim() === '<<<'
	).length;
	const totalOpeners = collapsibleOpeners + collapsibleExpandedOpeners;
	if (totalOpeners !== collapsibleClosers) {
		return `Unmatched collapsible sections - every >>> or >>>! opening must have a closing <<<. Found ${totalOpeners} opener(s) and ${collapsibleClosers} closer(s).`;
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

/**
 * Generate a detailed HTML error explanation for DSL parsing errors
 * Analyzes the error and DSL content to provide helpful feedback to users
 * @param {Error} error - The error object
 * @param {string} dslText - The DSL text that caused the error
 * @returns {string} HTML string containing the error explanation
 */
export function getErrorExplanation(error, dslText) {
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
		},
		'collapsible': {
			issue: 'Unclosed collapsible section(s)',
			solution: 'Every collapsible section opened with >>> or >>>! must be explicitly closed with <<<',
			example: '>>> Hint\nThis is hidden content\n<<<\n\nRegular content after'
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
	} else if (errorMessage.includes('Unclosed collapsible') || errorMessage.includes('collapsible')) {
		detectedIssue = explanations.collapsible;
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
					<li>Use collapsible sections: <code>>>> Title</code> ... <code><<<</code></li>
					<li>Separate questions with: <code>---</code> on its own line</li>
				</ul>
			</div>
		</div>
	`;
	
	return errorHtml;
}

