import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import {
	ref,
	get,
	set,
	remove,
	child
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { db } from './firebase-config.js';
import {
	parseDSL,
	generateDSLFromContent
} from "./dsl.js";
import {
	validateDSL,
	getErrorExplanation
} from "./dsl-validation.js";
import {
	initializeLessonSearch,
	showLessonSearchPopup
} from "./lesson-search.js";
import {
	renderContent
} from "./content-renderer.js";
import {
	AIQuestionGenerator
} from "./ai-generator.js";
import {
	initializeDatabase,
	generateUniqueHash
} from "./database-utils.js";
import { renderTeacherNav } from "./teacher-nav.js";

import {
	AI_CONFIG,
	validateConfig
} from "./ai-config.js";
import { NO_CONTENT_SELECTED, UNTITLED_LESSON, UNTITLED_LESSON_LOWERCASE, CONTENT_NOT_FOUND } from './constants.js';
import { showNotification } from './notification-utils.js';

// Database is imported from centralized firebase-config.js

export function getQueryParams() {
  const params = {};
  window.location.search.substring(1).split("&").forEach(pair => {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return params;
}

export function updatePreview(dslText, previewEl) {
  try {
    const parsed = parseDSL(dslText);
    const validationError = validateDSL(dslText, parsed);

    if (validationError) {
      const error = new Error(validationError);
      previewEl.innerHTML = getErrorExplanation(error, dslText);
    } else {
      renderContent(parsed, previewEl);
    }
  } catch (err) {
    previewEl.innerHTML = getErrorExplanation(err, dslText);
  }
}

/**
 * Compute the result of pressing Tab in the DSL editor: insert 4 spaces at
 * the cursor (replacing any selection).
 * @returns {{value: string, cursor: number}}
 */
export function computeTabIndent(value, selectionStart, selectionEnd) {
  const newValue = value.substring(0, selectionStart) + "    " + value.substring(selectionEnd);
  return { value: newValue, cursor: selectionStart + 4 };
}

/**
 * Compute the result of pressing Backspace with the cursor at the end of a
 * run of only-spaces at the start of a line: delete back to the previous
 * multiple-of-4 indent level. Returns null when smart backspace doesn't
 * apply (there's a selection, or the text before the cursor on this line
 * isn't all spaces, or there's less than one indent level of it) - the
 * caller should let a normal Backspace proceed in that case.
 * @returns {{value: string, cursor: number}|null}
 */
export function computeSmartBackspace(value, selectionStart, selectionEnd) {
  if (selectionStart !== selectionEnd || selectionStart === 0) return null;

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineBeforeCursor = value.substring(lineStart, selectionStart);

  if (!/^ +$/.test(lineBeforeCursor) || lineBeforeCursor.length < 4) return null;

  const spacesToDelete = lineBeforeCursor.length % 4 || 4;
  const newValue = value.substring(0, selectionStart - spacesToDelete) + value.substring(selectionStart);
  return { value: newValue, cursor: selectionStart - spacesToDelete };
}

/**
 * Compute the result of pressing Enter: start the new line with the same
 * leading whitespace as the current line. Returns null when there's no
 * indentation to carry over (there's a selection, or the current line has
 * no leading spaces) - the caller should let a normal Enter proceed.
 * @returns {{value: string, cursor: number}|null}
 */
export function computeAutoIndentNewline(value, selectionStart, selectionEnd) {
  if (selectionStart !== selectionEnd) return null;

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const currentLine = value.substring(lineStart, selectionStart);
  const indentMatch = currentLine.match(/^( *)/);
  const indent = indentMatch ? indentMatch[1] : '';

  if (indent.length === 0) return null;

  const newValue = value.substring(0, selectionStart) + '\n' + indent + value.substring(selectionEnd);
  return { value: newValue, cursor: selectionStart + 1 + indent.length };
}

function applyComputedEdit(dslInputEl, result) {
  dslInputEl.value = result.value;
  dslInputEl.selectionStart = dslInputEl.selectionEnd = result.cursor;
  dslInputEl.dispatchEvent(new Event('input'));
}

/**
 * Handle Tab/Backspace/Enter smart-indentation in the DSL textarea.
 * @param {KeyboardEvent} event
 * @param {HTMLTextAreaElement} dslInputEl
 */
export function handleDslInputKeydown(event, dslInputEl) {
  const { value, selectionStart, selectionEnd } = dslInputEl;

  if (event.key === "Tab") {
    event.preventDefault();
    applyComputedEdit(dslInputEl, computeTabIndent(value, selectionStart, selectionEnd));
  } else if (event.key === "Backspace") {
    const result = computeSmartBackspace(value, selectionStart, selectionEnd);
    if (result) {
      event.preventDefault();
      applyComputedEdit(dslInputEl, result);
    }
  } else if (event.key === "Enter") {
    const result = computeAutoIndentNewline(value, selectionStart, selectionEnd);
    if (result) {
      event.preventDefault();
      applyComputedEdit(dslInputEl, result);
    }
  }
}

// Enable/disable the DSL input and the action buttons together, e.g. while
// no lesson is selected. Queries its elements fresh rather than caching
// them, since it's called from several independent places (this file and
// ai-generator.js, which takes it as a constructor argument).
export function setEditingEnabled(enabled) {
  const dslInput = document.getElementById("dslInput");
  const saveBtn = document.getElementById("saveBtn");
  const duplicateBtn = document.getElementById("duplicateBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  dslInput.disabled = !enabled;
  saveBtn.disabled = !enabled;
  duplicateBtn.disabled = !enabled;
  deleteBtn.disabled = !enabled;
  if (!enabled) {
    dslInput.placeholder = "Select a file from the dropdown or use a URL parameter to edit content";
  } else {
    dslInput.placeholder = "";
  }
}

export async function saveLesson(id, dslText) {
  if (!id || id === NO_CONTENT_SELECTED) {
    alert("No content ID available.");
    return;
  }

  const parsed = parseDSL(dslText);
  if (!parsed.title || !parsed.blocks) {
    alert("Parsing failed or content is malformed.");
    return;
  }

  await set(ref(db, `content/${id}`), parsed);

  const timestamp = new Date().toLocaleString();
  const lessonTitle = parsed.title || UNTITLED_LESSON;
  showNotification(`"${lessonTitle}" saved successfully at ${timestamp}`, "success");
}

/**
 * Duplicate a Lesson: parse the current DSL, save a copy under a new hash
 * with "(Copy)" appended to its title. Returns the new hash and the
 * duplicated content on success, so the caller can update the editor and
 * the lesson dropdown - or null if duplication didn't happen (invalid
 * content, or a save failure, both already alerted/notified here).
 * @returns {Promise<{newHash: string, duplicatedContent: Object}|null>}
 */
export async function duplicateLesson(currentId, dslText) {
  if (!currentId || currentId === NO_CONTENT_SELECTED) {
    alert("No content ID available.");
    return null;
  }

  let parsed;
  try {
    parsed = parseDSL(dslText);
    if (!parsed.title || !parsed.blocks) {
      alert("Cannot duplicate: Current content is malformed or empty.");
      return null;
    }
  } catch (err) {
    alert("Cannot duplicate: Failed to parse current content.");
    return null;
  }

  try {
    const newHash = await generateUniqueHash();
    const duplicatedContent = { ...parsed, title: `${parsed.title} (Copy)` };
    await set(ref(db, `content/${newHash}`), duplicatedContent);
    alert(`Content duplicated successfully!\nNew ID: ${newHash}`);
    return { newHash, duplicatedContent };
  } catch (error) {
    console.error("Error duplicating content:", error);
    showNotification("Failed to duplicate content. Please try again.", "error");
    return null;
  }
}

/**
 * Delete a Lesson after confirming with the teacher (using its title from
 * the current DSL, falling back to the database, then to a generic title).
 * @returns {Promise<boolean>} Whether the delete actually happened
 */
export async function deleteLesson(id, dslText) {
  if (!id || id === NO_CONTENT_SELECTED) {
    alert("No content ID available.");
    return false;
  }

  let title = UNTITLED_LESSON;
  try {
    const parsed = parseDSL(dslText);
    if (parsed && parsed.title) {
      title = parsed.title;
    }
  } catch (err) {
    try {
      const snap = await get(ref(db, `content/${id}/title`));
      if (snap.exists()) {
        title = snap.val();
      }
    } catch (dbErr) {
      // Keep default title if both methods fail
    }
  }

  const confirmed = confirm(`Are you sure you want to delete the lesson "${title}"?\n\nContent ID: ${id}\nThis action cannot be undone.`);
  if (!confirmed) return false;

  try {
    await remove(ref(db, `content/${id}`));
    showNotification("Content deleted successfully!", "success");
    return true;
  } catch (error) {
    console.error("Error deleting content:", error);
    showNotification("Failed to delete content. Please try again.", "error");
    return false;
  }
}

export async function loadExistingContentList(existingContentSelectEl, selectLessonId = null) {
  existingContentSelectEl.innerHTML = '<option value="">-- Select a lesson --</option>';

  const snap = await get(child(ref(db), "content"));
  if (!snap.exists()) return;

  const contentMap = snap.val();
  const sortedKeys = Object.keys(contentMap).sort();

  for (let id of sortedKeys) {
    const title = contentMap[id]?.title || UNTITLED_LESSON_LOWERCASE;
    const option = document.createElement("option");
    option.value = id;
    option.textContent = title;
    existingContentSelectEl.appendChild(option);
  }

  if (selectLessonId) {
    for (let i = 0; i < existingContentSelectEl.options.length; i++) {
      if (existingContentSelectEl.options[i].value === selectLessonId) {
        existingContentSelectEl.selectedIndex = i;
        break;
      }
    }
  }
}

/**
 * Load a Lesson's content into the editor and preview. Does not enable
 * editing itself - callers do that, since they already need to decide
 * whether to (e.g. handleExistingPageContext doesn't, on a load failure).
 * @returns {Promise<boolean>} Whether the Lesson was found and loaded
 */
export async function loadContent(id, dslInputEl, previewEl) {
  const snap = await get(ref(db, `content/${id}`));
  if (!snap.exists()) {
    alert(CONTENT_NOT_FOUND);
    return false;
  }

  const data = snap.val();
  const dslText = generateDSLFromContent(data);
  dslInputEl.value = dslText;
  updatePreview(dslText, previewEl);
  return true;
}

/**
 * If ?new=1 is in the URL, seed the editor with a blank, ready-to-edit
 * Lesson and a fresh content id.
 */
export async function handleNewLessonContext(params, contentIdEl, dslInputEl, previewEl) {
  if (params.new !== "1") return;

  const newHash = await generateUniqueHash();
  contentIdEl.textContent = newHash;
  const dslText = generateDSLFromContent({
    title: "New Lesson",
    blocks: [{ type: "question", content: [{ type: "text", value: "Type your question or content here..." }] }]
  });
  dslInputEl.value = dslText;
  updatePreview(dslText, previewEl);
  dslInputEl.focus();
  window._newLessonDayIndex = params.dayIndex;
  setEditingEnabled(true);
}

/**
 * If ?page=<id> is in the URL, load that Lesson; otherwise leave editing
 * disabled until the teacher picks something.
 */
export async function handleExistingPageContext(params, contentIdEl, dslInputEl, previewEl) {
  if (params.page) {
    contentIdEl.textContent = params.page;
    const found = await loadContent(params.page, dslInputEl, previewEl);
    if (found) setEditingEnabled(true);
  } else {
    setEditingEnabled(false);
  }
}

export async function main() {
  // Initialize database utilities
  initializeDatabase(db);

  // Initialize the lesson search module with database reference
  initializeLessonSearch(db);

  renderTeacherNav('editor');

  // Update back to schedule link to preserve class selection
  const urlParams = new URLSearchParams(window.location.search);
  const classParam = urlParams.get('fromClass');
  if (classParam) {
    const backLink = document.getElementById('backToScheduleLink');
    if (backLink) {
      backLink.href = `teacher.html?class=${classParam}`;
    }
  }

  const contentIdEl = document.getElementById("contentId");
  const dslInput = document.getElementById("dslInput");
  const preview = document.getElementById("preview");
  const saveBtn = document.getElementById("saveBtn");
  const duplicateBtn = document.getElementById("duplicateBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const searchLessonBtn = document.getElementById("searchLessonBtn");
  const existingContentSelect = document.getElementById("existingContent");

  dslInput.addEventListener("input", () => updatePreview(dslInput.value, preview));
  dslInput.addEventListener("keydown", (event) => handleDslInputKeydown(event, dslInput));

  // Add keyboard shortcut for save (Ctrl+S on Windows, Cmd+S on Mac)
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault(); // Prevent browser's default save dialog
      if (!saveBtn.disabled) {
        saveBtn.click();
      }
    }
  });

  // Initialize AI Question Generator - after setEditingEnabled is defined
  // above, since the constructor takes it as an argument rather than
  // reaching for it lazily
  try {
    validateConfig();
    new AIQuestionGenerator(db, AI_CONFIG.ANTHROPIC_API_KEY, setEditingEnabled);
  } catch (error) {
    console.warn('AI Generator not available:', error.message);
    // Disable the AI button if configuration is missing
    const aiBtn = document.getElementById('generateAIBtn');
    if (aiBtn) {
      aiBtn.disabled = true;
      aiBtn.title = 'AI Generation requires Anthropic API key configuration';
      aiBtn.textContent = '🤖 Generate Questions (Not Configured)';
    }
  }

  // Search lesson button functionality
  searchLessonBtn.onclick = () => {
    showLessonSearchPopup({
      onSelect: async (lessonId) => {
        for (let i = 0; i < existingContentSelect.options.length; i++) {
          if (existingContentSelect.options[i].value === lessonId) {
            existingContentSelect.selectedIndex = i;
            break;
          }
        }
        contentIdEl.textContent = lessonId;
        const found = await loadContent(lessonId, dslInput, preview);
        if (found) setEditingEnabled(true);
      }
    });
  };

  saveBtn.onclick = () => saveLesson(contentIdEl.textContent.trim(), dslInput.value);

  duplicateBtn.onclick = async () => {
    const result = await duplicateLesson(contentIdEl.textContent.trim(), dslInput.value);
    if (!result) return;

    const { newHash, duplicatedContent } = result;
    contentIdEl.textContent = newHash;
    const newDslText = generateDSLFromContent(duplicatedContent);
    dslInput.value = newDslText;
    updatePreview(newDslText, preview);

    existingContentSelect.value = "";
    await loadExistingContentList(existingContentSelect, newHash);
  };

  deleteBtn.onclick = async () => {
    const deleted = await deleteLesson(contentIdEl.textContent.trim(), dslInput.value);
    if (!deleted) return;

    contentIdEl.textContent = NO_CONTENT_SELECTED;
    dslInput.value = "";
    preview.innerHTML = "";
    existingContentSelect.value = "";
    setEditingEnabled(false);
    await loadExistingContentList(existingContentSelect);
  };

  existingContentSelect.onchange = async () => {
    const selectedId = existingContentSelect.value;
    if (!selectedId) {
      contentIdEl.textContent = NO_CONTENT_SELECTED;
      dslInput.value = "";
      preview.innerHTML = "";
      setEditingEnabled(false);
      return;
    }
    contentIdEl.textContent = selectedId;
    const found = await loadContent(selectedId, dslInput, preview);
    if (found) setEditingEnabled(true);
  };

  // Check for URL parameters first to see if we need to select a specific lesson
  const params = getQueryParams();
  const initialLessonId = params.page || null;

  // Load the content list and potentially select a specific lesson
  await loadExistingContentList(existingContentSelect, initialLessonId);

  await handleNewLessonContext(params, contentIdEl, dslInput, preview);
  await handleExistingPageContext(params, contentIdEl, dslInput, preview);
}

// Check authentication before proceeding. Only run automatically when
// actually loaded on editor.html - importing this module elsewhere (tests)
// never triggers real auth/Firebase/DOM side effects on its own.
if (document.getElementById('dslInput')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) {
      return; // Stop execution if not authenticated
    }

    // Setup activity listeners for session management
    window.teacherAuth.setupActivityListeners();

    // Continue with normal editor.js execution
    main();
  })();
}
