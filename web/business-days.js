// @ts-check
// Pure calendar logic for business days (Monday to Friday, the days a Date
// Offset counts) and the date labels built on them. No Firebase or DOM:
// date-utils.js builds Day Index conversions on top of these, and the
// student pages use them to label dates.

/**
 * A local-time Date from a YYYY-MM-DD string.
 * @param {string} dateString
 * @returns {Date}
 */
export function createLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * @param {Date} date
 * @returns {boolean} True for Monday to Friday
 */
function isBusinessDay(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * The date that many business days after a start date, skipping weekends.
 * @param {Date} startDate
 * @param {number} businessDaysToAdd
 * @returns {Date}
 */
export function addBusinessDays(startDate, businessDaysToAdd) {
  const date = new Date(startDate);
  let daysAdded = 0;
  while (daysAdded < businessDaysToAdd) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) {
      daysAdded++;
    }
  }
  return date;
}

/**
 * Business days from a start date to an end date, not counting the start
 * date itself. A weekend end date counts as the Friday before it.
 * @param {string} startDate - YYYY-MM-DD
 * @param {Date} endDate
 * @returns {number}
 */
export function getBusinessDaysBetween(startDate, endDate) {
  const current = createLocalDate(startDate);
  const end = new Date(endDate);
  let businessDays = 0;
  while (current <= end) {
    if (isBusinessDay(current)) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(0, businessDays - 1);
}

/**
 * The business day whose Do Nows the landing page lists on a given date: that
 * date on a weekday, the Friday before on a weekend (Today's Day Index counts
 * business days only, so a weekend still lands on Friday's Day Index).
 * @param {Date} date
 * @returns {Date}
 */
export function listedBusinessDay(date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (!isBusinessDay(day)) {
    day.setDate(day.getDate() - 1);
  }
  return day;
}

/**
 * @param {Date} date
 * @returns {string} e.g. "11/2": no leading zeros, no year
 */
export function monthDayLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * @param {Date} date
 * @returns {string} e.g. "Mon 11/2"
 */
export function shortDateLabel(date) {
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday} ${monthDayLabel(date)}`;
}

/**
 * The landing page heading on a given date, e.g. "11/11 Do Nows".
 * @param {Date} today
 * @returns {string}
 */
export function doNowsHeading(today) {
  return `${monthDayLabel(listedBusinessDay(today))} Do Nows`;
}
