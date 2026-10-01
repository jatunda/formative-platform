// Practice Set Database Utility Functions
// A Practice Set is an ordered list of Question ids, reachable by a
// human-chosen Slug in its own namespace (see CONTEXT.md's Practice Set and
// Slug entries). Stored under `practiceSets/{practiceSetId}`, with
// `practiceSetSlugIndex/{slug} -> practiceSetId` as the only source of truth
// for slug lookups - mirrors page-database-utils.js's shape, but with no
// Backlinks-equivalent: a Practice Set's Slug is never embedded as text
// anywhere (there's no `[[...]]` form for it, only a bare shared URL), so
// renaming one is a plain slugIndex swap, not a rewrite-every-source-page
// operation.
import {
  ref,
  get,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { generateUniqueHash } from "./database-utils.js";
import { isValidSlugFormat } from "./page-database-utils.js";
import { DEFAULT_PRACTICE_SET_TITLE } from "./constants.js";

let db;

/**
 * Initialize database reference
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} database
 */
export function initializePracticeSetDatabase(database) {
  if (!database) {
    throw new Error("Database instance is required for initialization");
  }
  db = database;
}

/**
 * Create a new Practice Set with a unique id
 * @param {string} [title=DEFAULT_PRACTICE_SET_TITLE]
 * @returns {Promise<string>} The generated practiceSetId
 */
export async function createNewPracticeSet(title = DEFAULT_PRACTICE_SET_TITLE) {
  const practiceSetId = await generateUniqueHash("practiceSets");
  await set(ref(db, `practiceSets/${practiceSetId}`), { title });
  return practiceSetId;
}

/**
 * Get a Practice Set's content by id
 * @param {string} practiceSetId
 * @returns {Promise<{title: string, questionIds: string[]} | null>}
 */
export async function getPracticeSetFromDB(practiceSetId) {
  const snap = await get(ref(db, `practiceSets/${practiceSetId}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Get all Practice Sets (for the Practice Set manager list)
 * @returns {Promise<Object | null>} Object mapping practiceSetId to practice set data
 */
export async function getAllPracticeSets() {
  const snap = await get(ref(db, "practiceSets"));
  return snap.exists() ? snap.val() : null;
}

/**
 * Save a Practice Set's title and ordered Question id list
 * @param {string} practiceSetId
 * @param {{title: string, questionIds: string[]}} practiceSet
 * @returns {Promise<void>}
 */
export async function savePracticeSet(practiceSetId, practiceSet) {
  if (!practiceSet || !practiceSet.title || !Array.isArray(practiceSet.questionIds)) {
    throw new Error("Invalid practice set: missing title or questionIds");
  }
  await set(ref(db, `practiceSets/${practiceSetId}`), practiceSet);
}

/**
 * Get the full slug -> practiceSetId index
 * @returns {Promise<Object>} Object mapping slug to practiceSetId, or {} if none exist
 */
export async function getAllPracticeSetSlugs() {
  const snap = await get(ref(db, "practiceSetSlugIndex"));
  return snap.exists() ? snap.val() : {};
}

/**
 * Assign a Slug to a Practice Set. Fails if the slug is invalid or already
 * points to a different Practice Set.
 * @param {string} practiceSetId
 * @param {string} slug
 * @returns {Promise<void>}
 * @throws {Error} If the slug is malformed or already taken by another practice set
 */
export async function assignPracticeSetSlug(practiceSetId, slug) {
  if (!isValidSlugFormat(slug)) {
    throw new Error("Slugs must be lowercase letters, numbers, and hyphens only (e.g. \"unit-3-review\").");
  }
  const existing = await get(ref(db, `practiceSetSlugIndex/${slug}`));
  if (existing.exists() && existing.val() !== practiceSetId) {
    throw new Error(`The URL "/practice/${slug}" is already in use by another practice set.`);
  }
  await set(ref(db, `practiceSetSlugIndex/${slug}`), practiceSetId);
}

/**
 * Remove a Slug, taking its Practice Set offline at that URL (the Practice
 * Set itself is untouched)
 * @param {string} slug
 * @returns {Promise<void>}
 */
export async function removePracticeSetSlug(slug) {
  await remove(ref(db, `practiceSetSlugIndex/${slug}`));
}

/**
 * Rename a Practice Set's Slug while keeping it pointing at the same
 * Practice Set. Unlike a Page's or Question's Slug Rename, there is nothing
 * to rewrite elsewhere - a Practice Set Slug is never embedded as text in
 * any other content (see this module's top comment) - so this is a bare
 * slugIndex swap.
 * @param {string} practiceSetId
 * @param {string} oldSlug
 * @param {string} newSlug
 * @returns {Promise<void>}
 * @throws {Error} If the new slug is malformed or already taken by another practice set
 */
export async function renamePracticeSetSlug(practiceSetId, oldSlug, newSlug) {
  if (!isValidSlugFormat(newSlug)) {
    throw new Error("Slugs must be lowercase letters, numbers, and hyphens only (e.g. \"unit-3-review\").");
  }
  const existing = await get(ref(db, `practiceSetSlugIndex/${newSlug}`));
  if (existing.exists() && existing.val() !== practiceSetId) {
    throw new Error(`The URL "/practice/${newSlug}" is already in use by another practice set.`);
  }
  await update(ref(db), {
    [`practiceSetSlugIndex/${oldSlug}`]: null,
    [`practiceSetSlugIndex/${newSlug}`]: practiceSetId,
  });
}

/**
 * Resolve a Slug to its Practice Set id
 * @param {string} slug
 * @returns {Promise<string | null>}
 */
export async function resolvePracticeSetSlugToId(slug) {
  const snap = await get(ref(db, `practiceSetSlugIndex/${slug}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Delete a Practice Set and every Slug that points to it, atomically.
 * @param {string} practiceSetId
 * @returns {Promise<void>}
 */
export async function deletePracticeSetAndSlugs(practiceSetId) {
  const allSlugs = await getAllPracticeSetSlugs();
  const updates = {
    [`practiceSets/${practiceSetId}`]: null,
  };
  for (const [slug, ownerId] of Object.entries(allSlugs)) {
    if (ownerId === practiceSetId) {
      updates[`practiceSetSlugIndex/${slug}`] = null;
    }
  }
  await update(ref(db), updates);
}
