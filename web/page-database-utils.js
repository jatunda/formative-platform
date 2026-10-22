// Page Database Utility Functions
// Pages are standalone DSL content reachable by a human-chosen Slug (see
// CONTEXT.md), distinct from Lessons. Stored under `pages/{pageId}`, with
// `slugIndex/{slug} -> pageId` as the only source of truth for slug lookups
// (a page's own record never stores its slugs, to avoid two copies of truth).
// The Slug rules live in slug-index.js and the Backlink rules in
// backlinks.js. This is the only module that writes Page records: Question
// Link targets (resolved by the Question module) are passed into savePage,
// and Question Slug Renames go through commitSlugRename.
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_PAGE_TITLE } from "./constants.js";
import { generateUniqueHash } from "./database-utils.js";
import { rewriteSlugInContent } from "./page-links.js";
import { createSlugIndex } from "./slug-index.js";
import { realtimeStore } from "./realtime-store.js";
import { getDb } from "./database-handle.js";
import {
  PAGE_LINKS,
  QUESTION_LINKS,
  backlinkRemovals,
  diffBacklinks,
  linkTargets
} from "./backlinks.js";

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
 * Save a Page's parsed DSL content, and bring both Backlink indexes in line
 * with the links it now contains (see docs/adr/0008), all in one atomic
 * update. Diffs against the Page's stored `linksTo` / `questionLinksTo`
 * before the record is replaced, so links the edit dropped lose their
 * Backlinks. Page Links are resolved here; Question Links are resolved by
 * the Question module (question-database-utils.js's
 * resolveQuestionLinkTargets) and handed in.
 * @param {string} pageId
 * @param {{title: string, blocks: Array}} parsed
 * @param {string[]} questionTargetIds - Distinct Question ids this Page now links to
 * @returns {Promise<void>}
 */
export async function savePage(pageId, parsed, questionTargetIds) {
  if (!parsed || !parsed.title || !parsed.blocks) {
    throw new Error("Invalid page content: missing title or blocks");
  }
  const [previous, allSlugs] = await Promise.all([getPageFromDB(pageId), getAllSlugs()]);
  /** @type {Record<string, any>} */
  const record = { ...parsed };
  /** @type {Record<string, any>} */
  const updates = {};
  for (const [kind, targetIds] of /** @type {const} */ ([
    [PAGE_LINKS, linkTargets(PAGE_LINKS, pageId, parsed, allSlugs)],
    [QUESTION_LINKS, questionTargetIds],
  ])) {
    const previousTargets = (previous && previous[kind.linksToField]) || [];
    Object.assign(updates, diffBacklinks(kind, pageId, previousTargets, targetIds));
    if (targetIds.length > 0) {
      record[kind.linksToField] = targetIds;
    } else {
      delete record[kind.linksToField];
    }
  }
  updates[`pages/${pageId}`] = record;
  await update(ref(getDb()), updates);
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
  const [slugRemovals, backlinksSnap, questionBacklinksSnap] = await Promise.all([
    slugs().releaseAllUpdates(pageId),
    get(ref(getDb(), "backlinks")),
    get(ref(getDb(), "questionBacklinks")),
  ]);
  /** @param {any} snap */
  const valueOf = (snap) => (snap.exists() ? snap.val() : null);
  // Scans both whole Backlink indexes rather than trusting this Page's
  // `linksTo` / `questionLinksTo`, so an entry those lists lost track of
  // can't outlive the Page. Its own incoming entry is removed wholesale
  // below; skipping it here keeps the update's paths from overlapping.
  /** @param {string} targetId @param {string} sourcePageId */
  const isOutgoing = (targetId, sourcePageId) => sourcePageId === pageId && targetId !== pageId;
  await update(ref(getDb()), {
    [`pages/${pageId}`]: null,
    [`backlinks/${pageId}`]: null,
    ...slugRemovals,
    ...backlinkRemovals(PAGE_LINKS, valueOf(backlinksSnap), isOutgoing),
    ...backlinkRemovals(QUESTION_LINKS, valueOf(questionBacklinksSnap), isOutgoing),
  });
}
