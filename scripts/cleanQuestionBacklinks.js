// One-off cleanup: removes every Question Backlink entry
// (`questionBacklinks/{questionId}/{pageId}`) that points at a Page that no
// longer exists. Before Page deletion cleared these (2026-10), deleting a
// Page left its entries behind, so the Question editor's delete/remove
// confirms kept warning about Pages that were gone.
//
// Dry run by default - prints what it would remove and writes nothing:
//   node scripts/cleanQuestionBacklinks.js
// Actually remove them (one atomic multi-path update):
//   node scripts/cleanQuestionBacklinks.js --apply

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

(async () => {
  const { questionBacklinkRemovals } = await import(
    pathToFileURL(path.join(__dirname, "../web/question-backlinks.js")).href
  );

  const [pagesSnap, backlinksSnap] = await Promise.all([
    db.ref("pages").once("value"),
    db.ref("questionBacklinks").once("value"),
  ]);
  const pages = pagesSnap.val() || {};
  const index = backlinksSnap.val() || {};

  const totalEntries = Object.values(index)
    .reduce((n, sources) => n + Object.keys(sources || {}).length, 0);
  const removals = questionBacklinkRemovals(index, (pageId) => !(pageId in pages));
  const paths = Object.keys(removals);

  console.log(`${Object.keys(pages).length} Pages, ${Object.keys(index).length} Questions with Backlinks, ${totalEntries} Question Backlink entries.`);
  if (paths.length === 0) {
    console.log("No stale Question Backlink entries - nothing to do.");
    process.exit(0);
  }
  console.log(`${paths.length} stale entr${paths.length === 1 ? "y" : "ies"} (Page no longer exists):`);
  for (const p of paths) console.log(`  ${p}`);

  if (!apply) {
    console.log("\nDry run - nothing written. Re-run with --apply to remove them.");
    process.exit(0);
  }
  await db.ref().update(removals);
  console.log(`\nRemoved ${paths.length} entr${paths.length === 1 ? "y" : "ies"}.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
