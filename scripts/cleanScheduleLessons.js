// One-off cleanup: takes every Lesson that no longer exists out of every
// Class's Schedule (`schedule/{classId}/{dayIndex}`). Before deleting a
// Lesson removed it from the Schedules that used it (2026-10), deleting one
// left its id behind, so those days kept showing an "Untitled Lesson".
// A day left with no Lessons stays as an empty day; no Day Index shifts.
//
// Dry run by default - prints what it would remove and writes nothing:
//   node scripts/cleanScheduleLessons.js
// Actually remove them (one atomic multi-path update):
//   node scripts/cleanScheduleLessons.js --apply

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
  const { scheduleDays, scheduleLessonRemovals } = await import(
    pathToFileURL(path.join(__dirname, "../web/schedule-lessons.js")).href
  );

  // Lessons are stored under `content` (lesson-store.js's private path).
  const [lessonsSnap, schedulesSnap] = await Promise.all([
    db.ref("content").once("value"),
    db.ref("schedule").once("value"),
  ]);
  const lessons = lessonsSnap.val() || {};
  const schedules = schedulesSnap.val() || {};

  const isGone = (lessonId) => !(lessonId in lessons);
  const removals = scheduleLessonRemovals(schedules, isGone);
  const paths = Object.keys(removals);

  console.log(`${Object.keys(lessons).length} Lessons, ${Object.keys(schedules).length} Class Schedules.`);
  if (paths.length === 0) {
    console.log("No Schedule references to deleted Lessons - nothing to do.");
    process.exit(0);
  }

  let references = 0;
  console.log(`${paths.length} day${paths.length === 1 ? "" : "s"} use a Lesson that no longer exists:`);
  for (const [classId, days] of Object.entries(schedules)) {
    for (const { dayIndex, lessonIds } of scheduleDays(days)) {
      const gone = lessonIds.filter(isGone);
      if (gone.length === 0) continue;
      references += gone.length;
      const left = removals[`schedule/${classId}/${dayIndex}`];
      console.log(`  ${classId} Day Index ${dayIndex}: remove ${gone.join(", ")}${left.length === 0 ? " (day left empty)" : ""}`);
    }
  }
  console.log(`${references} reference${references === 1 ? "" : "s"} in total.`);

  if (!apply) {
    console.log("\nDry run - nothing written. Re-run with --apply to remove them.");
    process.exit(0);
  }
  await db.ref().update(removals);
  console.log(`\nRemoved ${references} reference${references === 1 ? "" : "s"} from ${paths.length} day${paths.length === 1 ? "" : "s"}.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
