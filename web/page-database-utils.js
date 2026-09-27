// Page Database Utility Functions
// Pages are standalone DSL content reachable by a human-chosen Slug (see
// CONTEXT.md), distinct from Lessons. Stored under `pages/{pageId}`, with
// `slugIndex/{slug} -> pageId` as the only source of truth for slug lookups
// (a page's own record never stores its slugs, to avoid two copies of truth).
import {
  ref,
  get,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_PAGE_TITLE } from "./constants.js";
import { generateUniqueHash } from "./database-utils.js";

let db;

/**
 * Initialize database reference
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} database
 */
export function initializePageDatabase(database) {
  if (!database) {
    throw new Error("Database instance is required for initialization");
  }
  db = database;
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Whether a string is a valid Slug: lowercase alphanumeric segments joined by
 * single hyphens (e.g. "syllabus", "syllabus-2026"). No leading/trailing/
 * repeated hyphens, no uppercase, no spaces or other URL-unsafe characters.
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlugFormat(slug) {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

/**
 * Create a new Page with a unique id
 * @param {string} [title=DEFAULT_PAGE_TITLE]
 * @returns {Promise<string>} The generated pageId
 */
export async function createNewPage(title = DEFAULT_PAGE_TITLE) {
  const pageId = await generateUniqueHash("pages");
  await set(ref(db, `pages/${pageId}`), { title });
  return pageId;
}

/**
 * Get a Page's content by id
 * @param {string} pageId
 * @returns {Promise<{title: string, blocks: Array} | null>}
 */
export async function getPageFromDB(pageId) {
  const snap = await get(ref(db, `pages/${pageId}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Get all Pages (for the Page manager list)
 * @returns {Promise<Object | null>} Object mapping pageId to page data
 */
export async function getAllPages() {
  const snap = await get(ref(db, "pages"));
  return snap.exists() ? snap.val() : null;
}

/**
 * Save a Page's parsed DSL content
 * @param {string} pageId
 * @param {{title: string, blocks: Array}} parsed
 * @returns {Promise<void>}
 */
export async function savePage(pageId, parsed) {
  if (!parsed || !parsed.title || !parsed.blocks) {
    throw new Error("Invalid page content: missing title or blocks");
  }
  await set(ref(db, `pages/${pageId}`), parsed);
}

/**
 * Get the full slug -> pageId index (for building a pageId -> slugs reverse map)
 * @returns {Promise<Object>} Object mapping slug to pageId, or {} if none exist
 */
export async function getAllSlugs() {
  const snap = await get(ref(db, "slugIndex"));
  return snap.exists() ? snap.val() : {};
}

/**
 * Assign a Slug to a Page. Fails if the slug is invalid or already points to
 * a different Page - a Page may have multiple slugs, but a slug maps to
 * exactly one Page.
 * @param {string} pageId
 * @param {string} slug
 * @returns {Promise<void>}
 * @throws {Error} If the slug is malformed or already taken by another page
 */
export async function assignSlug(pageId, slug) {
  if (!isValidSlugFormat(slug)) {
    throw new Error("Slugs must be lowercase letters, numbers, and hyphens only (e.g. \"syllabus\").");
  }
  const existing = await get(ref(db, `slugIndex/${slug}`));
  if (existing.exists() && existing.val() !== pageId) {
    throw new Error(`The URL "/p/${slug}" is already in use by another page.`);
  }
  await set(ref(db, `slugIndex/${slug}`), pageId);
}

/**
 * Remove a Slug, taking its Page offline at that URL (the Page itself is untouched)
 * @param {string} slug
 * @returns {Promise<void>}
 */
export async function removeSlug(slug) {
  await remove(ref(db, `slugIndex/${slug}`));
}

/**
 * Resolve a Slug to its Page id
 * @param {string} slug
 * @returns {Promise<string | null>}
 */
export async function resolveSlugToPageId(slug) {
  const snap = await get(ref(db, `slugIndex/${slug}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Delete a Page and every Slug that points to it, atomically
 * @param {string} pageId
 * @returns {Promise<void>}
 */
export async function deletePageAndSlugs(pageId) {
  const allSlugs = await getAllSlugs();
  const updates = { [`pages/${pageId}`]: null };
  for (const [slug, ownerId] of Object.entries(allSlugs)) {
    if (ownerId === pageId) {
      updates[`slugIndex/${slug}`] = null;
    }
  }
  await update(ref(db), updates);
}
