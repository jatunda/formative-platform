// pageSSR / practiceSetSSR: the only server-side compute in this project.
// Firebase Hosting rewrites /p/** and /practice/** here (see firebase.json).
// Link-preview crawlers (Google Classroom, Slack, iMessage, ...) fetch raw
// HTML without running JavaScript, so a purely client-rendered page would
// show an identical, generic preview for every Page. These functions only
// inject the real title into <title>/Open Graph tags before handing back the
// client-rendered shell; the browser still fetches and renders the content.
// See docs/adr/0004-page-rendering-and-link-previews.md.
//
// This file is only the Cloud Functions adapter. Request handling lives in
// preview-handler.js as pure functions (tested in test/), and reads the
// public database over REST with plain fetch rather than firebase-admin,
// to keep cold starts small.
const { onRequest } = require("firebase-functions/v2/https");
const { handlePageRequest, handlePracticeSetRequest } = require("./preview-handler");

// A missing path reads as JSON null. Any non-2xx response throws, so a
// database outage surfaces as an (uncached) 500 instead of a false 404.
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Database REST read failed: ${response.status} ${url}`);
  }
  return response.json();
}

function adapt(handle) {
  return onRequest(async (req, res) => {
    const { status, headers, body } = await handle(req.path, fetchJson);
    res.set(headers);
    res.status(status).send(body);
  });
}

exports.pageSSR = adapt(handlePageRequest);
exports.practiceSetSSR = adapt(handlePracticeSetRequest);
