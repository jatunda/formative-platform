// public/landing.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const app = initializeApp({
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

const today = new Date();
const dayIndex = Math.floor((today - new Date("2025-08-02")) / 86400000); // or however you track days
console.log("landing.js dayindex: %s", dayIndex)

async function getAvailableClasses() {
  // Fetch only class names and displayOrder
  const classesSnap = await get(ref(db, "classes"));
  const classes = classesSnap.val() || {};

  // Prepare promises to fetch only today's schedule for each class
  const classEntries = Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder);

  const schedulePromises = classEntries.map(([classId]) =>
    get(ref(db, `schedule/${classId}/${dayIndex}`)).then(snap => ({
      classId,
      schedule: snap.val() || []
    }))
  );

  const schedules = await Promise.all(schedulePromises);

  const container = document.getElementById("class-list");
  container.innerHTML = ""; // Clear previous content

  schedules.forEach(({ classId, schedule }) => {
    if (Array.isArray(schedule) && schedule.length > 0) {
      const classData = classes[classId];
      const pageCount = schedule.length;
      const btn = document.createElement("button");
      btn.textContent = `${classData.name} (${pageCount} page${pageCount > 1 ? "s" : ""})`;
      btn.onclick = () => {
        window.location.href = `view.html?class=${classId}`;
      };
      container.appendChild(btn);
    }
  });
}

getAvailableClasses();
