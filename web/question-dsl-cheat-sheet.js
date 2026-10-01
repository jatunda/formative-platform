// Question DSL cheat-sheet content - the full MCQ-authoring grammar
// (question-dsl.js), kept entirely separate from dsl-cheat-sheet.js (the
// Lesson/Page DSL cheat sheet) per docs/adr/0010-questions-are-linked-not-inline.md:
// a Question is never authored inline in Lesson/Page content, so the normal
// editor's cheat sheet only ever needs the one-line Question Link syntax,
// never this full grammar.

const QUESTION_CHEAT_SHEET_ENTRIES = [
  { syntax: 'Stem text here.', description: 'Everything before the first + or - line is the stem. Same formatting as Lesson/Page text: **bold**, `inline code`.' },
  { syntax: '```\ncode block\n```', description: 'A code block in the stem. Add a language after the opening ``` for syntax highlighting, e.g. ```java.' },
  { syntax: '+ answer text', description: 'The one correct Option. Exactly one + line is required.' },
  { syntax: '- answer text', description: 'A wrong Option. Any number of - lines, at least one required.' },
  { syntax: '    Explanation: text', description: 'Required on every Option (indented 4 spaces under it) - shown to the student after they pick that Option.' },
  { syntax: '    Mistake: category', description: 'Required on every wrong (-) Option only - a short label for the kind of error (e.g. "calculation error"), used for future reporting, not shown to students.' },
  { syntax: 'Tags: Class Name | topic', description: 'One line, after the last Option, naming the Class (by its exact name) and a free-text topic.' },
];

/**
 * Build the Question DSL cheat-sheet panel - same <details> disclosure shape
 * as dsl-cheat-sheet.js's createDslCheatSheetPanel.
 * @returns {HTMLDetailsElement}
 */
export function createQuestionDslCheatSheetPanel() {
  const details = document.createElement('details');
  details.className = 'dsl-cheat-sheet';

  const summary = document.createElement('summary');
  summary.textContent = 'Question Format Cheat Sheet';
  details.appendChild(summary);

  const table = document.createElement('table');
  table.className = 'dsl-cheat-sheet-table';
  for (const { syntax, description } of QUESTION_CHEAT_SHEET_ENTRIES) {
    const row = document.createElement('tr');

    const syntaxCell = document.createElement('td');
    const code = document.createElement('code');
    code.textContent = syntax;
    syntaxCell.appendChild(code);

    const descCell = document.createElement('td');
    descCell.textContent = description;

    row.appendChild(syntaxCell);
    row.appendChild(descCell);
    table.appendChild(row);
  }
  details.appendChild(table);

  return details;
}
