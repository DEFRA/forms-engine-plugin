import {
  yesNoListNoItemId,
  yesNoListYesItemId,
  type FormDefinition
} from '@defra/forms-model'
import { type i18n } from 'i18next'

import { createTranslator } from '~/src/server/plugins/engine/i18n/createTranslator.js'
import { extractBaseTranslations } from '~/src/server/plugins/engine/i18n/extractBaseTranslations.js'
import { createFormI18nInstance } from '~/src/server/plugins/engine/i18n/index.js'
import {
  type FormDefinitionTranslations,
  type Translator
} from '~/src/server/plugins/engine/i18n/types.js'

export function createFormTranslator(
  def: FormDefinition,
  language: string
): Translator {
  const baseTranslations = extractBaseTranslations(def)
  const i18nInstance = createFormI18nInstance(baseTranslations)
  loadFormTranslations(def, i18nInstance)

  return createTranslator(i18nInstance, language)
}

export function loadFormTranslations(def: FormDefinition, i18nInstance: i18n) {
  const formTranslations = def.metadata?.translations as
    | FormDefinitionTranslations
    | undefined

  if (formTranslations) {
    for (const [lng, resources] of Object.entries(formTranslations)) {
      i18nInstance.addResourceBundle(lng, 'form', resources, true, true)

      // Temporary workaround - until we develop a better solution
      if (lng === 'cy') {
        i18nInstance.addResource(
          lng,
          'form',
          `listItems.${yesNoListYesItemId}.text`,
          'Ie'
        )
        i18nInstance.addResource(
          lng,
          'form',
          `listItems.${yesNoListNoItemId}.text`,
          'Nage'
        )
      }
    }
  }
}
