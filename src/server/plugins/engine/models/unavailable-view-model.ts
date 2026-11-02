import {
  type FormDefinition,
  type FormMetadata,
  type FormMetadataContact
} from '@defra/forms-model'

import { createFormTranslator } from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
import { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'
import { type Translator } from '~/src/server/plugins/engine/types/index.js'

export interface UnavailableViewModel {
  pageTitle: string
  formTitle: string
  organisationName: string
  contact?: FormMetadataContact
  context: { translator: Translator }
  language: string
  languages: { code: string; name: string }[]
}

export function unavailableViewModel(
  metadata: FormMetadata,
  definition: FormDefinition | undefined,
  language: string
): UnavailableViewModel {
  const translator = createFormTranslator(metadata, definition, language)
  const { t, tForm } = translator
  return {
    pageTitle: t('pages.formUnavailable.title'),
    formTitle: tForm('title') || metadata.title,
    organisationName: metadata.organisation,
    contact: metadata.contact,
    context: { translator },
    language,
    // Always get Welsh and English
    languages: getAvailableLanguages({
      metadata: { translations: { cy: {} } }
    } as unknown as FormDefinition)
  }
}
