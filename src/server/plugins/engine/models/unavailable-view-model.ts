import {
  type FormDefinition,
  type FormMetadata,
  type FormMetadataContact
} from '@defra/forms-model'

import { createFormTranslator } from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
import { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'

export interface UnavailableViewModel {
  pageTitle: string
  formTitle: string
  organisationName: string
  contact?: FormMetadataContact
  t: (key: string, options?: Record<string, unknown>) => string
  language: string
  languages: { code: string; name: string }[]
}

function getTranslation(t: (key: string, options?: Record<string, unknown>) => string, key: string, fallback: string) {

}

export function unavailableViewModel(
  metadata: FormMetadata,
  definition: FormDefinition | undefined,
  language: string
): UnavailableViewModel {
  const translator = createFormTranslator(metadata, definition, language)
  const { t } = translator
  return {
    pageTitle: t('pages.formUnavailable.title'),
    formTitle: t('form.title') ?? metadata.title,
    organisationName: metadata.organisation,
    contact: metadata.contact,
    t: translator.t,
    language,
    // Always get Welsh and English
    languages: getAvailableLanguages({
      metadata: { translations: { cy: {} } }
    } as unknown as FormDefinition)
  }
}
