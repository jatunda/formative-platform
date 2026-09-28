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
import { extractPageLinkSlugs, rewriteSlugInContent } from "./page-links.js";

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
 * Every Page currently known to contain a Page Link to this Page (see
 * CONTEXT.md's Backlink entry). Used to warn before removing a Slug or
 * deleting a Page, and to find who needs fixing up during a Slug Rename.
 * @param {string} pageId
 * @returns {Promise<string[]>} Source pageIds
 */
export async function getBacklinks(pageId) {
  const snap = await get(ref(db, `backlinks/${pageId}`));
  return snap.exists() ? Object.keys(snap.val()) : [];
}

/**
 * Recompute this Page's outgoing Page Links and update the Backlink index to
 * match - called after every successful save, so the index stays accurate
 * at all times, not just at Slug Rename time (see docs/adr/0008). Diffs
 * against the Page's previously-known `linksTo` rather than unconditionally
 * re-writing, so a save that didn't change any links touches nothing here.
 * @param {string} pageId
 * @param {{title: string, blocks: Array}} parsed - This Page's just-saved content
 * @returns {Promise<void>}
 */
export async function updateBacklinksForPage(pageId, parsed) {
  const [allSlugs, linksToSnap] = await Promise.all([
    getAllSlugs(),
    get(ref(db, `pages/${pageId}/linksTo`)),
  ]);
  const previousLinksTo = linksToSnap.exists() ? linksToSnap.val() : [];

  const referencedSlugs = extractPageLinkSlugs(parsed);
  const newLinksTo = [...new Set(
    referencedSlugs
      .map((slug) => allSlugs[slug])
      .filter((targetId) => targetId && targetId !== pageId)
  )];

  const updates = {};
  for (const oldTarget of previousLinksTo) {
    if (!newLinksTo.includes(oldTarget)) {
      updates[`backlinks/${oldTarget}/${pageId}`] = null;
    }
  }
  for (const newTarget of newLinksTo) {
    if (!previousLinksTo.includes(newTarget)) {
      updates[`backlinks/${newTarget}/${pageId}`] = true;
    }
  }

  const linksChanged = newLinksTo.length !== previousLinksTo.length
    || newLinksTo.some((id) => !previousLinksTo.includes(id));
  if (linksChanged) {
    updates[`pages/${pageId}/linksTo`] = newLinksTo.length > 0 ? newLinksTo : null;
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
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
 * Rename a Slug while keeping it pointing at the same Page (see CONTEXT.md's
 * Slug Rename entry) - distinct from removing one Slug and separately
 * adding another, because capturing old+new together is what lets this fix
 * up every Page that links here. Uses the Backlink index to find them and
 * rewrites their stored Page Links from the old Slug to the new one,
 * combined into one atomic update alongside the slugIndex swap itself, so a
 * failure partway through can't leave some Pages rewritten and others not.
 * A source page that links here via a *different* Slug of the same target
 * is left untouched (rewriting is a no-op for it).
 * @param {string} pageId
 * @param {string} oldSlug
 * @param {string} newSlug
 * @returns {Promise<void>}
 * @throws {Error} If the new slug is malformed or already taken by another page
 */
export async function renameSlug(pageId, oldSlug, newSlug) {
  if (!isValidSlugFormat(newSlug)) {
    throw new Error("Slugs must be lowercase letters, numbers, and hyphens only (e.g. \"syllabus\").");
  }
  const existing = await get(ref(db, `slugIndex/${newSlug}`));
  if (existing.exists() && existing.val() !== pageId) {
    throw new Error(`The URL "/p/${newSlug}" is already in use by another page.`);
  }

  const sourcePageIds = await getBacklinks(pageId);
  const updates = {
    [`slugIndex/${oldSlug}`]: null,
    [`slugIndex/${newSlug}`]: pageId,
  };

  for (const sourcePageId of sourcePageIds) {
    const sourceContent = await getPageFromDB(sourcePageId);
    if (!sourceContent) continue;
    const rewritten = rewriteSlugInContent(sourceContent, oldSlug, newSlug);
    if (JSON.stringify(rewritten) !== JSON.stringify(sourceContent)) {
      updates[`pages/${sourcePageId}`] = rewritten;
    }
  }

  await update(ref(db), updates);
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
 * Delete a Page and every Slug that points to it, atomically. Also cleans up
 * this Page's own outgoing Backlink entries (it no longer links to anything)
 * and its incoming ones (nothing should claim a Backlink to a deleted Page).
 * Does not touch other Pages' stored Page Link text - those become dangling
 * (see CONTEXT.md's Slug entry) rather than being rewritten.
 * @param {string} pageId
 * @returns {Promise<void>}
 */
export async function deletePageAndSlugs(pageId) {
  const [allSlugs, linksToSnap] = await Promise.all([
    getAllSlugs(),
    get(ref(db, `pages/${pageId}/linksTo`)),
  ]);
  const updates = {
    [`pages/${pageId}`]: null,
    [`backlinks/${pageId}`]: null,
  };
  for (const [slug, ownerId] of Object.entries(allSlugs)) {
    if (ownerId === pageId) {
      updates[`slugIndex/${slug}`] = null;
    }
  }
  const linksTo = linksToSnap.exists() ? linksToSnap.val() : [];
  for (const targetId of linksTo) {
    updates[`backlinks/${targetId}/${pageId}`] = null;
  }
  await update(ref(db), updates);
}
