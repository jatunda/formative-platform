// The deployed function is the esbuild bundle (see bundle.js), not the
// source. These tests build it and send requests through its exported Cloud
// Functions, so a bundle that drops code or breaks the wrapper fails here
// instead of in production.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { bundle } = require("../bundle");
const { handlePageRequest, handlePracticeSetRequest } = require("../preview-handler");

const DB = "https://formative-platform-default-rtdb.firebaseio.com";
const DATA = {
  [`${DB}/practiceSetSlugIndex/unit-3.json`]: "-Nps1",
  [`${DB}/practiceSets/-Nps1/title.json`]: "Unit 3 Practice",
  [`${DB}/slugIndex/syllabus.json`]: "-Npage1",
  [`${DB}/pages/-Npage1/title.json`]: "Syllabus",
};

// The source handlers' fetchJson, and the global fetch the bundle's adapter
// calls, both read from DATA.
const readData = async (url) => (url in DATA ? DATA[url] : null);

let outDir;
let deployed;
const realFetch = globalThis.fetch;

before(async () => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), "functions-bundle-"));
  const outfile = path.join(outDir, "index.js");
  await bundle({ outfile });
  deployed = require(outfile);
  globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: () => readData(url),
  });
});

after(() => {
  globalThis.fetch = realFetch;
  fs.rmSync(outDir, { recursive: true, force: true });
});

// Drives one request through an exported Cloud Function and records what it
// sends back. Only what the onRequest wrapper and index.js's adapter
// actually touch is stubbed.
async function serve(cloudFunction, requestPath) {
  const req = { path: requestPath };
  return new Promise((resolve, reject) => {
    const sent = { headers: {} };
    const res = {
      set(headers) { Object.assign(sent.headers, headers); return res; },
      status(code) { sent.status = code; return res; },
      send(body) { sent.body = body; resolve(sent); return res; },
    };
    Promise.resolve(cloudFunction(req, res)).catch(reject);
  });
}

for (const [name, handle, requestPath] of [
  ["practiceSetSSR", handlePracticeSetRequest, "/practice/unit-3"],
  ["practiceSetSSR", handlePracticeSetRequest, "/practice/no-such-set"],
  ["pageSSR", handlePageRequest, "/p/syllabus"],
  ["pageSSR", handlePageRequest, "/p/no-such-page"],
]) {
  test(`the bundled ${name} answers ${requestPath} exactly like the source`, async () => {
    const expected = await handle(requestPath, readData);

    const sent = await serve(deployed[name], requestPath);

    assert.equal(sent.status, expected.status);
    assert.deepEqual(sent.headers, expected.headers);
    assert.equal(sent.body, expected.body);
  });
}
