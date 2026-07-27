import { type FormMetadata, type FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type i18n } from 'i18next'
import { LRUCache } from 'lru-cache'

import { EN_GB } from '~/src/server/constants.js'
import { getPluginOptions } from '~/src/server/plugins/engine/helpers.js'
import { createFormTranslator } from '~/src/server/plugins/engine/i18n/createFormTranslator.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import { type AnyFormRequest } from '~/src/server/plugins/engine/types.js'

const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutes
})

/**
 * Get translator for runner, for runner-specific boilerplate, plus current form name (synchronous method).
 * This is for routes served by the plugin. The translator is injected into the Nunjucks context.
 * @param {string} id - the id of the form
 * @param { string | undefined } title - the title of the form
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export function getCachedFormTranslatorBasic(
  id: string,
  title: string | undefined,
  status: FormStatus,
  language: string
) {
  const key = `${id}-${status}-${language}-plugin`

  if (cache.has(key)) {
    return cache.get(key) as unknown as Translator
  }

  const translator = createFormTranslator(
    { id, title: title ?? '' } as FormMetadata,
    undefined,
    language
  )

  cache.set(key, translator)

  return translator
}

/**
 * Get translator for runner, for the current form's metadata (as well as the runner-specific boilerplate).
 * This is for external routes such as save-and-exit or privacy/help (not for routes served by the plugin).
 * This is an async call so we can read the form definition inside this call.
 * @param {AnyFormRequest} request
 * @param {FormMetadata} metadata - the metadata of the form
 * @param {FormStatus} status - the form status to use when retrieving the definition
 * @param {string} language - the language to use for the translator
 */
export async function getCachedFormTranslatorExternalRoutes(
  request: AnyFormRequest,
  metadata: FormMetadata,
  status: FormStatus,
  language: string
) {
  const key = `${metadata.id}-${status}-${language}-plugin-meta`

  if (cache.has(key)) {
    return cache.get(key) as unknown as Translator
  }

  const { services } = getPluginOptions(request.server)

  const definition = await services?.formsService.getFormDefinition(
    metadata.id,
    status
  )

  if (!definition) {
    throw Boom.notFound(
      `FormDefinition not found for form ${metadata.id} and status ${status}`
    )
  }

  const translator = createFormTranslator(metadata, definition, language)

  cache.set(key, translator)

  return translator
}

export function createTranslator(
  i18nInstance: i18n,
  languages: { name: string; code: string }[],
  language = EN_GB
): Translator {
  const t = (key: string, opts?: Record<string, unknown>): string =>
    i18nInstance.t(key, { lng: language, ...opts })

  const resolveFormContent = (prop: string) => {
    const key = `form.${prop}`
    return i18nInstance.t(key, { ns: 'form', lng: language })
  }

  return {
    t,
    tForm: (prop: string) => resolveFormContent(prop),
    language,
    languages
  } as unknown as Translator
}
