// Database Utility Functions
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_LESSON_TITLE, UNTITLED_LESSON } from "./constants.js";
import { createErrorHandler } from "./validation-utils.js";

let db; // Database reference will be set by initializeDatabase

// Initialize database reference
export function initializeDatabase(database) {
  if (!database) {
    throw new Error("Database instance is required for initialization");
  }
  db = database;
}

// Get schedule for a specific day
export async function getScheduleForDay(classId, dayIndex) {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  try {
    const snap = await get(ref(db, `schedule/${classId}/${dayIndex}`));
    return snap.val() || [];
  } catch (error) {
    console.error(`Failed to get schedule for class ${classId}, day ${dayIndex}:`, error);
    throw new Error(`Unable to load schedule. Please try again.`);
  }
}

// Update schedule for a specific day
export async function updateScheduleForDay(classId, dayIndex, lessons) {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  try {
    const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
    await set(dayRef, lessons);
  } catch (error) {
    console.error(`Failed to update schedule for class ${classId}, day ${dayIndex}:`, error);
    throw new Error(`Unable to save schedule. Please try again.`);
  }
}

// Get full schedule for a class
export async function getFullSchedule(classId) {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  try {
    const snap = await get(ref(db, `schedule/${classId}`));
    return snap.exists() ? snap.val() : {};
  } catch (error) {
    console.error(`Failed to get full schedule for class ${classId}:`, error);
    throw new Error(`Unable to load full schedule. Please try again.`);
  }
  return snap.val() || {};
}

// Get lesson data from database
export async function getLessonFromDB(hash) {
  const snap = await get(ref(db, `content/${hash}`));
  return snap.exists() ? snap.val() : null;
}

// Get lesson title from database
export async function getLessonTitleFromDB(hash) {
  const snap = await get(ref(db, `content/${hash}/title`));
  return snap.exists() ? snap.val() : UNTITLED_LESSON;
}

// Create a new lesson in the database
export async function createNewLesson(title = DEFAULT_LESSON_TITLE) {
  const hash = await generateUniqueHash();
  await set(ref(db, `content/${hash}`), { title });
  return hash;
}

// Generate a unique hash for new lessons
export async function generateUniqueHash() {
  let hash;
  let exists = true;
  while (exists) {
    hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const snap = await get(ref(db, `content/${hash}`));
    exists = snap.exists();
  }
  return hash;
}

// Get all classes
export async function getClasses() {
  const snap = await get(ref(db, "classes"));
  return snap.val();
}

// Get all content (for lesson linking popup)
export async function getAllContent() {
  const snap = await get(ref(db, "content"));
  return snap.exists() ? snap.val() : null;
}

// Add lesson to a specific day
export async function addLessonToSchedule(classId, dayIndex, lessonHash) {
  const lessons = await getScheduleForDay(classId, dayIndex);
  lessons.push(lessonHash);
  await updateScheduleForDay(classId, dayIndex, lessons);
}

// Remove lesson from a specific position
export async function removeLessonFromSchedule(classId, dayIndex, lessonIndex) {
  const lessons = await getScheduleForDay(classId, dayIndex);
  lessons.splice(lessonIndex, 1);
  await updateScheduleForDay(classId, dayIndex, lessons);
}

// Move lesson within the same day
export async function moveLessonInSchedule(classId, dayIndex, fromIndex, toIndex) {
  const lessons = await getScheduleForDay(classId, dayIndex);
  if (toIndex < 0 || toIndex >= lessons.length) return false;
  
  const [moved] = lessons.splice(fromIndex, 1);
  lessons.splice(toIndex, 0, moved);
  await updateScheduleForDay(classId, dayIndex, lessons);
  return true;
}

// Move lesson between days (drag and drop)
export async function moveLessonBetweenDays(classId, fromDayIndex, fromLessonIndex, toDayIndex) {
  // Get lessons from both days
  const fromLessons = await getScheduleForDay(classId, fromDayIndex);
  const toLessons = await getScheduleForDay(classId, toDayIndex);
  
  // Remove from source day
  const [lessonHash] = fromLessons.splice(fromLessonIndex, 1);
  
  // Add to target day
  toLessons.push(lessonHash);
  
  // Update both days
  await updateScheduleForDay(classId, fromDayIndex, fromLessons);
  await updateScheduleForDay(classId, toDayIndex, toLessons);
  
  return lessonHash;
}

// Date offset functions
export async function getClassDateOffset(classId) {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  try {
    const snap = await get(ref(db, `classes/${classId}/dateOffset`));
    return snap.exists() ? snap.val() : 0; // Default offset is 0
  } catch (error) {
    console.error(`Failed to get date offset for class ${classId}:`, error);
    throw new Error(`Unable to load date offset. Please try again.`);
  }
}

export async function setClassDateOffset(classId, offset) {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  try {
    await set(ref(db, `classes/${classId}/dateOffset`), Number(offset));
  } catch (error) {
    console.error(`Failed to set date offset for class ${classId}:`, error);
    throw new Error(`Unable to save date offset. Please try again.`);
  }
}

// Insert new empty day at index (shifts other days up)
export async function insertDayAt(classId, index, maxDayIndex) {
  // Shift all days >= index up by 1
  for (let i = maxDayIndex; i >= index; i--) {
    const fromRef = ref(db, `schedule/${classId}/${i}`);
    const toRef = ref(db, `schedule/${classId}/${i + 1}`);
    const snap = await get(fromRef);
    if (snap.exists()) {
      await set(toRef, snap.val());
    } else {
      await set(toRef, []);
    }
  }
  // Set the new day to empty
  await set(ref(db, `schedule/${classId}/${index}`), []);
}
