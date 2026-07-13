import { type i18n } from 'i18next'

import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'

/**
 * Creates a translator for the specified language, decorated with utility functions
 * for translating specific parts of the form definition.
 * @param i18nInstance - instance of i18next which gets created on startup (reads the boilerplate files en-GB.json and cy.json)
 * @param language - requested language
 */
export function createTranslator(
  i18nInstance: i18n,
  language = 'en-GB'
): Translator {
  const t = (key: string, opts?: Record<string, unknown>): string =>
    i18nInstance.t(key, { lng: language, ns: 'plugin', ...opts })

  const resolveContent = (
    entity: { id?: string },
    entityType: string,
    prop: string
  ): string => {
    if (!entity.id) {
      const raw = (entity as Record<string, unknown>)[prop]
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
      const raw = (entity as Record<string, unknown>)[prop]
      if (typeof raw !== 'string') return ''
      return t(raw)
    }
    return result
  }

  const resolveFormContent = (prop: string) => {
    const key = `form.${prop}`
    return i18nInstance.t(key, { lng: language, ns: 'form' })
  }

  return {
    t,
    tForm: (prop) => resolveFormContent(prop),
    tPage: (entity, prop) => resolveContent(entity, 'pages', prop as string),
    tComponent: (entity, prop) =>
      resolveContent(entity, 'components', prop as string),
    tSection: (entity, prop) =>
      resolveContent(entity, 'sections', prop as string),
    tListItem: (entity, prop) =>
      resolveContent(entity, 'listItems', prop as string),
    language
  }
}
