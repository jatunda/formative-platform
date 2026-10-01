// pageSSR: the only server-side compute in this project. Firebase Hosting
// rewrites all of /p/** here (see firebase.json). Link-preview crawlers
// (Google Classroom, Slack, iMessage, ...) fetch raw HTML without running
// JavaScript, so a purely client-rendered page would show an identical,
// generic preview for every Page. This function does nothing but inject the
// real per-Page title into <title>/Open Graph tags before handing back the
// same client-rendered shell every other content page in this app uses -
// page-view.js still does the actual content fetch+render client-side.
// See docs/adr/0004-page-rendering-and-link-previews.md.
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

const SLUG_PATH_PATTERN = /\/p\/([^/]+)\/?$/;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderShell({ title, description }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
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
  <script type="module" src="/page-view.js"></script>
</head>
<body>
  <div id="content">
    <p class="loading-text">Loading...</p>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</body>
</html>`;
}

exports.pageSSR = onRequest(async (req, res) => {
  res.set("Cache-Control", "public, max-age=300");

  const match = req.path.match(SLUG_PATH_PATTERN);
  const slug = match ? decodeURIComponent(match[1]) : null;

  if (!slug) {
    res.status(404).send(renderShell({ title: "Page not found", description: "" }));
    return;
  }

  const slugSnap = await db.ref(`slugIndex/${slug}`).get();
  if (!slugSnap.exists()) {
    res.status(404).send(renderShell({ title: "Page not found", description: "" }));
    return;
  }

  const pageId = slugSnap.val();
  const titleSnap = await db.ref(`pages/${pageId}/title`).get();
  const title = titleSnap.exists() ? titleSnap.val() : "Untitled Page";

  res.status(200).send(renderShell({ title, description: title }));
});

// practiceSetSSR: the exact same SSR-shell-for-link-previews role as
// pageSSR above, for /practice/<slug> instead of /p/<slug>. Resolves against
// practiceSetSlugIndex/practiceSets (its own namespace, not slugIndex/pages -
// see docs/adr/0011) and hands back a shell pointing at practice-view.js,
// which still does the actual fetch+render client-side.
const PRACTICE_SET_SLUG_PATH_PATTERN = /\/practice\/([^/]+)\/?$/;

function renderPracticeSetShell({ title, description }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
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
  <script type="module" src="/practice-view.js"></script>
</head>
<body>
  <h1 id="practiceSetTitle"></h1>
  <div id="content">
    <p class="loading-text">Loading...</p>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</body>
</html>`;
}

exports.practiceSetSSR = onRequest(async (req, res) => {
  res.set("Cache-Control", "public, max-age=300");

  const match = req.path.match(PRACTICE_SET_SLUG_PATH_PATTERN);
  const slug = match ? decodeURIComponent(match[1]) : null;

  if (!slug) {
    res.status(404).send(renderPracticeSetShell({ title: "Practice set not found", description: "" }));
    return;
  }

  const slugSnap = await db.ref(`practiceSetSlugIndex/${slug}`).get();
  if (!slugSnap.exists()) {
    res.status(404).send(renderPracticeSetShell({ title: "Practice set not found", description: "" }));
    return;
  }

  const practiceSetId = slugSnap.val();
  const titleSnap = await db.ref(`practiceSets/${practiceSetId}/title`).get();
  const title = titleSnap.exists() ? titleSnap.val() : "Untitled Practice Set";

  res.status(200).send(renderPracticeSetShell({ title, description: title }));
});
