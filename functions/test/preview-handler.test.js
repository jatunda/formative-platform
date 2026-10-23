const { test } = require("node:test");
const assert = require("node:assert/strict");
const { handlePageRequest, handlePracticeSetRequest } = require("../preview-handler");

const DB = "https://formative-platform-default-rtdb.firebaseio.com";

// Fake JSON fetch over an in-memory copy of the database, keyed by REST URL.
function fakeFetchJson(data) {
  return async (url) => (url in data ? data[url] : null);
}

test("a found Practice Set gets 200 with its title", async () => {
  const fetchJson = fakeFetchJson({
    [`${DB}/practiceSetSlugIndex/unit-3.json`]: "ps1",
    [`${DB}/practiceSets/ps1/title.json`]: "Unit 3 Practice",
  });
  const res = await handlePracticeSetRequest("/practice/unit-3", fetchJson);
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Unit 3 Practice<\/title>/);
});

function foundPracticeSet(title = "Unit 3 Practice") {
  return fakeFetchJson({
    [`${DB}/practiceSetSlugIndex/unit-3.json`]: "-Nps1",
    [`${DB}/practiceSets/-Nps1/title.json`]: title,
  });
}

test("a found Practice Set is cached for a day at the CDN", async () => {
  const res = await handlePracticeSetRequest("/practice/unit-3", foundPracticeSet());
  assert.equal(res.headers["Cache-Control"], "public, max-age=300, s-maxage=86400");
});

test("a found Practice Set's shell carries its id as a body data attribute", async () => {
  const res = await handlePracticeSetRequest("/practice/unit-3/", foundPracticeSet());
  assert.match(res.body, /<body data-practice-set-id="-Nps1">/);
});

test("an unknown Practice Set Slug gets an uncached 404 with no id", async () => {
  const res = await handlePracticeSetRequest("/practice/nope", foundPracticeSet());
  assert.equal(res.status, 404);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.match(res.body, /<title>Practice set not found<\/title>/);
  assert.doesNotMatch(res.body, /data-practice-set-id/);
});

test("a /practice path with no Slug gets an uncached 404 without reading the database", async () => {
  const res = await handlePracticeSetRequest("/practice/", async () => {
    throw new Error("should not fetch");
  });
  assert.equal(res.status, 404);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("a Practice Set shell preconnects to the database host, so the browser's first read starts sooner", async () => {
  const found = await handlePracticeSetRequest("/practice/unit-3", foundPracticeSet());
  const notFound = await handlePracticeSetRequest("/practice/nope", foundPracticeSet());
  for (const res of [found, notFound]) {
    assert.match(res.body, /<link rel="preconnect" href="https:\/\/formative-platform-default-rtdb\.firebaseio\.com" crossorigin>/);
  }
});

test("a found Practice Set's frame already shows its title, so nothing moves when the page loads", async () => {
  const res = await handlePracticeSetRequest("/practice/unit-3", foundPracticeSet('a < b'));
  assert.match(res.body, /<h1 id="practiceSetTitle">a &lt; b<\/h1>/);
});

test("the not-found Practice Set shell leaves the frame's title empty", async () => {
  const res = await handlePracticeSetRequest("/practice/nope", foundPracticeSet());
  assert.match(res.body, /<h1 id="practiceSetTitle"><\/h1>/);
});

test("a Page shell gets no Practice Set frame or database preconnect", async () => {
  const res = await handlePageRequest("/p/loops", foundPage());
  assert.doesNotMatch(res.body, /practiceSetTitle|preconnect/);
});

test("a Practice Set title with <, \" and & is HTML-escaped", async () => {
  const res = await handlePracticeSetRequest("/practice/unit-3", foundPracticeSet('a < b & "c"'));
  assert.match(res.body, /<title>a &lt; b &amp; &quot;c&quot;<\/title>/);
  assert.match(res.body, /<meta property="og:title" content="a &lt; b &amp; &quot;c&quot;">/);
  assert.doesNotMatch(res.body, /a < b/);
});

test("a found Practice Set with no title falls back to a generic title", async () => {
  const fetchJson = fakeFetchJson({ [`${DB}/practiceSetSlugIndex/unit-3.json`]: "-Nps1" });
  const res = await handlePracticeSetRequest("/practice/unit-3", fetchJson);
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Untitled Practice Set<\/title>/);
});

test("the Slug is URL-encoded into the REST path", async () => {
  const fetchJson = fakeFetchJson({
    [`${DB}/practiceSetSlugIndex/caf%C3%A9.json`]: "-Nps1",
    [`${DB}/practiceSets/-Nps1/title.json`]: "Cafe",
  });
  const res = await handlePracticeSetRequest("/practice/caf%C3%A9", fetchJson);
  assert.equal(res.status, 200);
});

function foundPage(title = "Loops") {
  return fakeFetchJson({
    [`${DB}/slugIndex/loops.json`]: "-Npg1",
    [`${DB}/pages/-Npg1/title.json`]: title,
  });
}

test("a found Page gets 200, a day-long CDN cache, and the page-view shell", async () => {
  const res = await handlePageRequest("/p/loops", foundPage());
  assert.equal(res.status, 200);
  assert.equal(res.headers["Cache-Control"], "public, max-age=300, s-maxage=86400");
  assert.match(res.body, /<title>Loops<\/title>/);
  assert.match(res.body, /<meta property="og:description" content="Loops">/);
  assert.match(res.body, /<script type="module" src="\/page-view.js"><\/script>/);
});

test("an unknown Page Slug or a bare /p/ gets an uncached 404", async () => {
  for (const path of ["/p/nope", "/p/"]) {
    const res = await handlePageRequest(path, foundPage());
    assert.equal(res.status, 404);
    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.match(res.body, /<title>Page not found<\/title>/);
  }
});

test("a Page title with <, \" and & is HTML-escaped", async () => {
  const res = await handlePageRequest("/p/loops", foundPage('a < b & "c"'));
  assert.match(res.body, /<title>a &lt; b &amp; &quot;c&quot;<\/title>/);
});

test("a found Page with no title falls back to a generic title", async () => {
  const res = await handlePageRequest("/p/loops", fakeFetchJson({ [`${DB}/slugIndex/loops.json`]: "-Npg1" }));
  assert.match(res.body, /<title>Untitled Page<\/title>/);
});
