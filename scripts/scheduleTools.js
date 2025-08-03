// This file just has a few functions for editing the schedule database 

const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const rootRef = db.ref("schedule");

async function fetchClassSchedule(classId) {
  const snap = await rootRef.child(classId).once("value");
  const raw = snap.val() || {};
  return Object.fromEntries(
    Object.entries(raw).map(([day, pages]) => [Number(day), pages || []])
  );
}

async function writeClassSchedule(classId, scheduleObj) {
  await rootRef.child(classId).set(scheduleObj);
}

async function insertPage(classId, dayIndex, pageId, position = null) {
  const schedule = await fetchClassSchedule(classId);
  const pages = schedule[dayIndex] || [];
  const pos = position ?? pages.length;
  pages.splice(pos, 0, pageId);
  schedule[dayIndex] = pages;
  await writeClassSchedule(classId, schedule);
}

async function deletePage(classId, dayIndex, pageIndex) {
  const schedule = await fetchClassSchedule(classId);
  const pages = schedule[dayIndex] || [];
  pages.splice(pageIndex, 1);
  schedule[dayIndex] = pages;
  await writeClassSchedule(classId, schedule);
}

async function movePage(classId, fromDay, fromIndex, toDay, toIndex) {
  const schedule = await fetchClassSchedule(classId);
  const fromPages = schedule[fromDay] || [];
  const toPages = schedule[toDay] || [];

  const [moved] = fromPages.splice(fromIndex, 1);
  toPages.splice(toIndex, 0, moved);

  schedule[fromDay] = fromPages;
  schedule[toDay] = toPages;

  await writeClassSchedule(classId, schedule);
}

module.exports = {
  fetchClassSchedule,
  insertPage,
  deletePage,
  movePage
};
