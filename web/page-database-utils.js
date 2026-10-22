// Page Database Utility Functions
// Pages are standalone DSL content reachable by a human-chosen Slug (see
// CONTEXT.md), distinct from Lessons. Stored under `pages/{pageId}`, with
// `slugIndex/{slug} -> pageId` as the only source of truth for slug lookups
// (a page's own record never stores its slugs, to avoid two copies of truth).
// The Slug rules live in slug-index.js and the Backlink diffing in
// backlinks.js. This is the only module that writes Page records: the
// Question module hands its link targets and rewrites to the functions here.
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_PAGE_TITLE } from "./constants.js";
import { generateUniqueHash } from "./database-utils.js";
import { extractPageLinkSlugs, rewriteSlugInContent } from "./page-links.js";
import { questionBacklinkRemovals } from "./question-backlinks.js";
import { createSlugIndex } from "./slug-index.js";
import { realtimeStore } from "./realtime-store.js";
import { getDb } from "./database-handle.js";
import { PAGE_LINKS, diffBacklinks, resolveLinkTargets } from "./backlinks.js";

/** @type {import("./slug-index.js").SlugNamespace} */
const PAGE_SLUGS = {
  indexPath: "slugIndex",
  formatExample: "syllabus",
  takenMessage: (slug) => `The URL "/p/${slug}" is already in use by another page.`,
};

/** This namespace's Slug index, over the shared database handle. */
const slugs = () => createSlugIndex(PAGE_SLUGS, realtimeStore(getDb()));

/**
 * Create a new Page with a unique id
 * @param {string} [title=DEFAULT_PAGE_TITLE]
 * @returns {Promise<string>} The generated pageId
 */
export async function createNewPage(title = DEFAULT_PAGE_TITLE) {
  const pageId = await generateUniqueHash("pages");
  await set(ref(getDb(), `pages/${pageId}`), { title });
  return pageId;
}

/**
 * Get a Page's content by id
 * @param {string} pageId
 * @returns {Promise<{title: string, blocks: Array} | null>}
 */
export async function getPageFromDB(pageId) {
  const snap = await get(ref(getDb(), `pages/${pageId}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Get all Pages (for the Page manager list)
 * @returns {Promise<Object | null>} Object mapping pageId to page data
 */
export async function getAllPages() {
  const snap = await get(ref(getDb(), "pages"));
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
  await set(ref(getDb(), `pages/${pageId}`), parsed);
}

/**
 * Every Page currently known to contain a Page Link to this Page (see
 * CONTEXT.md's Backlink entry). Used to warn before removing a Slug or
 * deleting a Page, and to find who needs fixing up during a Slug Rename.
 * @param {string} pageId
 * @returns {Promise<string[]>} Source pageIds
 */
export async function getBacklinks(pageId) {
  const snap = await get(ref(getDb(), `backlinks/${pageId}`));
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
  const allSlugs = await getAllSlugs();
  await recordPageLinks(
    pageId,
    PAGE_LINKS,
    resolveLinkTargets(extractPageLinkSlugs(parsed), allSlugs, pageId)
  );
}

/**
 * Record which targets a Page's links of one kind (Page Links or Question
 * Links, see backlinks.js) now point at: diffs against the Page's stored
 * list for that kind, then writes the Backlink changes and the new list in
 * one atomic update. A no-op when the targets haven't changed.
 * @param {string} pageId
 * @param {import("./backlinks.js").LinkKind} kind
 * @param {string[]} targetIds - Distinct ids this Page now links to
 * @returns {Promise<void>}
 */
export async function recordPageLinks(pageId, kind, targetIds) {
  const snap = await get(ref(getDb(), `pages/${pageId}/${kind.linksToField}`));
  const previousTargets = snap.exists() ? snap.val() : [];
  const { updates, linksChanged } = diffBacklinks(kind, pageId, previousTargets, targetIds);
  /** @type {Record<string, unknown>} */
  const allUpdates = { ...updates };
  if (linksChanged) {
    allUpdates[`pages/${pageId}/${kind.linksToField}`] = targetIds.length > 0 ? targetIds : null;
  }
  if (Object.keys(allUpdates).length > 0) {
    await update(ref(getDb()), allUpdates);
  }
}

/**
 * Finish a Slug Rename (of a Page Slug or a Question Slug): rewrite the
 * stored content of each Page that links to the renamed entity, and write
 * those Pages together with the caller's Slug index swap in one atomic
 * update, so a failure partway through can't leave some Pages rewritten and
 * others not. Only Pages the rewrite actually changed are written; Pages
 * that no longer exist are skipped rather than recreated.
 * @param {Record<string, any>} slugUpdates - The validated Slug index swap
 *   (slug-index.js's renameUpdates)
 * @param {string[]} linkingPageIds - The renamed entity's Backlinks
 * @param {(content: any) => any} rewrite - Old Slug -> new Slug in one Page
 * @returns {Promise<void>}
 */
export async function commitSlugRename(slugUpdates, linkingPageIds, rewrite) {
  /** @type {Record<string, any>} */
  const updates = { ...slugUpdates };
  for (const pageId of linkingPageIds) {
    const content = await getPageFromDB(pageId);
    if (!content) continue;
    const rewritten = rewrite(content);
    if (JSON.stringify(rewritten) !== JSON.stringify(content)) {
      updates[`pages/${pageId}`] = rewritten;
    }
  }
  await update(ref(getDb()), updates);
}

/**
 * Get the full slug -> pageId index (for building a pageId -> slugs reverse map)
 * @returns {Promise<Object>} Object mapping slug to pageId, or {} if none exist
 */
export async function getAllSlugs() {
  return slugs().getAll();
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
  await slugs().claim(pageId, slug);
}

/**
 * Remove a Slug, taking its Page offline at that URL (the Page itself is untouched)
 * @param {string} slug
 * @returns {Promise<void>}
 */
export async function removeSlug(slug) {
  await slugs().release(slug);
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
  await commitSlugRename(
    await slugs().renameUpdates(pageId, oldSlug, newSlug),
    await getBacklinks(pageId),
    (content) => rewriteSlugInContent(content, oldSlug, newSlug)
  );
}

/**
 * Resolve a Slug to its Page id
 * @param {string} slug
 * @returns {Promise<string | null>}
 */
export async function resolveSlugToPageId(slug) {
  return slugs().resolve(slug);
}

/**
 * Delete a Page and every Slug that points to it, atomically. Also cleans up
 * this Page's own outgoing Backlink entries (it no longer links to anything),
 * its incoming ones (nothing should claim a Backlink to a deleted Page), and
 * its entries in every Question's Question Backlinks (so the Question
 * editor's delete/remove confirms stop counting it).
 * Does not touch other Pages' stored Page Link text - those become dangling
 * (see CONTEXT.md's Slug entry) rather than being rewritten.
 * @param {string} pageId
 * @returns {Promise<void>}
 */
export async function deletePageAndSlugs(pageId) {
  const [slugRemovals, linksToSnap, questionBacklinksSnap] = await Promise.all([
    slugs().releaseAllUpdates(pageId),
    get(ref(getDb(), `pages/${pageId}/linksTo`)),
    get(ref(getDb(), "questionBacklinks")),
  ]);
  const updates = {
    [`pages/${pageId}`]: null,
    [`backlinks/${pageId}`]: null,
    ...slugRemovals,
    // Scans the whole Question Backlink index rather than trusting this
    // Page's `questionLinksTo`, which only reflects its latest save (savePage
    // overwrites the record), so an older entry could otherwise outlive it.
    ...questionBacklinkRemovals(
      questionBacklinksSnap.exists() ? questionBacklinksSnap.val() : null,
      (sourcePageId) => sourcePageId === pageId
    ),
  };
  const linksTo = linksToSnap.exists() ? linksToSnap.val() : [];
  for (const targetId of linksTo) {
    updates[`backlinks/${targetId}/${pageId}`] = null;
  }
  await update(ref(getDb()), updates);
}
