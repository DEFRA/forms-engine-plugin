import { EN_GB } from '~/src/server/constants.js'

/**
 * Return a list of available languages.
 * Empty array if only English, or an array of English and Welsh if translations have been defined.
 * @param {FormDefinition} def
 * @returns {{ name: string; code: string }[]}
 */
export function getAvailableLanguages(def) {
  // @ts-expect-error - dynamic property
  if (def.metadata?.translations?.cy) {
    return [
      { name: 'English', code: 'en-GB' },
      { name: 'Cymraeg', code: 'cy' }
    ]
  }
  return []
}

/**
 * Return the language to show a form in. This is the requested language when
 * the form has translations for it, and English otherwise, so that the plugin
 * text and the form content are always in the same language.
 * @param {FormDefinition} def - the form definition
 * @param {string} language - the requested language
 * @returns {string}
 */
export function resolveFormLanguage(def, language) {
  // @ts-expect-error - dynamic language lookup
  return def.metadata?.translations?.[language] ? language : EN_GB
}

/**
 * @import { FormDefinition } from '@defra/forms-model'
 */
