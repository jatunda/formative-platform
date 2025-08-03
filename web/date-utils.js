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

// Helper function to add business days (skipping weekends)
function addBusinessDays(startDate, businessDaysToAdd) {
  const date = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDaysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Only count weekdays (Monday = 1, Friday = 5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      daysAdded++;
    }
  }
  
  return date;
}

// Helper function to calculate business days between two dates
function getBusinessDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count weekdays only (Monday = 1, Friday = 5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  // Subtract 1 because we don't want to count the start date itself
  return Math.max(0, businessDays - 1);
}

// Calculate day index for today with offset applied (business days only)
export async function getTodayDayIndex(classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const today = new Date();
  const startDate = new Date(classStartDate);
  
  // Calculate business days difference from start date to today
  const businessDaysDiff = getBusinessDaysBetween(startDate, today);
  
  // Get the date offset for this class
  const dateOffset = await getClassDateOffset(classId);
  
  // Apply offset: positive offset moves start date forward, so today appears earlier in schedule
  const effectiveDayIndex = businessDaysDiff - dateOffset;
  
  return effectiveDayIndex;
}

// Calculate actual date for a given day index with offset applied (business days only)
export async function getDateForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const dateOffset = await getClassDateOffset(classId);
  
  const start = new Date(classStartDate);
  // Apply both day index and date offset using business days
  const totalBusinessDays = Number(dayIndex) + Number(dateOffset);
  const date = addBusinessDays(start, totalBusinessDays);
  
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long"
  });
  return `${date.toLocaleDateString()} (${weekday})`;
}

// Get just the Date object for a day index with offset (business days only)
export async function getDateObjectForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const dateOffset = await getClassDateOffset(classId);
  
  const start = new Date(classStartDate);
  // Apply both day index and date offset using business days
  const totalBusinessDays = Number(dayIndex) + Number(dateOffset);
  const date = addBusinessDays(start, totalBusinessDays);
  
  return date;
}

// Check if a given day index represents today (accounting for offset)
export async function isDayIndexToday(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const todayDayIndex = await getTodayDayIndex(classId, classStartDate);
  return Number(dayIndex) === todayDayIndex;
}
