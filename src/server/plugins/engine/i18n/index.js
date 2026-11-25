import { getErrorMessage } from '@defra/forms-model'
import i18next, { createInstance } from 'i18next'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import cy from '~/src/server/plugins/engine/i18n/translations/cy.json' with { type: 'json' }
import enGB from '~/src/server/plugins/engine/i18n/translations/en-GB.json' with { type: 'json' }

/**
 * @typedef {FormDefinitionTranslations[string]} BaseTranslations
 */

i18next
  .init({
    resources: {
      'en-GB': { translation: enGB },
      cy: { translation: cy }
    },
    fallbackLng: 'en-GB',
    interpolation: {
      prefix: '[[',
      suffix: ']]',
      escapeValue: false
    }
  })
  .catch((/** @type {unknown} */ err) => {
    logger.error(`Fatal init for translator i18next: ${getErrorMessage(err)}`)
  })

/**
 * Generic translation utility function
 * @param {string} key - key for lookup
 * @param {string} language - language requested
 * @param {Record<string, unknown>} [options]
 * @returns {string}
 */
export function t(key, language, options) {
  return i18next.t(key, { lng: language, ...options })
}

/**
 * Creates an instance of i18next with base (boilerplate) translation files loaded (en-GB.json and cy.json),
 * and appropriate namespaces for loading of form-specific translations later
 * @param {BaseTranslations} formEnGb
 * @returns
 */
export function createFormI18nInstance(formEnGb) {
  const instance = createInstance()

  instance
    .init({
      resources: {
        'en-GB': {
          plugin: enGB,
          form: formEnGb
        },
        cy: {
          plugin: cy
        }
      },
      fallbackLng: 'en-GB',
      ns: ['plugin', 'form'],
      defaultNS: 'plugin',
      interpolation: {
        prefix: '[[',
        suffix: ']]',
        escapeValue: false
      }
    })
    .catch((/** @type {unknown} */ err) => {
      // init with inline resources completes synchronously — unreachable
      logger.error(
        `Fatal init for translator instance: ${getErrorMessage(err)}`
      )
    })

  return instance
}

/**
 * @import { FormDefinitionTranslations } from '~/src/server/plugins/engine/i18n/types.js'
 */
