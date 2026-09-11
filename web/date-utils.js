// Shared Date Utilities
import {
  initializeDatabase,
  getClassDateOffset as getClassDateOffsetFromDB,
  setClassDateOffset as setClassDateOffsetInDB
} from "./database-utils.js";

/**
 * Default class start date in YYYY-MM-DD format
 * @type {string}
 */
export const DEFAULT_CLASS_START_DATE = "2024-08-19";

let db; // Database reference

// Cache for date offsets to avoid redundant queries
const dateOffsetCache = new Map();

/**
 * Initialize date utilities with a database reference. Also initializes
 * database-utils.js, since Date Offset reads/writes go through it - callers
 * only need to call this one function, not both.
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} database - The Firebase database instance
 */
export function initializeDateUtils(database) {
  db = database;
  initializeDatabase(database);
}

/**
 * Get date offset for a class (with caching). database-utils.js is the only
 * module that talks to Firebase directly; this is the sole app-facing
 * accessor for Date Offset, so a read failure here is swallowed to 0 rather
 * than thrown.
 * @param {string} classId - The class ID
 * @returns {Promise<number>} The date offset in days (default: 0)
 */
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
    const offset = await getClassDateOffsetFromDB(classId);
    dateOffsetCache.set(classId, offset);
    return offset;
  } catch (error) {
    console.error(`Failed to get date offset for class ${classId}:`, error);
    return 0;
  }
}

/**
 * Set date offset for a class. Writes through database-utils.js, then
 * updates the cache in place with the known new value (no refetch needed).
 * A write failure is not swallowed - it propagates so callers can notify
 * the user.
 * @param {string} classId - The class ID
 * @param {number} offset - The new date offset in days
 * @returns {Promise<void>}
 */
export async function setClassDateOffset(classId, offset) {
  await setClassDateOffsetInDB(classId, offset);
  dateOffsetCache.set(classId, Number(offset));
}

/**
 * Seed the date offset cache from a Classes payload that already contains
 * each Class's dateOffset field (e.g. a single `get(ref(db, "classes"))`
 * read), so a subsequent getClassDateOffset/getTodayDayIndex call per Class
 * hits the cache instead of issuing its own redundant Firebase read. Only
 * fills gaps - never overwrites a value already cached (e.g. one just
 * written via setClassDateOffset).
 * @param {Object<string, {dateOffset?: number}>} classesData - The value of the "classes" node, keyed by classId
 */
export function primeDateOffsetCache(classesData) {
  for (const [classId, data] of Object.entries(classesData || {})) {
    if (!dateOffsetCache.has(classId)) {
      dateOffsetCache.set(classId, Number(data?.dateOffset) || 0);
    }
  }
}

/**
 * Clear the date offset cache for a specific class or all classes
 * @param {string | null} [classId=null] - The class ID to clear, or null to clear all
 */
export function clearDateOffsetCache(classId = null) {
  if (classId) {
    dateOffsetCache.delete(classId);
  } else {
    dateOffsetCache.clear();
  }
}

// Helper function to create a proper local date from YYYY-MM-DD string
function createLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
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
  const start = createLocalDate(startDate);
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

/**
 * Calculate day index for today with offset applied (business days only)
 * @param {string} classId - The class ID
 * @param {string} [classStartDate=DEFAULT_CLASS_START_DATE] - The class start date in YYYY-MM-DD format
 * @returns {Promise<number>} The day index for today
 */
export async function getTodayDayIndex(classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const today = new Date();
  const startDate = createLocalDate(classStartDate);
  
  // Calculate business days difference from start date to today
  const businessDaysDiff = getBusinessDaysBetween(classStartDate, today);
  
  // Get the date offset for this class
  const dateOffset = await getClassDateOffset(classId);
  
  // Apply offset: positive offset moves start date forward, so today appears earlier in schedule
  const effectiveDayIndex = businessDaysDiff - dateOffset;
  
  return effectiveDayIndex;
}

/**
 * Calculate actual date for a given day index with offset applied (business days only)
 * @param {number} dayIndex - The day index
 * @param {string} classId - The class ID
 * @param {string} [classStartDate=DEFAULT_CLASS_START_DATE] - The class start date in YYYY-MM-DD format
 * @returns {Promise<string>} The formatted date string with weekday (e.g., "1/15/2025 (Wednesday)")
 */
export async function getDateForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const dateOffset = await getClassDateOffset(classId);
  
  const start = createLocalDate(classStartDate);
  // Apply both day index and date offset using business days
  const totalBusinessDays = Number(dayIndex) + Number(dateOffset);
  const date = addBusinessDays(start, totalBusinessDays);
  
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long"
  });
  return `${date.toLocaleDateString()} (${weekday})`;
}

/**
 * Get just the Date object for a day index with offset (business days only)
 * @param {number} dayIndex - The day index
 * @param {string} classId - The class ID
 * @param {string} [classStartDate=DEFAULT_CLASS_START_DATE] - The class start date in YYYY-MM-DD format
 * @returns {Promise<Date>} The Date object for the given day index
 */
export async function getDateObjectForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const dateOffset = await getClassDateOffset(classId);
  
  const start = createLocalDate(classStartDate);
  // Apply both day index and date offset using business days
  const totalBusinessDays = Number(dayIndex) + Number(dateOffset);
  const date = addBusinessDays(start, totalBusinessDays);
  
  return date;
}

/**
 * Check if a given day index represents today (accounting for offset)
 * @param {number} dayIndex - The day index to check
 * @param {string} classId - The class ID
 * @param {string} [classStartDate=DEFAULT_CLASS_START_DATE] - The class start date in YYYY-MM-DD format
 * @returns {Promise<boolean>} True if the day index represents today
 */
export async function isDayIndexToday(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const todayDayIndex = await getTodayDayIndex(classId, classStartDate);
  return Number(dayIndex) === todayDayIndex;
}
