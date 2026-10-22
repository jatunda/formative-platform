// Practice Set Database Utility Functions
// A Practice Set is an ordered list of Question ids, reachable by a
// human-chosen Slug in its own namespace (see CONTEXT.md's Practice Set and
// Slug entries). Stored under `practiceSets/{practiceSetId}`, with
// `practiceSetSlugIndex/{slug} -> practiceSetId` as the only source of truth
// for slug lookups. The Slug rules themselves live in slug-index.js. Unlike
// Pages there is no Backlinks-equivalent: a Practice Set's Slug is never
// embedded as text anywhere (there's no `[[...]]` form for it, only a bare
// shared URL), so renaming one is a plain Slug index swap, not a
// rewrite-every-source-page operation.
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { generateUniqueHash } from "./database-utils.js";
import { createSlugIndex } from "./slug-index.js";
import { realtimeStore } from "./realtime-store.js";
import { getDb } from "./database-handle.js";
import { DEFAULT_PRACTICE_SET_TITLE } from "./constants.js";

/** @type {import("./slug-index.js").SlugNamespace} */
const PRACTICE_SET_SLUGS = {
  indexPath: "practiceSetSlugIndex",
  formatExample: "unit-3-review",
  takenMessage: (slug) => `The URL "/practice/${slug}" is already in use by another practice set.`,
};

/** This namespace's Slug index, over the shared database handle. */
const slugs = () => createSlugIndex(PRACTICE_SET_SLUGS, realtimeStore(getDb()));

/**
 * Create a new Practice Set with a unique id
 * @param {string} [title=DEFAULT_PRACTICE_SET_TITLE]
 * @returns {Promise<string>} The generated practiceSetId
 */
export async function createNewPracticeSet(title = DEFAULT_PRACTICE_SET_TITLE) {
  const practiceSetId = await generateUniqueHash("practiceSets");
  await set(ref(getDb(), `practiceSets/${practiceSetId}`), { title });
  return practiceSetId;
}

/**
 * Get a Practice Set's content by id
 * @param {string} practiceSetId
 * @returns {Promise<{title: string, questionIds: string[]} | null>}
 */
export async function getPracticeSetFromDB(practiceSetId) {
  const snap = await get(ref(getDb(), `practiceSets/${practiceSetId}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Get all Practice Sets (for the Practice Set manager list)
 * @returns {Promise<Object | null>} Object mapping practiceSetId to practice set data
 */
export async function getAllPracticeSets() {
  const snap = await get(ref(getDb(), "practiceSets"));
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
  await set(ref(getDb(), `practiceSets/${practiceSetId}`), practiceSet);
}

/**
 * Get the full slug -> practiceSetId index
 * @returns {Promise<Object>} Object mapping slug to practiceSetId, or {} if none exist
 */
export async function getAllPracticeSetSlugs() {
  return slugs().getAll();
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
  await slugs().claim(practiceSetId, slug);
}

/**
 * Remove a Slug, taking its Practice Set offline at that URL (the Practice
 * Set itself is untouched)
 * @param {string} slug
 * @returns {Promise<void>}
 */
export async function removePracticeSetSlug(slug) {
  await slugs().release(slug);
}

/**
 * Rename a Practice Set's Slug while keeping it pointing at the same
 * Practice Set. Unlike a Page's or Question's Slug Rename, there is nothing
 * to rewrite elsewhere (see this module's top comment), so this is a bare
 * Slug index swap.
 * @param {string} practiceSetId
 * @param {string} oldSlug
 * @param {string} newSlug
 * @returns {Promise<void>}
 * @throws {Error} If the new slug is malformed or already taken by another practice set
 */
export async function renamePracticeSetSlug(practiceSetId, oldSlug, newSlug) {
  await slugs().rename(practiceSetId, oldSlug, newSlug);
}

/**
 * Resolve a Slug to its Practice Set id
 * @param {string} slug
 * @returns {Promise<string | null>}
 */
export async function resolvePracticeSetSlugToId(slug) {
  return slugs().resolve(slug);
}

/**
 * Delete a Practice Set and every Slug that points to it, atomically.
 * @param {string} practiceSetId
 * @returns {Promise<void>}
 */
export async function deletePracticeSetAndSlugs(practiceSetId) {
  await update(ref(getDb()), {
    [`practiceSets/${practiceSetId}`]: null,
    ...(await slugs().releaseAllUpdates(practiceSetId)),
  });
}
