// Database Utility Functions
import {
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DEFAULT_LESSON_TITLE, UNTITLED_LESSON } from "./constants.js";

let db; // Database reference will be set by initializeDatabase

/**
 * Initialize database reference
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} database - The Firebase database instance
 * @throws {Error} If database instance is not provided
 */
export function initializeDatabase(database) {
  if (!database) {
    throw new Error("Database instance is required for initialization");
  }
  db = database;
}

/**
 * Get schedule for a specific day
 * @param {string} classId - The class ID
 * @param {number} dayIndex - The day index
 * @returns {Promise<string[]>} Array of lesson hashes for the day
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Update schedule for a specific day
 * @param {string} classId - The class ID
 * @param {number} dayIndex - The day index
 * @param {string[]} lessons - Array of lesson hashes
 * @returns {Promise<void>}
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Get full schedule for a class (all days)
 * @param {string} classId - The class ID
 * @returns {Promise<Object<number, string[]>>} Object mapping day indices to arrays of lesson hashes
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Get lesson data from database
 * @param {string} hash - The lesson hash/ID
 * @returns {Promise<Object | null>} The lesson data, or null if not found
 */
export async function getLessonFromDB(hash) {
  const snap = await get(ref(db, `content/${hash}`));
  return snap.exists() ? snap.val() : null;
}

/**
 * Get lesson title from database
 * @param {string} hash - The lesson hash/ID
 * @returns {Promise<string>} The lesson title, or UNTITLED_LESSON if not found
 */
export async function getLessonTitleFromDB(hash) {
  const snap = await get(ref(db, `content/${hash}/title`));
  return snap.exists() ? snap.val() : UNTITLED_LESSON;
}

/**
 * Create a new lesson in the database with a unique hash
 * @param {string} [title=DEFAULT_LESSON_TITLE] - The lesson title
 * @returns {Promise<string>} The generated unique hash for the lesson
 */
export async function createNewLesson(title = DEFAULT_LESSON_TITLE) {
  const hash = await generateUniqueHash();
  await set(ref(db, `content/${hash}`), { title });
  return hash;
}

/**
 * Generate a unique hash for new lessons
 * Continuously generates hashes until one is found that doesn't exist in the database
 * @returns {Promise<string>} A unique 32-character hexadecimal hash
 */
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

/**
 * Get all classes from the database
 * @returns {Promise<Object | null>} Object mapping class IDs to class data, or null if none exist
 */
export async function getClasses() {
  const snap = await get(ref(db, "classes"));
  return snap.val();
}

/**
 * Get all content (for lesson linking popup)
 * @returns {Promise<Object | null>} Object mapping lesson hashes to lesson data, or null if none exist
 */
export async function getAllContent() {
  const snap = await get(ref(db, "content"));
  return snap.exists() ? snap.val() : null;
}

/**
 * Add a lesson to a specific day's schedule
 * @param {string} classId - The class ID
 * @param {number} dayIndex - The day index
 * @param {string} lessonHash - The lesson hash to add
 * @returns {Promise<void>}
 * @throws {Error} If database is not initialized or operation fails
 */
export async function addLessonToSchedule(classId, dayIndex, lessonHash) {
  const lessons = await getScheduleForDay(classId, dayIndex);
  lessons.push(lessonHash);
  await updateScheduleForDay(classId, dayIndex, lessons);
}

/**
 * Remove a lesson from a specific position in a day's schedule
 * @param {string} classId - The class ID
 * @param {number} dayIndex - The day index
 * @param {number} lessonIndex - The index of the lesson to remove
 * @returns {Promise<void>}
 * @throws {Error} If database is not initialized or operation fails
 */
export async function removeLessonFromSchedule(classId, dayIndex, lessonIndex) {
  const lessons = await getScheduleForDay(classId, dayIndex);
  lessons.splice(lessonIndex, 1);
  await updateScheduleForDay(classId, dayIndex, lessons);
}

/**
 * Move a lesson within the same day's schedule
 * @param {string} classId - The class ID
 * @param {number} dayIndex - The day index
 * @param {number} fromIndex - The current index of the lesson
 * @param {number} toIndex - The target index for the lesson
 * @returns {Promise<boolean>} True if move was successful, false if toIndex is out of bounds
 * @throws {Error} If database is not initialized or operation fails
 */
export async function moveLessonInSchedule(classId, dayIndex, fromIndex, toIndex) {
  const lessons = await getScheduleForDay(classId, dayIndex);
  if (toIndex < 0 || toIndex >= lessons.length) return false;
  
  const [moved] = lessons.splice(fromIndex, 1);
  lessons.splice(toIndex, 0, moved);
  await updateScheduleForDay(classId, dayIndex, lessons);
  return true;
}

/**
 * Move a lesson between different days (for drag and drop functionality)
 * @param {string} classId - The class ID
 * @param {number} fromDayIndex - The source day index
 * @param {number} fromLessonIndex - The index of the lesson in the source day
 * @param {number} toDayIndex - The target day index
 * @returns {Promise<string>} The moved lesson hash
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Get date offset for a class
 * @param {string} classId - The class ID
 * @returns {Promise<number>} The date offset in days (default: 0)
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Set date offset for a class
 * @param {string} classId - The class ID
 * @param {number} offset - The date offset in days
 * @returns {Promise<void>}
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Insert a new empty day at the specified index (shifts all days >= index up by 1)
 * @param {string} classId - The class ID
 * @param {number} index - The index where the new day should be inserted
 * @param {number} maxDayIndex - The maximum day index currently in the schedule
 * @returns {Promise<void>}
 * @throws {Error} If database is not initialized or operation fails
 */
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

/**
 * Delete a day at a given index, shifting all future days back by one
 * @param {string} classId - The class ID
 * @param {number} index - The day index to delete
 * @returns {Promise<void>}
 * @throws {Error} If database is not initialized or operation fails
 */
export async function deleteDayAt(classId, index) {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  try {
    // Read all schedule data at once for batch operations
    const scheduleSnap = await get(ref(db, `schedule/${classId}`));
    const scheduleData = scheduleSnap.exists() ? scheduleSnap.val() : {};
    
    // Get all day indices and find max
    const dayIndices = Object.keys(scheduleData).map(Number).sort((a, b) => a - b);
    const maxDayIndex = dayIndices.length > 0 ? Math.max(...dayIndices) : 0;
    
    // Build array of all updates needed
    const writeOperations = [];
    
    // Shift all days > index down by 1 in memory
    for (const dayIdx of dayIndices) {
      if (dayIdx > index) {
        // Move this day's data to the previous index
        writeOperations.push(
          set(ref(db, `schedule/${classId}/${dayIdx - 1}`), scheduleData[dayIdx])
        );
      }
    }
    
    // Remove the last day (set to null to delete it)
    writeOperations.push(
      set(ref(db, `schedule/${classId}/${maxDayIndex}`), null)
    );
    
    // Perform all updates in parallel
    await Promise.all(writeOperations);
  } catch (error) {
    console.error(`Failed to delete day ${index} for class ${classId}:`, error);
    throw new Error(`Unable to delete day. Please try again.`);
  }
}
