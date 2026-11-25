import { t as resolveKey } from '~/src/server/plugins/engine/i18n/index.js'

/**
 * Shared Translator stub for tests where translation content is not the focus.
 * Uses the real English i18n keys so tests that assert on English text still pass.
 * Each tX function resolves the entity's property via the real English t() so
 * i18n key constants (e.g. 'components.yesNoField.yes') resolve to their English
 * values ("Yes") rather than being returned verbatim.
 * @param {unknown} entity
 * @param {string} prop
 * @returns {string}
 */
function resolveEntity(entity, prop) {
  if (typeof entity !== 'object' || entity === null) return ''
  const raw =
    /** @type {string | undefined} */ (
      /** @type {Record<string, unknown>} */ (entity)[prop]
    ) ?? ''
  if (!raw) return ''
  return resolveKey(raw, 'en-GB') || raw
}

/** @type {Translator} */
export const stubTranslator = {
  /**
   * @param {string} key
   * @param {Record<string, unknown>} [opts]
   */
  t: (key, opts) => resolveKey(key, 'en-GB', opts),
  tForm: (prop) => resolveEntity({}, prop),
  tPage: (entity, prop) => resolveEntity(entity, /** @type {string} */ (prop)),
  tComponent: (entity, prop) =>
    resolveEntity(entity, /** @type {string} */ (prop)),
  tSection: (entity, prop) =>
    resolveEntity(entity, /** @type {string} */ (prop)),
  tListItem: (entity, prop) =>
    resolveEntity(entity, /** @type {string} */ (prop)),
  language: 'en-GB'
}

/**
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 */
