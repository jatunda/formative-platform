// @ts-check
// Pure helpers over the Lesson ids a Schedule holds, shared by lesson-store.js
// (finding and removing a deleted Lesson's Schedule uses) and the one-off
// scripts/cleanScheduleLessons.js. No database access, so Node can import it.

const SCHEDULE_PATH = "schedule";

/**
 * One Class's Schedule as {dayIndex, lessonIds} pairs, ascending. Firebase
 * hands back dense Day Indices as an array (with nulls for gaps) and sparse
 * ones as an object; both read the same here.
 * @param {any} days
 * @returns {Array<{dayIndex: number, lessonIds: string[]}>}
 */
export function scheduleDays(days) {
  return Object.entries(days ?? {})
    .filter(([, lessonIds]) => lessonIds)
    .map(([dayIndex, lessonIds]) => ({ dayIndex: Number(dayIndex), lessonIds: Object.values(lessonIds) }))
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

/**
 * Update paths that take every Lesson matching `shouldRemove` out of every
 * Class's Schedule - not applied, so a caller can fold them into a larger
 * atomic update. Only days holding such a Lesson are touched; a day left
 * with no Lessons is written as an empty day (a gap), so no Day Index shifts.
 * @param {Record<string, any> | null} schedules - The whole `schedule` tree
 * @param {(lessonId: string) => boolean} shouldRemove
 * @returns {Record<string, string[]>}
 */
export function scheduleLessonRemovals(schedules, shouldRemove) {
  /** @type {Record<string, string[]>} */
  const updates = {};
  for (const [classId, days] of Object.entries(schedules ?? {})) {
    for (const { dayIndex, lessonIds } of scheduleDays(days)) {
      if (lessonIds.some(shouldRemove)) {
        updates[`${SCHEDULE_PATH}/${classId}/${dayIndex}`] = lessonIds.filter((id) => !shouldRemove(id));
      }
    }
  }
  return updates;
}
