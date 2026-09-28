// Shared pattern for Obsidian-style [[...]] links: [[slug]], [[slug|text]],
// [[#Header]], [[#Header|text]]. Used both to render them (content-renderer.js)
// and to index/rewrite them for Backlinks (page-database-utils.js), so the
// two can never drift apart on what counts as a Page Link. See CONTEXT.md's
// Page Link / Section Link / Backlink entries and
// docs/adr/0007-links-are-static-text-not-resolved-identifiers.md.
export const PAGE_LINK_PATTERN = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/**
 * Normalize a single [[...]] match's captured groups. The `[[slug#Header]]`
 * cross-page-to-header form (both slug and header present) is deliberately
 * unsupported - it's treated as a Page Link to `slug`, ignoring the header.
 * @returns {{slug: string|null, header: string|null, display: string|null}}
 */
export function parsePageLinkMatch(slugGroup, headerGroup, displayGroup) {
  const slug = slugGroup ? slugGroup : null;
  return {
    slug,
    header: slug ? null : (headerGroup ? headerGroup.trim() : null),
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
 * Every distinct Slug referenced via a Page Link (the `[[slug]]` form)
 * anywhere in this content, including inside collapsibles - not the
 * `[[#Header]]` Section Link form, which has no slug. Used to maintain the
 * Backlink index on save.
 * @param {{title: string, blocks: Array}} parsedContent
 * @returns {string[]}
 */
export function extractPageLinkSlugs(parsedContent) {
  const slugs = new Set();
  for (const block of (parsedContent && parsedContent.blocks) || []) {
    walkTextValues(block.content, (text) => {
      for (const match of text.matchAll(PAGE_LINK_PATTERN)) {
        const { slug } = parsePageLinkMatch(match[1], match[2], match[3]);
        if (slug) slugs.add(slug);
      }
    });
  }
  return [...slugs];
}

/**
 * Replace every `[[oldSlug` Page Link reference with `[[newSlug`, without
 * touching an unrelated slug that happens to share a prefix (e.g. renaming
 * "syllabus" must not touch "syllabus-2026") - Slugs are validated to
 * lowercase-alphanumeric-and-hyphens only, so no regex escaping is needed.
 * Returns a new content object; does not mutate the input. Used by Slug
 * Rename to fix up every Page that links to the renamed Page.
 * @param {{title: string, blocks: Array}} parsedContent
 * @param {string} oldSlug
 * @param {string} newSlug
 * @returns {{title: string, blocks: Array}}
 */
export function rewriteSlugInContent(parsedContent, oldSlug, newSlug) {
  const boundaryPattern = new RegExp(`\\[\\[${oldSlug}(?=[\\]|#])`, "g");

  function rewriteItems(items) {
    return (items || []).map((item) => {
      if (item.type === "text") {
        return { ...item, value: item.value.replace(boundaryPattern, `[[${newSlug}`) };
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
