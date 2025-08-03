// Shared Date Utilities
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Default class start date - should match the one used in teacher.js
export const DEFAULT_CLASS_START_DATE = "2024-08-19";

let db; // Database reference

// Cache for date offsets to avoid redundant queries
const dateOffsetCache = new Map();

// Initialize database reference
export function initializeDateUtils(database) {
  db = database;
}

// Get date offset for a class (with caching)
export async function getClassDateOffset(classId) {
  // Check cache first
  if (dateOffsetCache.has(classId)) {
    return dateOffsetCache.get(classId);
  }
  
  if (!db) {
    console.warn("Database not initialized in date utils");
    return 0;
  }
  try {
    const snap = await get(ref(db, `classes/${classId}/dateOffset`));
    const offset = snap.exists() ? snap.val() : 0;
    
    // Cache the result
    dateOffsetCache.set(classId, offset);
    return offset;
  } catch (error) {
    console.error(`Failed to get date offset for class ${classId}:`, error);
    return 0;
  }
}

// Clear cache when offset is updated
export function clearDateOffsetCache(classId = null) {
  if (classId) {
    dateOffsetCache.delete(classId);
  } else {
    dateOffsetCache.clear();
  }
}

// Calculate day index for today with offset applied
export async function getTodayDayIndex(classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const today = new Date();
  const startDate = new Date(classStartDate);
  
  // Calculate raw days difference from start date to today
  const timeDiff = today.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  // Get the date offset for this class
  const dateOffset = await getClassDateOffset(classId);
  
  // Apply offset: positive offset moves start date forward, so today appears earlier in schedule
  const effectiveDayIndex = daysDiff - dateOffset;
  
  return effectiveDayIndex;
}

// Calculate actual date for a given day index with offset applied
export async function getDateForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const dateOffset = await getClassDateOffset(classId);
  
  const start = new Date(classStartDate);
  const date = new Date(start);
  // Apply both day index and date offset
  date.setDate(start.getDate() + Number(dayIndex) + Number(dateOffset));
  
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long"
  });
  return `${date.toLocaleDateString()} (${weekday})`;
}

// Get just the Date object for a day index with offset
export async function getDateObjectForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const dateOffset = await getClassDateOffset(classId);
  
  const start = new Date(classStartDate);
  const date = new Date(start);
  date.setDate(start.getDate() + Number(dayIndex) + Number(dateOffset));
  
  return date;
}

// Check if a given day index represents today (accounting for offset)
export async function isDayIndexToday(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const todayDayIndex = await getTodayDayIndex(classId, classStartDate);
  return Number(dayIndex) === todayDayIndex;
}
