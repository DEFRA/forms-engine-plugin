import { type FormDefinition } from '@defra/forms-model'

import { EN_GB } from '~/src/server/constants.js'

/**
 * Return a list of available languages.
 * Empty array if only English, or an array of English and Welsh if translations have been defined.
 * @param {FormDefinition} def
 */
export function getAvailableLanguages(
  def: FormDefinition
): { name: string; code: string }[] {
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
 * @param def - the form definition
 * @param language - the requested language
 */
export function resolveFormLanguage(
  def: FormDefinition,
  language: string
): string {
  // @ts-expect-error - dynamic language lookup
  return def.metadata?.translations?.[language] ? language : EN_GB
}
