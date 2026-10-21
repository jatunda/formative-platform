// Question Database Utility Functions
// Questions are their own entity (see CONTEXT.md's Question entry),
// reachable by a human-chosen Slug in its own namespace, separate from
// Pages' slugIndex (docs/adr/0011). Stored under `questions/{questionId}`,
// with `questionSlugIndex/{slug} -> questionId` as the only source of truth
// for slug lookups. The Slug rules live in slug-index.js. Page records are
// the Page module's: this module resolves Question Links and hands the
// results to page-database-utils.js (which callers must also initialize)
// rather than reading or writing `pages/*` itself.
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { generateUniqueHash } from "./database-utils.js";
import { createSlugIndex } from "./slug-index.js";
import { realtimeStore } from "./realtime-store.js";
import { QUESTION_LINKS, resolveLinkTargets } from "./backlinks.js";
import { pageRewriteUpdates, recordPageLinks } from "./page-database-utils.js";
import { extractQuestionLinkSlugs, rewriteQuestionSlugInContent } from "./question-links.js";

/** @type {import("./slug-index.js").SlugNamespace} */
const QUESTION_SLUGS = {
  indexPath: "questionSlugIndex",
  formatExample: "loops-1",
  takenMessage: (slug) => `The Question Link "[[q:${slug}]]" is already in use by another question.`,
};

let db;
let slugs;

/**
 * Initialize database reference
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} database
 */
export function initializeQuestionDatabase(database) {
  if (!database) {
    throw new Error("Database instance is required for initialization");
  }
  db = database;
  slugs = createSlugIndex(QUESTION_SLUGS, realtimeStore(db));
}

/**
 * Create a new Question with a unique id. Writes a real placeholder field
 * (not an empty stem/options array - Firebase RTDB silently drops empty
 * arrays on write, see dsl.js's serializeContentItems comment) so the
 * questionId is genuinely reserved and getAllQuestions() can list it as a
 * not-yet-written-to Question, the same way createNewPage does for Pages.
 * @returns {Promise<string>} The generated questionId
 */
export async function createNewQuestion() {
  const questionId = await generateUniqueHash("questions");
  await set(ref(db, `questions/${questionId}`), { createdAt: Date.now() });
  return questionId;
}

/**
 * Get a Question's content by id
 * @param {string} questionId
 * @returns {Promise<{stem: Array, options: Array, classId: string, topic: string} | null>}
 */
export async function getQuestionFromDB(questionId) {
  const snap = await get(ref(db, `questions/${questionId}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Get all Questions (for the Question Bank list/picker)
 * @returns {Promise<Object | null>} Object mapping questionId to question data
 */
export async function getAllQuestions() {
  const snap = await get(ref(db, "questions"));
  return snap.exists() ? snap.val() : null;
}

/**
 * Save a Question's parsed content
 * @param {string} questionId
 * @param {{stem: Array, options: Array, classId: string, topic: string}} parsed
 * @returns {Promise<void>}
 */
export async function saveQuestion(questionId, parsed) {
  if (!parsed || !Array.isArray(parsed.stem) || !Array.isArray(parsed.options)) {
    throw new Error("Invalid question content: missing stem or options");
  }
  await set(ref(db, `questions/${questionId}`), parsed);
}

/**
 * Resolve a human-typed Class name (as written on a Question DSL's Tags
 * line) to its classId. Exact, trimmed match against `classes/*.name`.
 * @param {string} className
 * @returns {Promise<string>}
 * @throws {Error} If zero or more than one Class has this name
 */
export async function resolveClassNameToId(className) {
  const snap = await get(ref(db, "classes"));
  const classes = snap.exists() ? snap.val() : {};
  const trimmedName = (className || "").trim();
  const matches = Object.entries(classes).filter(
    ([, classData]) => (classData.name || "").trim() === trimmedName
  );
  if (matches.length === 0) {
    throw new Error(`No class named "${trimmedName}" found.`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple classes are named "${trimmedName}" - please rename one of them.`);
  }
  return matches[0][0];
}

/**
 * Every Page currently known to contain a Question Link to this Question
 * (Page content only - see the Question Backlinks scope note in the
 * implementation plan/ADRs; Lesson content was never backlink-tracked for
 * Page Links either, and Question Links follow that same existing scope).
 * @param {string} questionId
 * @returns {Promise<string[]>} Source pageIds
 */
export async function getQuestionBacklinks(questionId) {
  const snap = await get(ref(db, `questionBacklinks/${questionId}`));
  return snap.exists() ? Object.keys(snap.val()) : [];
}

/**
 * Recompute a Page's outgoing Question Links and update the Question
 * Backlink index to match - called after every successful Page save
 * alongside updateBacklinksForPage, so both indexes stay accurate at all
 * times. Diffs against the Page's previously-known `questionLinksTo` rather
 * than unconditionally re-writing. This module resolves the Question
 * Links; the Page module records them.
 * @param {string} pageId
 * @param {{title: string, blocks: Array}} parsed - This Page's just-saved content
 * @returns {Promise<void>}
 */
export async function updateQuestionBacklinksForPage(pageId, parsed) {
  const allQuestionSlugs = await getAllQuestionSlugs();
  await recordPageLinks(
    pageId,
    QUESTION_LINKS,
    resolveLinkTargets(extractQuestionLinkSlugs(parsed), allQuestionSlugs)
  );
}

/**
 * Get the full slug -> questionId index
 * @returns {Promise<Object>} Object mapping slug to questionId, or {} if none exist
 */
export async function getAllQuestionSlugs() {
  return slugs.getAll();
}

/**
 * Assign a Slug to a Question. Fails if the slug is invalid or already
 * points to a different Question.
 * @param {string} questionId
 * @param {string} slug
 * @returns {Promise<void>}
 * @throws {Error} If the slug is malformed or already taken by another question
 */
export async function assignQuestionSlug(questionId, slug) {
  await slugs.claim(questionId, slug);
}

/**
 * Remove a Slug, taking its Question offline at that Question Link (the
 * Question itself is untouched)
 * @param {string} slug
 * @returns {Promise<void>}
 */
export async function removeQuestionSlug(slug) {
  await slugs.release(slug);
}

/**
 * Rename a Question's Slug while keeping it pointing at the same Question.
 * Uses the Question Backlink index to find every Page that links here and
 * rewrites their stored Question Links from the old Slug to the new one,
 * combined into one atomic update alongside the questionSlugIndex swap.
 * @param {string} questionId
 * @param {string} oldSlug
 * @param {string} newSlug
 * @returns {Promise<void>}
 * @throws {Error} If the new slug is malformed or already taken by another question
 */
export async function renameQuestionSlug(questionId, oldSlug, newSlug) {
  const slugUpdates = await slugs.renameUpdates(questionId, oldSlug, newSlug);
  const pageUpdates = await pageRewriteUpdates(
    await getQuestionBacklinks(questionId),
    (content) => rewriteQuestionSlugInContent(content, oldSlug, newSlug)
  );
  await update(ref(db), { ...slugUpdates, ...pageUpdates });
}

/**
 * Resolve a Question Slug to its Question id
 * @param {string} slug
 * @returns {Promise<string | null>}
 */
export async function resolveQuestionSlugToId(slug) {
  return slugs.resolve(slug);
}

/**
 * Delete a Question and every Slug that points to it, atomically. Also
 * cleans up this Question's incoming Backlink entries. Does not touch other
 * Pages' stored Question Link text - those become dangling, same as a
 * deleted Page's Page Links.
 * @param {string} questionId
 * @returns {Promise<void>}
 */
export async function deleteQuestionAndSlugs(questionId) {
  await update(ref(db), {
    [`questions/${questionId}`]: null,
    [`questionBacklinks/${questionId}`]: null,
    ...await slugs.releaseAllUpdates(questionId),
  });
}
