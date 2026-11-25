import Boom from '@hapi/boom'
import { LRUCache } from 'lru-cache'

import { getPluginOptions } from '~/src/server/plugins/engine/helpers.js'
import { createFormTranslator } from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
import { resolveFormLanguage } from '~/src/server/plugins/engine/i18n/languages.js'

const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
})

/**
 * Get translator for plugin, for the current form's metadata (as well as the plugin-specific boilerplate).
 * This is an async call so we can read the form definition inside this call.
 * See docs/features/multi-language.md for the language and translation flow overview.
 * @param {AnyFormRequest} request
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export async function getCachedPluginTranslator(
  request,
  metadata,
  status,
  language
) {
  const key = `${metadata.id}-${status}-${language}-plugin-meta`

  if (cache.has(key)) {
    return /** @type {Translator} */ (/** @type {unknown} */ (cache.get(key)))
  }

  const { services } = getPluginOptions(request.server)

  // A plugin registered with a single `model` has no forms service, so the
  // definition comes from that model
  const definition = services
    ? await services.formsService.getFormDefinition(metadata.id, status)
    : request.server.app.model?.def

  if (!definition) {
    throw Boom.notFound(
      `FormDefinition not found for form ${metadata.id} and status ${status}`
    )
  }

  const translator = createFormTranslator(
    metadata,
    definition,
    resolveFormLanguage(definition, language)
  )

  cache.set(key, translator)

  return translator
}

/**
 * @import { FormMetadata, FormStatus } from '@defra/forms-model'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { AnyFormRequest } from '~/src/server/plugins/engine/types.js'
 */
