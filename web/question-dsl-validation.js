/**
 * Question DSL Validation Module
 * Mirrors dsl-validation.js's shape for the separate Question-authoring
 * grammar (question-dsl.js). Class-name *resolution* (does a Class with
 * this name actually exist) is deliberately not checked here - that needs a
 * database read, so it happens in the editor's save handler, the same way
 * "is this slug already taken" lives in assignSlug rather than in parseDSL.
 */

/**
 * Validate a parsed Question and return an error message if invalid.
 * @param {string} dslText - The raw Question DSL text
 * @param {{stem: Array, options: Array, className: string|null, topic: string|null}} parsed
 * @returns {string|null} Error message if validation fails, null if valid
 */
export function validateQuestionDSL(dslText, parsed) {
  if (!dslText || !dslText.trim()) {
    return "Content is empty";
  }
  if (!parsed || typeof parsed !== "object") {
    return "Parser returned invalid data";
  }
  if (!Array.isArray(parsed.stem) || parsed.stem.length === 0) {
    return "Missing stem - add some text before the first + or - option";
  }

  const lines = dslText.split("\n");
  const codeBlockMarkers = lines.filter((line) =>
    line.trim() === "```" || line.trim().match(/^```\s*\w+$/)
  );
  if (codeBlockMarkers.length % 2 !== 0) {
    return "Unmatched code block - every ``` opening must have a closing ```";
  }

  const options = Array.isArray(parsed.options) ? parsed.options : [];
  if (options.length < 2) {
    return "Add at least two Options (one correct, marked with \"+\", at least one wrong, marked with \"-\")";
  }

  const correctOptions = options.filter((option) => option.correct);
  if (correctOptions.length === 0) {
    return "No correct Option marked - exactly one Option must start with \"+\"";
  }
  if (correctOptions.length > 1) {
    return "More than one Option is marked correct - exactly one Option must start with \"+\"";
  }

  const missingExplanation = options.find((option) => !option.explanation || !option.explanation.trim());
  if (missingExplanation) {
    return `Option "${missingExplanation.text}" is missing an Explanation`;
  }

  const wrongOptionMissingMistake = options.find(
    (option) => !option.correct && (!option.mistakeCategory || !option.mistakeCategory.trim())
  );
  if (wrongOptionMissingMistake) {
    return `Wrong Option "${wrongOptionMissingMistake.text}" is missing a Mistake category`;
  }

  if (!parsed.className || !parsed.className.trim()) {
    return "Missing Tags line - add \"Tags: <Class Name> | <topic>\" after the last Option";
  }
  if (!parsed.topic || !parsed.topic.trim()) {
    return "Tags line is missing a topic - use \"Tags: <Class Name> | <topic>\"";
  }

  return null;
}

/**
 * Generate a detailed HTML error explanation for a Question DSL validation
 * failure. Mirrors dsl-validation.js's getErrorExplanation but for the
 * smaller, single-question Question grammar.
 * @param {string} errorMessage - The message returned by validateQuestionDSL
 * @returns {string} HTML string containing the error explanation
 */
export function getQuestionErrorExplanation(errorMessage) {
  return `
    <div class="error-container">
      <h3 class="error-title">⚠️ Question Format Error</h3>
      <p class="error-message"><strong>Issue:</strong> ${errorMessage}</p>
      <div class="error-help">
        <p><strong>Question Format Reminder:</strong></p>
        <ul>
          <li>Write the stem as regular text/code before the first Option</li>
          <li>Mark the correct Option: <code>+ answer text</code></li>
          <li>Mark each wrong Option: <code>- answer text</code></li>
          <li>Every Option needs an indented <code>Explanation:</code> line</li>
          <li>Every wrong Option also needs an indented <code>Mistake:</code> line</li>
          <li>End with one <code>Tags: Class Name | topic</code> line</li>
        </ul>
      </div>
    </div>
  `;
}
