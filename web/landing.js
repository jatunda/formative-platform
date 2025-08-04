// public/landing.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { initializeDateUtils, getTodayDayIndex } from './date-utils.js';

console.log("Landing.js loaded - initializing Firebase...");

// Test with a more permissive configuration
const app = initializeApp({
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

console.log("Firebase initialized, database:", db);
console.log("Database URL:", app.options.databaseURL);

// Initialize date utilities with database
initializeDateUtils(db);

async function getAvailableClasses() {
  try {
    // Check if database is properly initialized
    if (!db) {
      throw new Error("Database not initialized");
    }
    
    // OPTIMIZATION: Fetch classes and calculate today's day indices first
    console.log("Fetching classes from database...");
    const classesSnap = await get(ref(db, "classes"));
    
    if (!classesSnap.exists()) {
      console.warn("Classes node does not exist in database");
      return [];
    }
    
    const classes = classesSnap.val() || {};
    console.log("Classes data:", classes);

    if (Object.keys(classes).length === 0) {
      console.warn("No classes found in database");
      return [];
    }

    const classEntries = Object.entries(classes)
      .sort(([, a], [, b]) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Calculate today's day index for each class in parallel
    console.log("Calculating day indices for", classEntries.length, "classes");
    const dayIndexPromises = classEntries.map(async ([classId]) => {
      try {
        const todayDayIndex = await getTodayDayIndex(classId);
        return { classId, todayDayIndex };
      } catch (error) {
        console.error(`Error getting day index for class ${classId}:`, error);
        return { classId, todayDayIndex: 0 };
      }
    });

  const dayIndexResults = await Promise.all(dayIndexPromises);

  // Build paths for batch fetch of all today's schedules
  const schedulePaths = dayIndexResults.map(({ classId, todayDayIndex }) => 
    `schedule/${classId}/${todayDayIndex}`
  );

  // OPTIMIZATION: Batch fetch all schedules at once
  const schedulePromises = schedulePaths.map(path => get(ref(db, path)));
  const scheduleSnaps = await Promise.all(schedulePromises);

  // Combine results
  const schedules = dayIndexResults.map(({ classId, todayDayIndex }, index) => ({
    classId,
    dayIndex: todayDayIndex,
    schedule: scheduleSnaps[index].val() || []
  }));

  const container = document.getElementById("class-list");
  
  // Hide loading state
  const loadingState = document.getElementById("loading-state");
  if (loadingState) {
    loadingState.style.display = "none";
  }
  
  // Clear any existing content and add the actual class list
  container.innerHTML = "";

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
  } catch (error) {
    console.error("Error in getAvailableClasses:", error);
    throw error; // Re-throw to be handled by loadWithErrorHandling
  }
}

async function loadWithErrorHandling() {
  try {
    await getAvailableClasses();
  } catch (error) {
    console.error("Error loading classes:", error);
    
    // Show error state
    const container = document.getElementById("class-list");
    const loadingState = document.getElementById("loading-state");
    
    if (loadingState) {
      loadingState.style.display = "none";
    }
    
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #e53e3e;">
        <h3>Unable to load lessons</h3>
        <p style="color: #a0aec0; margin-bottom: 1rem;">There was a problem connecting to the server.</p>
        <button onclick="location.reload()" style="width: auto; padding: 0.5rem 1rem;">
          Try Again
        </button>
      </div>
    `;
  }
}

loadWithErrorHandling();
