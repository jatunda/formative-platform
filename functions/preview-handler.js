// Pure request handling for the link-preview functions (pageSSR,
// practiceSetSSR in index.js). Each handler takes the request path plus an
// injected JSON-fetch function and returns { status, headers, body } - no
// Cloud Functions or firebase-admin types - so it can be tested with a fake
// fetch and moved unchanged to another runtime (e.g. a Cloudflare Worker).
// See docs/adr/0004-page-rendering-and-link-previews.md.

const DATABASE_URL = "https://formative-platform-default-rtdb.firebaseio.com";

// Found shells carry only preview metadata (everything a visitor sees is
// fetched live by the browser), so the CDN keeps them a day; browsers keep
// them 5 minutes. "Not found" is never cached, so a link shared before its
// target exists starts working as soon as it does.
const FOUND_CACHE_CONTROL = "public, max-age=300, s-maxage=86400";
const NOT_FOUND_CACHE_CONTROL = "no-store";

/** @typedef {(url: string) => Promise<unknown>} FetchJson */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Database REST URL (public read, per database.rules.json), each segment
// URL-encoded.
function restUrl(...segments) {
  return `${DATABASE_URL}/${segments.map(encodeURIComponent).join("/")}.json`;
}

function slugFromPath(path, pattern) {
  const match = path.match(pattern);
  return match ? decodeURIComponent(match[1]) : null;
}

// The same client-rendered shell every content page uses, with the real
// title injected for crawlers. Every interpolated value is HTML-escaped.
function renderShell({ title, description, script, bodyData, headExtra, bodyPrefix }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const bodyAttrs = Object.entries(bodyData)
    .map(([name, value]) => ` data-${name}="${escapeHtml(value)}"`)
    .join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="stylesheet" href="/style.css">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-dark.min.css" rel="stylesheet">
${headExtra}  <script type="module" src="${script}"></script>
</head>
<body${bodyAttrs}>${bodyPrefix}
  <div id="content">
    <p class="loading-text">Loading...</p>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</body>
</html>`;
}

/**
 * Builds a handler for one route: Slug from the path -> id via the slug
 * index -> title -> shell. Not found (no Slug, or Slug not in the index)
 * is a 404 that is never cached.
 */
function previewHandler({ pathPattern, slugIndex, collection, notFoundTitle, untitled, script, frame, idDataName }) {
  /**
   * @param {string} path request path, e.g. "/practice/unit-3"
   * @param {FetchJson} fetchJson resolves a REST URL to its parsed JSON (null if absent)
   * @returns {Promise<{ status: number, headers: Record<string, string>, body: string }>}
   */
  return async function handle(path, fetchJson) {
    const slug = slugFromPath(path, pathPattern);
    const id = slug ? await fetchJson(restUrl(slugIndex, slug)) : null;
    if (typeof id !== "string") {
      return {
        status: 404,
        headers: { "Cache-Control": NOT_FOUND_CACHE_CONTROL },
        body: renderShell({ title: notFoundTitle, description: "", script, bodyData: {}, ...frame("") }),
      };
    }
    const stored = await fetchJson(restUrl(collection, id, "title"));
    const storedTitle = typeof stored === "string" ? stored : "";
    const title = storedTitle || untitled;
    const bodyData = idDataName ? { [idDataName]: id } : {};
    return {
      status: 200,
      headers: { "Cache-Control": FOUND_CACHE_CONTROL },
      body: renderShell({ title, description: title, script, bodyData, ...frame(storedTitle) }),
    };
  };
}

const handlePageRequest = previewHandler({
  pathPattern: /\/p\/([^/]+)\/?$/,
  slugIndex: "slugIndex",
  collection: "pages",
  notFoundTitle: "Page not found",
  untitled: "Untitled Page",
  script: "/page-view.js",
  frame: () => ({ headExtra: "", bodyPrefix: "" }),
});

// Practice Sets resolve in their own namespace (see docs/adr/0011). The
// Practice Set id rides on <body data-practice-set-id="...">, so the browser
// reads document.body.dataset.practiceSetId and skips the Slug lookup
// without parsing the title. It is absent on the "not found" shell.
// The shell also carries the page frame's title (empty when not found or
// untitled, matching what the browser then renders, so it never jumps) and
// a preconnect to the database host the browser reads from next.
const handlePracticeSetRequest = previewHandler({
  pathPattern: /\/practice\/([^/]+)\/?$/,
  slugIndex: "practiceSetSlugIndex",
  collection: "practiceSets",
  notFoundTitle: "Practice set not found",
  untitled: "Untitled Practice Set",
  script: "/practice-view.js",
  frame: (frameTitle) => ({
    headExtra: `  <link rel="preconnect" href="${DATABASE_URL}" crossorigin>\n`,
    bodyPrefix: `\n  <h1 id="practiceSetTitle">${escapeHtml(frameTitle)}</h1>`,
  }),
  idDataName: "practice-set-id",
});

module.exports = { handlePageRequest, handlePracticeSetRequest };
