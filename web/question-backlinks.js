// @ts-check
// Pure helpers over the Question Backlink index
// (`questionBacklinks/{questionId}/{sourcePageId} -> true`, see CONTEXT.md's
// Backlink entry and docs/adr/0008). No Firebase imports, so both the web app
// and the Node cleanup scripts in `scripts/` can use them.

/**
 * Every Question Backlink entry whose source Page matches `shouldRemove`,
 * as `questionBacklinks/{questionId}/{pageId}` paths mapped to null - ready
 * to merge into one multi-path `update()`.
 * @param {Record<string, Record<string, unknown>> | null | undefined} questionBacklinks - The whole index
 * @param {(pageId: string) => boolean} shouldRemove
 * @returns {Record<string, null>}
 */
export function questionBacklinkRemovals(questionBacklinks, shouldRemove) {
  /** @type {Record<string, null>} */
  const removals = {};
  for (const [questionId, sourcePages] of Object.entries(questionBacklinks || {})) {
    for (const pageId of Object.keys(sourcePages)) {
      if (shouldRemove(pageId)) {
        removals[`questionBacklinks/${questionId}/${pageId}`] = null;
      }
    }
  }
  return removals;
}
