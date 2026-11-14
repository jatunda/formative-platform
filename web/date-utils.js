// Shared Date Utilities
import {
  getClassDateOffset as getClassDateOffsetFromDB,
  setClassDateOffset as setClassDateOffsetInDB
} from "./database-utils.js";
import { addBusinessDays, createLocalDate, getBusinessDaysBetween, shortDateLabel, DEFAULT_CLASS_START_DATE } from "./business-days.js";

export { DEFAULT_CLASS_START_DATE };

// Cache for date offsets to avoid redundant queries
const dateOffsetCache = new Map();

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

/**
 * Calculate day index for today with offset applied (business days only)
 * @param {string} classId - The class ID
 * @param {string} [classStartDate=DEFAULT_CLASS_START_DATE] - The class start date in YYYY-MM-DD format
 * @returns {Promise<number>} The day index for today
 */
export async function getTodayDayIndex(classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  const today = new Date();
  
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
 * @returns {Promise<string>} The short date label a Schedule row shows (e.g., "Wed 1/15")
 */
export async function getDateForDayIndex(dayIndex, classId, classStartDate = DEFAULT_CLASS_START_DATE) {
  return shortDateLabel(await getDateObjectForDayIndex(dayIndex, classId, classStartDate));
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
