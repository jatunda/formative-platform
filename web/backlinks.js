// @ts-check
// Backlink diffing shared by Page Links and Question Links (see CONTEXT.md's
// Backlink entry and docs/adr/0008). Each kind of link has its own Backlink
// index (`{backlinkPath}/{targetId}/{sourcePageId} -> true`) and its own
// field on the source Page's record listing the targets it last linked to.
// Pure: returns update paths for the caller (the Page module) to apply.

/**
 * @typedef {object} LinkKind
 * @property {string} backlinkPath - Root of this kind's Backlink index
 * @property {string} linksToField - Page record field listing the targets
 */

/** @type {LinkKind} */
export const PAGE_LINKS = { backlinkPath: "backlinks", linksToField: "linksTo" };

/** @type {LinkKind} */
export const QUESTION_LINKS = { backlinkPath: "questionBacklinks", linksToField: "questionLinksTo" };

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
 * each dropped one, nothing for unchanged ones. `linksChanged` says whether
 * the Page's own list of targets needs rewriting.
 * @param {LinkKind} kind
 * @param {string} sourcePageId
 * @param {string[]} previousTargets
 * @param {string[]} nextTargets
 * @returns {{ updates: Record<string, true | null>, linksChanged: boolean }}
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
  const linksChanged = nextTargets.length !== previousTargets.length
    || nextTargets.some((id) => !previousTargets.includes(id));
  return { updates, linksChanged };
}
