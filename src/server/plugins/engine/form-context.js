import Boom from '@hapi/boom'
import { isEqual } from 'date-fns'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { assertFormAvailable } from '~/src/server/plugins/engine/form-availability.js'
import {
  checkEmailAddressForLiveFormSubmission,
  getCacheService
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { TerminalPageController } from '~/src/server/plugins/engine/pageControllers/index.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { FormStatus } from '~/src/server/routes/types.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

/**
 * @typedef {FormStatus | 'preview'} JourneyState
 */

/**
 * @typedef {{
 *   services?: Services
 *   controllers?: Record<string, typeof PageController>
 *   basePath?: string
 *   ordnanceSurveyApiKey?: string
 *   formId?: string
 *   routePrefix?: string
 *   isPreview?: boolean
 * }} FormModelOptions
 */

/**
 * @typedef {FormModelOptions & {
 *   errors?: FormSubmissionError[]
 *   language?: string
 * }} FormContextOptions
 */

/**
 * @typedef {FormContextRequest & {
 *   yar: Request['yar']
 * }} SummaryRequest
 */

/**
 * @param {string} slug
 * @param {JourneyState} state
 * @param {FormModelOptions} [options]
 */
export async function getFormModel(slug, state, options = {}) {
  const services = options.services ?? defaultServices
  const { formsService } = services
  const isPreview = isPreviewState(state, options)
  const formState = resolveState(state)

  const metadata = await formsService.getFormMetadata(slug)

  const definition = await formsService.getFormDefinition(
    metadata.id,
    formState
  )

  assertFormAvailable(metadata, formState, isPreview, definition)

  if (!definition) {
    throw Boom.notFound(
      `No definition found for form metadata ${metadata.id} (${slug}) ${state}`
    )
  }

  return new FormModel(
    definition,
    {
      basePath:
        options.basePath ??
        buildBasePath(options.routePrefix ?? '', slug, formState, isPreview),
      ordnanceSurveyApiKey: options.ordnanceSurveyApiKey,
      formId: options.formId ?? metadata.id
    },
    services,
    options.controllers
  )
}

/**
 * @param {Pick<Request, 'server' | 'yar'>} param0
 * @param {string} slug
 * @param {JourneyState} [state]
 * @param {FormContextOptions} [options]
 * @returns {Promise<FormContext>}
 */
export async function getFormContext(
  { server, yar },
  slug,
  state = FormStatus.Live,
  options = {}
) {
  const formModel = await resolveFormModel(server, slug, state, options)

  const cacheService = getCacheService(server)

  /** @type {SummaryRequest} */
  const summaryRequest = {
    app: {},
    method: 'get',
    params: {
      path: 'summary',
      slug,
      ...(isPreviewState(state, options) && {
        state: resolveState(state)
      })
    },
    path: `/${formModel.basePath}/summary`,
    query: {},
    url: new URL(
      `/${formModel.basePath}/summary`,
      'https://form-context.local'
    ),
    server,
    yar
  }

  const cachedState = await cacheService.getState(
    /** @type {AnyRequest} */ (/** @type {unknown} */ (summaryRequest))
  )

  const formState = /** @type {FormSubmissionState} */ (
    /** @type {unknown} */ ({
      ...cachedState,
      $$__referenceNumber: cachedState.$$__referenceNumber
    })
  )

  const language = resolveLanguage(
    /** @type {AnyFormRequest} */ (/** @type {unknown} */ (summaryRequest))
  )
  const translator = formModel.createTranslator(language)

  return formModel.getFormContext(
    summaryRequest,
    formState,
    options.errors ?? [],
    translator
  )
}

/**
 * @param {Server} server
 * @param {string} slug
 * @param {JourneyState} state
 * @param {FormModelOptions} [options]
 */
export async function resolveFormModel(server, slug, state, options = {}) {
  const services = options.services ?? defaultServices
  const { formsService } = services

  const metadata = await formsService.getFormMetadata(slug)
  const formState = resolveState(state)
  const isPreview = options.isPreview ?? isPreviewState(state, options)
  const stateMetadata = metadata[formState]

  if (!stateMetadata) {
    throw Boom.notFound(
      `No '${formState}' state for form metadata ${metadata.id}`
    )
  }

  // The models cache is created lazily per server instance
  server.app.models ??=
    /** @type {Map<string, { model: FormModel; updatedAt: Date }>} */ (
      new Map()
    )

  const cache = server.app.models

  const cacheKey = `${metadata.id}_${formState}_${isPreview}`
  let entry = cache.get(cacheKey)

  if (!entry || !isEqual(entry.updatedAt, stateMetadata.updatedAt)) {
    const definition = await formsService.getFormDefinition(
      metadata.id,
      formState
    )

    if (!definition) {
      throw Boom.notFound(
        `No definition found for form metadata ${metadata.id} (${slug}) ${state}`
      )
    }

    checkEmailAddressForLiveFormSubmission(
      metadata.notificationEmail,
      isPreview
    )

    const routePrefix =
      options.routePrefix ?? server.realm.modifiers.route.prefix

    const model = new FormModel(
      definition,
      {
        basePath:
          options.basePath ??
          buildBasePath(routePrefix, slug, formState, isPreview),
        ordnanceSurveyApiKey: options.ordnanceSurveyApiKey,
        formId: options.formId ?? metadata.id
      },
      services,
      options.controllers
    )

    entry = { model, updatedAt: stateMetadata.updatedAt }
    cache.set(cacheKey, entry)
  }

  assertFormAvailable(metadata, formState, isPreview, entry.model.def)

  return entry.model
}

/**
 * @param {string} routePrefix
 * @param {string} slug
 * @param {FormStatus} state
 * @param {boolean} isPreview
 */
function buildBasePath(routePrefix, slug, state, isPreview) {
  const base = (
    isPreview
      ? `${routePrefix}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
      : `${routePrefix}/${slug}`
  ).replace(/\/{2,}/g, '/')

  return base.startsWith('/') ? base.slice(1) : base
}

/**
 * @param {Pick<FormContext, 'relevantPages'>} [context]
 */
export function getFirstJourneyPage(context) {
  if (!context?.relevantPages) {
    return undefined
  }

  const lastPageReached = context.relevantPages.at(-1)
  const penultimatePageReached = context.relevantPages.at(-2)

  if (
    lastPageReached instanceof TerminalPageController &&
    penultimatePageReached
  ) {
    return penultimatePageReached
  }

  return lastPageReached
}

/**
 * @param {JourneyState} state
 * @returns {FormStatus}
 */
function resolveState(state) {
  return state === 'preview' ? FormStatus.Live : state
}

/**
 * @param {JourneyState} state
 * @param {FormModelOptions} [options]
 * @returns {boolean}
 */
function isPreviewState(state, options = {}) {
  return options.isPreview ?? state === 'preview'
}

/**
 * @import { Request, Server } from '@hapi/hapi'
 * @import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
 * @import { AnyFormRequest, AnyRequest, FormContext, FormContextRequest, FormSubmissionError, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 * @import { Services } from '~/src/server/types.js'
 */
