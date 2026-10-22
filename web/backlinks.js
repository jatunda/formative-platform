// @ts-check
// Backlink rules shared by Page Links and Question Links (see CONTEXT.md's
// Backlink entry and docs/adr/0008): which targets a Page's links resolve to,
// how the index changes when they do, and which index entries to remove.
// Each kind of link has its own Backlink index
// (`{backlinkPath}/{targetId}/{sourcePageId} -> true`) and its own field on
// the source Page's record listing the targets it last linked to. Pure:
// returns update paths for the caller (the Page module, or the Node cleanup
// script scripts/cleanBacklinks.js) to apply.
import { extractPageLinkSlugs } from "./page-links.js";
import { extractQuestionLinkSlugs } from "./question-links.js";

/**
 * @typedef {object} LinkKind
 * @property {string} backlinkPath - Root of this kind's Backlink index
 * @property {string} linksToField - Page record field listing the targets
 * @property {(content: any) => string[]} extractSlugs - The Slugs this kind
 *   of link references in a Page's content
 */

/** @type {LinkKind} */
export const PAGE_LINKS = {
  backlinkPath: "backlinks",
  linksToField: "linksTo",
  extractSlugs: extractPageLinkSlugs,
};

/** @type {LinkKind} */
export const QUESTION_LINKS = {
  backlinkPath: "questionBacklinks",
  linksToField: "questionLinksTo",
  extractSlugs: extractQuestionLinkSlugs,
};

/**
 * The distinct ids a Page's links of one kind point at: its referenced Slugs
 * resolved through that kind's Slug index (see resolveLinkTargets).
 * @param {LinkKind} kind
 * @param {string} pageId - The linking Page, which never Backlinks itself
 * @param {any} content - The Page's parsed content
 * @param {Record<string, string>} slugIndex - That kind's Slug -> id index
 * @returns {string[]}
 */
export function linkTargets(kind, pageId, content, slugIndex) {
  return resolveLinkTargets(kind.extractSlugs(content), slugIndex, pageId);
}

/**
 * The distinct entity ids a Page's referenced Slugs resolve to, in first-seen
 * order. Slugs the index doesn't know (dangling links) are dropped, and so is
 * `excludeId` (a Page linking to itself gets no Backlink).
 * @param {string[]} slugs
 * @param {Record<string, string>} slugIndex - Slug -> entity id
 * @param {string} [excludeId]
 * @returns {string[]}
 */
export function resolveLinkTargets(slugs, slugIndex, excludeId) {
  return [...new Set(
    slugs
      .map((slug) => slugIndex[slug])
      .filter((targetId) => targetId && targetId !== excludeId)
  )];
}

/**
 * The Backlink index changes for a source Page whose targets went from
 * `previousTargets` to `nextTargets`: `true` for each new target, `null` for
 * each dropped one, nothing for unchanged ones.
 * @param {LinkKind} kind
 * @param {string} sourcePageId
 * @param {string[]} previousTargets
 * @param {string[]} nextTargets
 * @returns {Record<string, true | null>}
 */
export function diffBacklinks(kind, sourcePageId, previousTargets, nextTargets) {
  /** @type {Record<string, true | null>} */
  const updates = {};
  for (const oldTarget of previousTargets) {
    if (!nextTargets.includes(oldTarget)) {
      updates[`${kind.backlinkPath}/${oldTarget}/${sourcePageId}`] = null;
    }
  }
  for (const newTarget of nextTargets) {
    if (!previousTargets.includes(newTarget)) {
      updates[`${kind.backlinkPath}/${newTarget}/${sourcePageId}`] = true;
    }
  }
  return updates;
}

/**
 * Every entry in one kind's whole Backlink index for which
 * `shouldRemove(targetId, sourcePageId)` holds, as
 * `{backlinkPath}/{targetId}/{sourcePageId}` paths mapped to null - ready to
 * merge into one multi-path `update()`. Scanning the index (rather than a
 * Page's stored list of targets) also finds entries the list has lost track of.
 * @param {LinkKind} kind
 * @param {Record<string, Record<string, unknown>> | null | undefined} index - The whole Backlink index
 * @param {(targetId: string, sourcePageId: string) => boolean} shouldRemove
 * @returns {Record<string, null>}
 */
export function backlinkRemovals(kind, index, shouldRemove) {
  /** @type {Record<string, null>} */
  const removals = {};
  for (const [targetId, sourcePages] of Object.entries(index || {})) {
    for (const sourcePageId of Object.keys(sourcePages)) {
      if (shouldRemove(targetId, sourcePageId)) {
        removals[`${kind.backlinkPath}/${targetId}/${sourcePageId}`] = null;
      }
    }
  }
  return removals;
}

/**
 * Every entry in one kind's Backlink index that the source Page's current
 * content doesn't back up: the source Page no longer exists, or no longer
 * links to the target. For cleaning up entries left behind before Page
 * saves and deletes kept the indexes exact.
 * @param {LinkKind} kind
 * @param {Record<string, Record<string, unknown>> | null | undefined} index - The whole Backlink index
 * @param {Record<string, any>} pages - Every Page record, by id
 * @param {Record<string, string>} slugIndex - That kind's Slug -> id index
 * @returns {Record<string, null>}
 */
export function staleBacklinkRemovals(kind, index, pages, slugIndex) {
  return backlinkRemovals(kind, index, (targetId, sourcePageId) =>
    !(sourcePageId in pages)
    || !linkTargets(kind, sourcePageId, pages[sourcePageId], slugIndex).includes(targetId));
}
