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
  extractMetadataBaseTranslations(metadata, i18nInstance)

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

export function extractMetadataBaseTranslations(
  metadata: FormMetadata | undefined,
  i18nInstance: i18n
) {
  if (metadata) {
    const translations = {
      'form.title': metadata.title,
      'form.contact.email.address': metadata.contact?.email?.address ?? '',
      'form.contact.email.responseTime':
        metadata.contact?.email?.responseTime ?? '',
      'form.contact.online.url': metadata.contact?.online?.url ?? '',
      'form.contact.online.text': metadata.contact?.online?.text ?? '',
      'form.contact.phone': metadata.contact?.phone ?? '',
      'form.submissionGuidance': metadata.submissionGuidance ?? '',
      'form.privacyNoticeText': metadata.privacyNoticeText ?? '',
      'form.privacyNoticeUrl': metadata.privacyNoticeUrl ?? ''
    }
    i18nInstance.addResourceBundle('en-GB', 'form', translations, true, true)
  }
}
