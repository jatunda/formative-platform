// public/landing.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { initializeDateUtils, getTodayDayIndex } from './date-utils.js';

const app = initializeApp({
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

// Initialize date utilities with database
initializeDateUtils(db);

async function getAvailableClasses() {
  // OPTIMIZATION: Only fetch class names and displayOrder, not full class data
  const classesSnap = await get(ref(db, "classes"));
  const classes = classesSnap.val() || {};

  // Prepare promises to fetch today's schedule for each class (with proper offset calculation)
  const classEntries = Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder);

  const schedulePromises = classEntries.map(async ([classId]) => {
    // Calculate today's day index for this specific class (accounting for its offset)
    const todayDayIndex = await getTodayDayIndex(classId);
    console.log(`Class ${classId} - Today's day index: ${todayDayIndex}`);
    
    // OPTIMIZATION: Only fetch today's schedule, not full schedule
    const snap = await get(ref(db, `schedule/${classId}/${todayDayIndex}`));
    return {
      classId,
      dayIndex: todayDayIndex,
      schedule: snap.val() || []
    };
  });

  const schedules = await Promise.all(schedulePromises);

  const container = document.getElementById("class-list");
  container.innerHTML = ""; // Clear previous content

  schedules.forEach(({ classId, dayIndex, schedule }) => {
    const classData = classes[classId];
    
    if (Array.isArray(schedule) && schedule.length > 0) {
      // Class has lessons today - show as clickable link
      const link = document.createElement("a");
      link.textContent = classData.name;
      link.className = "class-link";
      link.href = `view.html?class=${classId}&day=${dayIndex}`;
      container.appendChild(link);
    } else {
      // Class exists but has no lessons today - show as inactive text
      const item = document.createElement("div");
      item.textContent = `${classData.name} - nothing today`;
      item.className = "class-link-inactive";
      container.appendChild(item);
    }
  });
}

getAvailableClasses();
