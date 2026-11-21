import { createFormTranslator } from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
import { getAvailableLanguages } from '~/src/server/plugins/engine/i18n/languages.js'

/**
 * @typedef {{
 *   pageTitle: string
 *   formTitle: string
 *   organisationName: string
 *   contact?: FormMetadataContact
 *   context: { translator: Translator }
 *   language: string
 *   languages: { code: string; name: string }[]
 * }} UnavailableViewModel
 */

/**
 * @param {FormMetadata} metadata
 * @param {FormDefinition | undefined} definition
 * @param {string} language
 * @returns {UnavailableViewModel}
 */
export function unavailableViewModel(metadata, definition, language) {
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
    languages: getAvailableLanguages(
      /** @type {FormDefinition} */ (
        /** @type {unknown} */ ({
          metadata: { translations: { cy: {} } }
        })
      )
    )
  }
}

/**
 * @import { FormDefinition, FormMetadata, FormMetadataContact } from '@defra/forms-model'
 * @import { Translator } from '~/src/server/plugins/engine/types/index.js'
 */
