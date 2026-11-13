// @ts-check
// Inline code spans (`like this`): what the renderer shows as literal code,
// so nothing typed inside one is a link, a spoiler or any other formatting.
// content-renderer.js sets them aside while it formats a line, the Backlink
// extractors (page-links.js, question-links.js) skip links inside them, so a
// link written as a code example is never counted, and a Slug Rename leaves
// such examples as they were written.

/** Backtick-enclosed inline code span, on one line of text. */
export const INLINE_CODE_PATTERN = /`([^`]+)`/g;

/**
 * A test for whether a match starting at a given index in `line` starts
 * inside an inline code span.
 * @param {string} line
 * @returns {(index: number) => boolean}
 */
function insideInlineCode(line) {
  const codeSpans = [...line.matchAll(INLINE_CODE_PATTERN)]
    .map((span) => [/** @type {number} */ (span.index), /** @type {number} */ (span.index) + span[0].length]);
  return (index) => codeSpans.some(([start, end]) => index >= start && index < end);
}

/**
 * Every match of `pattern` in one line of text that doesn't start inside an
 * inline code span.
 * @param {string} line
 * @param {RegExp} pattern - must have the g flag
 * @returns {RegExpMatchArray[]}
 */
export function matchAllOutsideInlineCode(line, pattern) {
  const isInCode = insideInlineCode(line);
  return [...line.matchAll(pattern)].filter((match) => !isInCode(/** @type {number} */ (match.index)));
}

/**
 * `text` with every match of `pattern` that doesn't start inside an inline
 * code span replaced by `replacement`. Works line by line, since an inline
 * code span never crosses a line break.
 * @param {string} text
 * @param {RegExp} pattern - must have the g flag
 * @param {string} replacement - literal text, no `$` substitutions
 * @returns {string}
 */
export function replaceOutsideInlineCode(text, pattern, replacement) {
  return text.split("\n").map((line) => {
    const isInCode = insideInlineCode(line);
    return line.replace(pattern, (match, ...args) => {
      // replace() passes the capture groups, then the match's offset.
      const offset = /** @type {number} */ (args.find((arg) => typeof arg === "number"));
      return isInCode(offset) ? match : replacement;
    });
  }).join("\n");
}
