// @ts-check
// Lesson store: every Lesson read and write (get, create, save, duplicate,
// delete) goes through here. Lessons are stored under the `content` tree,
// but that path stays inside this module.

import { generateUniqueKey } from "./unique-key.js";
import { realtimeStore } from "./realtime-store.js";
import { getDb } from "./database-handle.js";

const LESSONS_PATH = "content";
const SCHEDULE_PATH = "schedule";
const CLASSES_PATH = "classes";

/**
 * The storage the Lesson store reads and writes through. `update` applies a
 * multi-path update atomically, `null` values deleting (Realtime Database
 * semantics). Same shape as slug-index.js's SlugStore.
 * @typedef {object} LessonStorePort
 * @property {(path: string) => Promise<any>} read
 * @property {(updates: Record<string, any>) => Promise<void>} update
 */

/**
 * The Lesson store over the page's database (see database-handle.js). Call it
 * per use rather than once at import time, so it picks up the handle the
 * page initialized.
 */
export function lessonStore() {
  return createLessonStore(realtimeStore(getDb()));
}

/**
 * @param {LessonStorePort} store
 */
export function createLessonStore(store) {
  return {
    /**
     * @param {string} id
     * @returns {Promise<object | null>} The Lesson, or null if none has this id
     */
    async get(id) {
      return (await store.read(`${LESSONS_PATH}/${id}`)) ?? null;
    },

    /**
     * Save a Lesson under an id, replacing whatever was there.
     * @param {string} id
     * @param {object} lesson
     */
    async save(id, lesson) {
      await store.update({ [`${LESSONS_PATH}/${id}`]: lesson });
    },

    /**
     * @param {string} id
     * @returns {Promise<string | null>} The Lesson's title, or null if the
     *   Lesson (or its title) doesn't exist - callers pick their own fallback
     */
    async getTitle(id) {
      return (await store.read(`${LESSONS_PATH}/${id}/title`)) ?? null;
    },

    /**
     * @returns {Promise<Record<string, string | null>>} Every Lesson id mapped
     *   to its title (null for a Lesson with none)
     */
    async listTitles() {
      const all = (await store.read(LESSONS_PATH)) ?? {};
      return Object.fromEntries(
        Object.entries(all).map(([id, lesson]) => [id, lesson?.title ?? null])
      );
    },

    /**
     * An id no Lesson uses yet, without saving anything under it (e.g. for a
     * new Lesson the teacher hasn't saved yet).
     * @returns {Promise<string>}
     */
    newId() {
      return generateUniqueKey(store.read, LESSONS_PATH);
    },

    /**
     * Save a new Lesson under a fresh id.
     * @param {object} lesson
     * @returns {Promise<string>} The new Lesson's id
     */
    async create(lesson) {
      const id = await this.newId();
      await this.save(id, lesson);
      return id;
    },

    /**
     * Save a copy of a Lesson, titled "<title> (Copy)", under a fresh id.
     * @param {{title: string} & Record<string, any>} lesson
     * @returns {Promise<{id: string, lesson: object}>}
     */
    async duplicate(lesson) {
      const copy = { ...lesson, title: `${lesson.title} (Copy)` };
      const id = await this.create(copy);
      return { id, lesson: copy };
    },

    /**
     * Every Class whose Schedule still uses a Lesson, with the Day Indices it
     * sits on, in Class display order.
     * @param {string} id
     * @returns {Promise<ScheduleUse[]>}
     */
    async findScheduleUses(id) {
      const [schedules, classes] = await Promise.all([
        store.read(SCHEDULE_PATH),
        store.read(CLASSES_PATH),
      ]);
      const allClasses = classes ?? {};
      /** @type {ScheduleUse[]} */
      const uses = [];
      for (const [classId, days] of Object.entries(schedules ?? {})) {
        const dayIndices = scheduleDays(days)
          .filter(({ lessonIds }) => lessonIds.includes(id))
          .map(({ dayIndex }) => dayIndex);
        if (dayIndices.length > 0) {
          uses.push({ classId, className: allClasses[classId]?.name || classId, dayIndices });
        }
      }
      const order = (/** @type {ScheduleUse} */ use) => allClasses[use.classId]?.displayOrder || 0;
      return uses.sort((a, b) => order(a) - order(b));
    },

    /**
     * Delete a Lesson and take it out of every Class's Schedule, in one
     * atomic update. A day left with no Lessons stays as an empty day (a
     * gap); no Day Index shifts.
     * @param {string} id
     */
    async delete(id) {
      const schedules = (await store.read(SCHEDULE_PATH)) ?? {};
      /** @type {Record<string, any>} */
      const updates = { [`${LESSONS_PATH}/${id}`]: null };
      for (const [classId, days] of Object.entries(schedules)) {
        for (const { dayIndex, lessonIds } of scheduleDays(days)) {
          if (lessonIds.includes(id)) {
            updates[`${SCHEDULE_PATH}/${classId}/${dayIndex}`] = lessonIds.filter(l => l !== id);
          }
        }
      }
      await store.update(updates);
    },
  };
}

/**
 * @typedef {object} ScheduleUse
 * @property {string} classId
 * @property {string} className - The Class's name, or its id if it has none
 * @property {number[]} dayIndices - Ascending
 */

/**
 * One Class's Schedule as {dayIndex, lessonIds} pairs, ascending. Firebase
 * hands back dense Day Indices as an array (with nulls for gaps) and sparse
 * ones as an object; both read the same here.
 * @param {any} days
 * @returns {Array<{dayIndex: number, lessonIds: string[]}>}
 */
function scheduleDays(days) {
  return Object.entries(days ?? {})
    .filter(([, lessonIds]) => lessonIds)
    .map(([dayIndex, lessonIds]) => ({ dayIndex: Number(dayIndex), lessonIds: Object.values(lessonIds) }))
    .sort((a, b) => a.dayIndex - b.dayIndex);
}
