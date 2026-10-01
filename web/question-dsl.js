/**
 * Parse Question DSL text into a structured Question.
 *
 * This is a deliberately separate grammar from dsl.js's Lesson/Page DSL (see
 * docs/adr/0010-questions-are-linked-not-inline.md) - a Question is never
 * authored inline in Lesson/Page content, so there's no reason for the two
 * grammars to overlap beyond reusing the same text/code line handling for
 * the stem (so content-renderer.js's existing renderContentItems can render
 * it unchanged).
 *
 * DSL format:
 * - Stem: every line before the first Option marker line. Same text/code
 *   line rules as dsl.js (blank lines skipped outside code, ``` / ```lang
 *   toggles a code block, code lines preserved verbatim).
 * - Option marker: "+ <text>" for the one correct Option, "- <text>" for
 *   each wrong Option, unindented (column 0).
 * - Indented (4+ space) keyword lines under an Option: "Explanation: <text>"
 *   (every Option) and "Mistake: <text>" (wrong Options only) - either can
 *   wrap onto further indented lines, joined with a single space.
 * - Exactly one "Tags: <Class Name> | <topic>" line, unindented.
 *
 * @example
 * parseQuestionDSL(`
 * What is 2 + 2?
 *
 * + 4
 *     Explanation: Correct.
 * - 5
 *     Explanation: Off by one.
 *     Mistake: calculation error
 *
 * Tags: AP CS A | arithmetic
 * `)
 *
 * @param {string} dslText
 * @returns {{
 *   stem: Array<{type: "text"|"code", value: string, language?: string}>,
 *   options: Array<{text: string, correct: boolean, explanation: string, mistakeCategory: string|null}>,
 *   className: string|null,
 *   topic: string|null,
 * }}
 */
export function parseQuestionDSL(dslText) {
  const lines = (dslText || "").split("\n");

  const stem = [];
  const options = [];
  let className = null;
  let topic = null;

  let phase = "stem"; // "stem" | "options"
  let inCode = false;
  let codeBuffer = [];
  let currentCodeLanguage;
  let currentOption = null;
  let currentField = null; // "explanation" | "mistake" | null, within currentOption

  function isOptionMarkerLine(raw, trimmed) {
    const indent = raw.length - raw.trimStart().length;
    return indent === 0 && /^[+-] /.test(trimmed);
  }

  function isTagsLine(raw, trimmed) {
    const indent = raw.length - raw.trimStart().length;
    return indent === 0 && trimmed.startsWith("Tags:");
  }

  function closeCodeBlock() {
    const codeBlock = { type: "code", value: codeBuffer.join("\n") };
    if (currentCodeLanguage) codeBlock.language = currentCodeLanguage;
    stem.push(codeBlock);
    inCode = false;
    codeBuffer = [];
    currentCodeLanguage = undefined;
  }

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (phase === "stem") {
      if (!inCode && isOptionMarkerLine(raw, trimmed)) {
        phase = "options";
        // fall through to option handling below
      } else if (trimmed === "" && !inCode) {
        continue;
      } else if (!inCode && (trimmed === "```" || trimmed.startsWith("```"))) {
        inCode = true;
        codeBuffer = [];
        const languagePart = trimmed.length > 3 ? trimmed.substring(3).trim() : "";
        currentCodeLanguage = languagePart || undefined;
        continue;
      } else if (inCode && (trimmed === "```" || trimmed.startsWith("```"))) {
        closeCodeBlock();
        continue;
      } else if (inCode) {
        codeBuffer.push(raw);
        continue;
      } else {
        stem.push({ type: "text", value: raw });
        continue;
      }
    }

    if (phase === "options") {
      if (trimmed === "") continue;

      if (isOptionMarkerLine(raw, trimmed)) {
        if (currentOption) options.push(currentOption);
        currentOption = {
          text: trimmed.slice(2).trim(),
          correct: trimmed.startsWith("+"),
          explanation: "",
          mistakeCategory: null,
        };
        currentField = null;
        continue;
      }

      if (isTagsLine(raw, trimmed)) {
        if (currentOption) {
          options.push(currentOption);
          currentOption = null;
        }
        const rest = trimmed.slice("Tags:".length).trim();
        const [namePart, topicPart] = rest.split("|");
        className = namePart ? namePart.trim() : null;
        topic = topicPart !== undefined ? topicPart.trim() : null;
        currentField = null;
        continue;
      }

      const indent = raw.length - raw.trimStart().length;
      if (currentOption && indent >= 4) {
        if (/^Explanation:/.test(trimmed)) {
          currentOption.explanation = trimmed.slice("Explanation:".length).trim();
          currentField = "explanation";
        } else if (/^Mistake:/.test(trimmed)) {
          currentOption.mistakeCategory = trimmed.slice("Mistake:".length).trim();
          currentField = "mistake";
        } else if (currentField === "explanation") {
          currentOption.explanation = `${currentOption.explanation} ${trimmed}`.trim();
        } else if (currentField === "mistake") {
          currentOption.mistakeCategory = `${currentOption.mistakeCategory} ${trimmed}`.trim();
        }
      }
    }
  }

  if (inCode && stem.length >= 0) {
    // Unterminated code fence in the stem - close it with whatever was
    // buffered rather than silently dropping content; validation (not
    // parsing) is responsible for surfacing the unmatched-fence error.
    closeCodeBlock();
  }
  if (currentOption) options.push(currentOption);

  return { stem, options, className, topic };
}

function serializeStemItems(stemItems, lines) {
  for (const item of stemItems) {
    if (item.type === "text") {
      lines.push(item.value);
    } else if (item.type === "code") {
      lines.push(item.language ? `\`\`\`${item.language}` : "```");
      lines.push(item.value);
      lines.push("```");
    }
  }
}

/**
 * Generate Question DSL text from a parsed Question (reverse of parseQuestionDSL).
 * @param {{stem: Array, options: Array, className: string|null, topic: string|null}} parsed
 * @returns {string}
 */
export function generateQuestionDSLFromParsed(parsed) {
  const lines = [];
  serializeStemItems(parsed.stem || [], lines);
  lines.push("");

  for (const option of parsed.options || []) {
    lines.push(`${option.correct ? "+" : "-"} ${option.text}`);
    lines.push(`    Explanation: ${option.explanation || ""}`);
    if (!option.correct) {
      lines.push(`    Mistake: ${option.mistakeCategory || ""}`);
    }
    lines.push("");
  }

  lines.push(`Tags: ${parsed.className || ""} | ${parsed.topic || ""}`);
  return lines.join("\n");
}
