// @ts-check
// Slug index: the rules every Slug namespace shares (see CONTEXT.md's Slug
// and Slug Rename entries). Each namespace is its own `{indexPath}/{slug} ->
// entityId` map, so Pages, Questions and Practice Sets never collide on the
// same Slug text (docs/adr/0011) - only this code is shared.

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Whether a string is a valid Slug: lowercase alphanumeric segments joined by
 * single hyphens (e.g. "syllabus", "syllabus-2026"). No leading/trailing/
 * repeated hyphens, no uppercase, no spaces or other URL-unsafe characters.
 * @param {unknown} slug
 * @returns {boolean}
 */
export function isValidSlugFormat(slug) {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

/**
 * @typedef {object} SlugNamespace
 * @property {string} indexPath
 * @property {string} formatExample
 * @property {(slug: string) => string} takenMessage
 */

/**
 * @param {SlugNamespace} namespace
 * @param {import("./realtime-store.js").Store} store - The storage the index
 *   reads and writes through
 */
export function createSlugIndex(namespace, store) {
  const { indexPath } = namespace;

  /**
   * Throws unless `slug` is well-formed and free (or already `entityId`'s).
   * @param {string} entityId
   * @param {string} slug
   */
  async function assertClaimable(entityId, slug) {
    if (!isValidSlugFormat(slug)) {
      throw new Error(
        `Slugs must be lowercase letters, numbers, and hyphens only (e.g. "${namespace.formatExample}").`
      );
    }
    const owner = await store.read(`${indexPath}/${slug}`);
    if (owner != null && owner !== entityId) {
      throw new Error(namespace.takenMessage(slug));
    }
  }

  /**
   * @param {string} entityId
   * @param {string} oldSlug
   * @param {string} newSlug
   * @returns {Promise<Record<string, string | null>>}
   */
  async function renameUpdates(entityId, oldSlug, newSlug) {
    await assertClaimable(entityId, newSlug);
    return {
      [`${indexPath}/${oldSlug}`]: null,
      [`${indexPath}/${newSlug}`]: entityId,
    };
  }

  /** @returns {Promise<Record<string, string>>} */
  async function getAll() {
    return (await store.read(indexPath)) ?? {};
  }

  return {
    /**
     * The namespace's whole Slug -> entityId map ({} when empty).
     */
    getAll,

    /**
     * Free one Slug. The entity itself, and its other Slugs, are untouched.
     * @param {string} slug
     */
    async release(slug) {
      await store.update({ [`${indexPath}/${slug}`]: null });
    },

    /**
     * Removal paths for every Slug `entityId` holds, not applied - so a
     * delete can release them in the same atomic update that removes the
     * entity.
     * @param {string} entityId
     * @returns {Promise<Record<string, null>>}
     */
    async releaseAllUpdates(entityId) {
      /** @type {Record<string, null>} */
      const updates = {};
      for (const [slug, ownerId] of Object.entries(await getAll())) {
        if (ownerId === entityId) {
          updates[`${indexPath}/${slug}`] = null;
        }
      }
      return updates;
    },

    /**
     * Slug Rename: `oldSlug` stops resolving and `newSlug` points at the
     * same entity, in one atomic update.
     * @param {string} entityId
     * @param {string} oldSlug
     * @param {string} newSlug
     * @throws {Error} If the new Slug is malformed or taken by another entity
     */
    async rename(entityId, oldSlug, newSlug) {
      await store.update(await renameUpdates(entityId, oldSlug, newSlug));
    },

    /**
     * The update paths a Slug Rename writes, validated but not applied - for
     * callers that fold the swap into a larger atomic update (e.g. a Page's
     * Slug Rename also rewrites the Page Links pointing at it).
     * @throws {Error} If the new Slug is malformed or taken by another entity
     */
    renameUpdates,

    /**
     * Point `slug` at `entityId`. An entity may hold several Slugs; a Slug
     * points at exactly one entity.
     * @param {string} entityId
     * @param {string} slug
     * @throws {Error} If the Slug is malformed or taken by another entity
     */
    async claim(entityId, slug) {
      await assertClaimable(entityId, slug);
      await store.update({ [`${indexPath}/${slug}`]: entityId });
    },

    /**
     * @param {string} slug
     * @returns {Promise<string | null>}
     */
    async resolve(slug) {
      return (await store.read(`${indexPath}/${slug}`)) ?? null;
    },
  };
}
