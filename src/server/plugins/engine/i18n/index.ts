import i18next, { createInstance, type i18n } from 'i18next'

import enGB from '~/src/server/plugins/engine/i18n/translations/en-GB.json' with { type: 'json' }
import xPirate from '~/src/server/plugins/engine/i18n/translations/x-pirate.json' with { type: 'json' }
import { type FormDefinitionTranslations } from '~/src/server/plugins/engine/i18n/types.js'

type BaseTranslations = FormDefinitionTranslations[string]

i18next
  .init({
    resources: {
      'en-GB': { translation: enGB },
      'x-pirate': { translation: xPirate }
    },
    fallbackLng: 'en-GB',
    interpolation: {
      prefix: '[[',
      suffix: ']]',
      escapeValue: false
    }
  })
  .catch(() => {
    // init with inline resources completes synchronously — this branch is unreachable
  })

export function t(
  key: string,
  language: string,
  options?: Record<string, unknown>
): string {
  return i18next.t(key, { lng: language, ...options })
}

export function createFormI18nInstance(formEnGb: BaseTranslations): i18n {
  const instance = createInstance()

  instance
    .init({
      resources: {
        'en-GB': {
          plugin: enGB,
          form: formEnGb
        },
        'x-pirate': {
          plugin: xPirate
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
    .catch(() => {
      // init with inline resources completes synchronously — unreachable
    })

  return instance
}
