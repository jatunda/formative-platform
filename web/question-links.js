// Shared pattern for Question Links: [[q:slug]], [[q:slug|text]]. A Question
// Link is the Question equivalent of a Page Link, but lives in its own
// namespace/syntax (docs/adr/0011) since Questions keep a separate
// questionSlugIndex from Pages' slugIndex. Used both to render them
// (content-renderer.js, via question-embed.js) and to index/rewrite them for
// Question Backlinks (question-database-utils.js), so the two can never
// drift apart on what counts as a Question Link. See CONTEXT.md's Question
// Link entry and docs/adr/0010-questions-are-linked-not-inline.md.
//
// Unlike PAGE_LINK_PATTERN, there is no `[[q:slug#Header]]` form - a Question
// has no headers of its own to jump to, only the stem+Options it renders as
// a whole.
export const QUESTION_LINK_PATTERN = /\[\[q:([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]]+))?\]\]/g;

/**
 * Normalize a single [[q:...]] match's captured groups.
 * @returns {{slug: string, display: string|null}}
 */
export function parseQuestionLinkMatch(slugGroup, displayGroup) {
  return {
    slug: slugGroup,
    display: displayGroup ? displayGroup.trim() : null,
  };
}

function walkTextValues(contentItems, visit) {
  for (const item of contentItems || []) {
    if (item.type === "text") {
      visit(item.value);
    } else if (item.type === "collapsible") {
      walkTextValues(item.content, visit);
    }
  }
}

/**
 * Every distinct Question Slug referenced via a Question Link anywhere in
 * this content, including inside collapsibles. Used to maintain the Question
 * Backlink index on save (Page content only - see docs/adr's Question
 * Backlinks scope note).
 * @param {{title: string, blocks: Array}} parsedContent
 * @returns {string[]}
 */
export function extractQuestionLinkSlugs(parsedContent) {
  const slugs = new Set();
  for (const block of (parsedContent && parsedContent.blocks) || []) {
    walkTextValues(block.content, (text) => {
      for (const match of text.matchAll(QUESTION_LINK_PATTERN)) {
        const { slug } = parseQuestionLinkMatch(match[1], match[2]);
        if (slug) slugs.add(slug);
      }
    });
  }
  return [...slugs];
}

/**
 * Replace every `[[q:oldSlug` Question Link reference with `[[q:newSlug`,
 * without touching an unrelated slug that happens to share a prefix. Returns
 * a new content object; does not mutate the input. Used when a Question's
 * Slug is renamed, to fix up every Page that links to it.
 * @param {{title: string, blocks: Array}} parsedContent
 * @param {string} oldSlug
 * @param {string} newSlug
 * @returns {{title: string, blocks: Array}}
 */
export function rewriteQuestionSlugInContent(parsedContent, oldSlug, newSlug) {
  const boundaryPattern = new RegExp(`\\[\\[q:${oldSlug}(?=[\\]|])`, "g");

  function rewriteItems(items) {
    return (items || []).map((item) => {
      if (item.type === "text") {
        return { ...item, value: item.value.replace(boundaryPattern, `[[q:${newSlug}`) };
      }
      if (item.type === "collapsible") {
        return { ...item, content: rewriteItems(item.content) };
      }
      return item;
    });
  }

  return {
    ...parsedContent,
    blocks: ((parsedContent && parsedContent.blocks) || []).map((block) => ({
      ...block,
      content: rewriteItems(block.content),
    })),
  };
}
