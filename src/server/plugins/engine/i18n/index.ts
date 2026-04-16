import i18next from 'i18next'

import enGB from '~/src/server/plugins/engine/i18n/translations/en-GB.json'

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
    },
    initImmediate: false
  })
  .catch(() => {
    // Synchronous init (initImmediate: false) — this branch is unreachable
  })

export function t(
  key: string,
  language: string,
  options?: Record<string, unknown>
): string {
  return i18next.t(key, { lng: language, ...options })
}
