import {
  type FormDefinition,
  type FormMetadata,
  type FormMetadataContact
} from '@defra/forms-model'

import { t } from '~/src/server/plugins/engine/i18n/index.js'
import { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'

export interface UnavailableViewModel {
  pageTitle: string
  formTitle: string
  organisationName: string
  contact?: FormMetadataContact
  t: (
    key: string,
    language: string,
    options?: Record<string, unknown>
  ) => string
  language: string
  languages: { code: string; name: string }[]
}

export function unavailableViewModel(
  metadata: FormMetadata,
  language: string
): UnavailableViewModel {
  return {
    pageTitle: t('pages.formUnavailable.title', language),
    formTitle: metadata.title,
    organisationName: metadata.organisation,
    contact: metadata.contact,
    t,
    language,
    // Always get Welsh and English
    languages: getAvailableLanguages({
      metadata: { translations: { cy: {} } }
    } as unknown as FormDefinition)
  }
}
