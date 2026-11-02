import { type FormDefinition } from '@defra/forms-model'

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
