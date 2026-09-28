// Shared DSL cheat-sheet content, used by both the Lesson editor (editor.js)
// and Page editor (page-editor.js) so the reference never drifts between the
// two - the DSL itself (dsl.js/content-renderer.js) is identical either way.

const CHEAT_SHEET_ENTRIES = [
  { syntax: '# Title', description: 'The title - must be the very first line.' },
  { syntax: '---', description: 'Separates questions/sections, on its own line.' },
  { syntax: '**bold**, *italic*, ***both***', description: 'Text formatting. Also __bold__ and _italic_.' },
  { syntax: '`code`', description: 'Inline code.' },
  { syntax: '```\ncode block\n```', description: 'A code block. Add a language right after the opening ``` for syntax highlighting, e.g. ```javascript.' },
  { syntax: '## Heading', description: 'A heading, level 1 through 6 (#  through ######).' },
  { syntax: '- item\n* item', description: 'A bulleted list item. Indent with 4 spaces to nest.' },
  { syntax: '1. item', description: 'A numbered list item. Indent with 4 spaces to nest.' },
  { syntax: '>>> Title\n...\n<<<', description: 'A collapsible section, closed by default. Use >>>! to start it already open.' },
  { syntax: '[text](url)', description: 'A link to any URL.' },
  { syntax: '[[slug]]\n[[slug|Display Text]]', description: 'A Page Link - links to another Page by its URL slug.' },
  { syntax: '[[#Header Text]]\n[[#Header Text|Display Text]]', description: 'A Section Link - jumps to a heading on this same page.' },
];

/**
 * Build the DSL cheat-sheet panel: a native <details> disclosure, hidden
 * until clicked, with free keyboard support and mobile behavior and no
 * custom toggle JS needed.
 * @returns {HTMLDetailsElement}
 */
export function createDslCheatSheetPanel() {
  const details = document.createElement('details');
  details.className = 'dsl-cheat-sheet';

  const summary = document.createElement('summary');
  summary.textContent = 'DSL Cheat Sheet';
  details.appendChild(summary);

  const table = document.createElement('table');
  table.className = 'dsl-cheat-sheet-table';
  for (const { syntax, description } of CHEAT_SHEET_ENTRIES) {
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
