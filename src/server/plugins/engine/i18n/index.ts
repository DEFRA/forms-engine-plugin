import i18next from 'i18next'

import enGB from '~/src/server/plugins/engine/i18n/translations/en-GB.json' with { type: 'json' }

i18next
  .init({
    resources: {
      'en-GB': { translation: enGB }
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
