// One-off cleanup: removes every Backlink entry - Page Backlinks
// (`backlinks/{pageId}/{sourcePageId}`) and Question Backlinks
// (`questionBacklinks/{questionId}/{sourcePageId}`) - that its source Page's
// current content doesn't back up: the source Page no longer exists, or no
// longer links to the target. Before Page deletes (2026-10) and Page saves
// (2026-10-22) kept both indexes exact, deleting a Page or removing a link
// in an edit left entries behind, so delete/remove confirms kept warning
// about Pages that no longer link there.
//
// Dry run by default - prints what it would remove and writes nothing:
//   node scripts/cleanBacklinks.js
// Actually remove them (one atomic multi-path update):
//   node scripts/cleanBacklinks.js --apply

const path = require("path");
const { pathToFileURL } = require("url");
const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const apply = process.argv.includes("--apply");

const read = async (refPath) => (await db.ref(refPath).once("value")).val() || {};
const plural = (n) => `entr${n === 1 ? "y" : "ies"}`;

(async () => {
  const { PAGE_LINKS, QUESTION_LINKS, staleBacklinkRemovals } = await import(
    pathToFileURL(path.join(__dirname, "../web/backlinks.js")).href
  );

  const [pages, slugIndex, questionSlugIndex, backlinks, questionBacklinks] = await Promise.all([
    read("pages"),
    read("slugIndex"),
    read("questionSlugIndex"),
    read("backlinks"),
    read("questionBacklinks"),
  ]);

  const removals = {
    ...staleBacklinkRemovals(PAGE_LINKS, backlinks, pages, slugIndex),
    ...staleBacklinkRemovals(QUESTION_LINKS, questionBacklinks, pages, questionSlugIndex),
  };
  const paths = Object.keys(removals);

  const countEntries = (index) => Object.values(index)
    .reduce((n, sources) => n + Object.keys(sources || {}).length, 0);
  console.log(`${Object.keys(pages).length} Pages, ${countEntries(backlinks)} Page Backlink entries, ${countEntries(questionBacklinks)} Question Backlink entries.`);
  if (paths.length === 0) {
    console.log("No stale Backlink entries - nothing to do.");
    process.exit(0);
  }
  console.log(`${paths.length} stale ${plural(paths.length)} (source Page gone or no longer links there):`);
  for (const p of paths) console.log(`  ${p}`);

  if (!apply) {
    console.log("\nDry run - nothing written. Re-run with --apply to remove them.");
    process.exit(0);
  }
  await db.ref().update(removals);
  console.log(`\nRemoved ${paths.length} ${plural(paths.length)}.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
