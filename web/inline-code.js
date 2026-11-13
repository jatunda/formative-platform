// @ts-check
// Inline code spans (`like this`): what the renderer shows as literal code,
// so nothing typed inside one is a link, a spoiler or any other formatting.
// content-renderer.js sets them aside while it formats a line, and the
// Backlink extractors (page-links.js, question-links.js) skip links inside
// them, so a link written as a code example is never counted.

/** Backtick-enclosed inline code span, on one line of text. */
export const INLINE_CODE_PATTERN = /`([^`]+)`/g;

/**
 * Every match of `pattern` in one line of text that doesn't start inside an
 * inline code span.
 * @param {string} line
 * @param {RegExp} pattern - must have the g flag
 * @returns {RegExpMatchArray[]}
 */
export function matchAllOutsideInlineCode(line, pattern) {
  const codeSpans = [...line.matchAll(INLINE_CODE_PATTERN)]
    .map((span) => [/** @type {number} */ (span.index), /** @type {number} */ (span.index) + span[0].length]);
  return [...line.matchAll(pattern)]
    .filter((match) => !codeSpans.some(([start, end]) => /** @type {number} */ (match.index) >= start && /** @type {number} */ (match.index) < end));
}
