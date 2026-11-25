/**
 * Creates a translator for the specified language, decorated with utility functions
 * for translating specific parts of the form definition.
 * @param {i18n} i18nInstance - instance of i18next which gets created on startup (reads the boilerplate files en-GB.json and cy.json)
 * @param {string} [language] - requested language
 * @returns {Translator}
 */
export function createTranslator(i18nInstance, language = 'en-GB') {
  /**
   * @param {string} key
   * @param {Record<string, unknown>} [opts]
   * @returns {string}
   */
  const t = (key, opts) =>
    i18nInstance.t(key, { lng: language, ns: 'plugin', ...opts })

  /**
   * @param {{ id?: string }} entity
   * @param {string} entityType
   * @param {string} prop
   * @returns {string}
   */
  const resolveContent = (entity, entityType, prop) => {
    if (!entity.id) {
      const raw = /** @type {Record<string, unknown>} */ (entity)[prop]
      if (typeof raw !== 'string') return ''
      // t() resolves i18next key constants (sub-field labels); returns raw string unchanged if not a key
      return t(raw)
    }
    const key = `${entityType}.${entity.id}.${prop}`
    const result = i18nInstance.t(key, {
      lng: language,
      ns: 'form'
    })
    if (result === key) {
      // No form translation found — fall through to t(raw) so plugin i18n
      // key constants (e.g. 'components.yesNoField.yes') are still resolved.
      const raw = /** @type {Record<string, unknown>} */ (entity)[prop]
      if (typeof raw !== 'string') return ''
      return t(raw)
    }
    return result
  }

  /**
   * @param {string} prop
   */
  const resolveFormContent = (prop) => {
    const key = `form.${prop}`
    return i18nInstance.t(key, { lng: language, ns: 'form' })
  }

  return {
    t,
    tForm: (prop) => resolveFormContent(prop),
    tPage: (entity, prop) =>
      resolveContent(entity, 'pages', /** @type {string} */ (prop)),
    tComponent: (entity, prop) =>
      resolveContent(entity, 'components', /** @type {string} */ (prop)),
    tSection: (entity, prop) =>
      resolveContent(entity, 'sections', /** @type {string} */ (prop)),
    tListItem: (entity, prop) =>
      resolveContent(entity, 'listItems', /** @type {string} */ (prop)),
    language
  }
}

/**
 * @import { i18n } from 'i18next'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 */
