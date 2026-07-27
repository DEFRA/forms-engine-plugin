import {
  yesNoListNoItemId,
  yesNoListYesItemId,
  type FormDefinition,
  type FormMetadata
} from '@defra/forms-model'
import { type i18n } from 'i18next'

import { createTranslator } from '~/src/server/plugins/engine/i18n/createTranslator.js'
import { extractBaseTranslations } from '~/src/server/plugins/engine/i18n/extractBaseTranslations.js'
import { createFormI18nInstance } from '~/src/server/plugins/engine/i18n/index.js'
import { type FormDefinitionTranslations } from '~/src/server/plugins/engine/i18n/types.js'

export function createFormTranslator(
  metadata: FormMetadata,
  definition: FormDefinition | undefined,
  language: string
) {
  const baseTranslations = extractBaseTranslations(definition)
  const i18nInstance = createFormI18nInstance(baseTranslations)
  loadFormTranslations(definition, i18nInstance)

  const translator = createTranslator(i18nInstance, language)

  return translator
}

export function loadFormTranslations(
  def: FormDefinition | undefined,
  i18nInstance: i18n
) {
  if (!def) {
    return
  }

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
