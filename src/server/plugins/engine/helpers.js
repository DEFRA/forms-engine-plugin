import { ControllerPath, Engine, getErrorMessage } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { format, parseISO } from 'date-fns'
import { cy, enGB } from 'date-fns/locale'
import { StatusCodes } from 'http-status-codes'
import { Liquid } from 'liquidjs'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { CY, EN_GB, FORM_VERSION_METADATA_KEY } from '~/src/server/constants.js'
import { getAnswer } from '~/src/server/plugins/engine/components/helpers/components.js'
import { stripParam } from '~/src/server/plugins/engine/pageControllers/helpers/state.js'
import { FormAction, FormStatus } from '~/src/server/routes/types.js'

export const engine = new Liquid({
  outputEscape: 'escape',
  jsTruthy: true,
  ownPropertyOnly: false
})

/**
 * @typedef {{
 *   context: FormContext
 *   pages: Map<string, Page>
 *   components: Map<string, ComponentDef>
 * }} GlobalScope
 */

engine.registerFilter(
  'evaluate',
  /** @param {string} [template] */
  function (template) {
    if (typeof template !== 'string') {
      return template
    }

    const globals = /** @type {GlobalScope} */ (this.context.globals)
    const evaluated = evaluateTemplate(template, globals.context)

    return evaluated
  }
)

engine.registerFilter(
  'page',
  /** @param {string} [path] */
  function (path) {
    if (typeof path !== 'string') {
      return
    }

    const globals = /** @type {GlobalScope} */ (this.context.globals)
    const pageDef = globals.pages.get(path)

    return pageDef
  }
)

engine.registerFilter(
  'href',
  /**
   * @param {string} path
   * @param {FormQuery} [query]
   */
  function (path, query) {
    if (typeof path !== 'string') {
      return
    }

    const globals = /** @type {GlobalScope} */ (this.context.globals)
    const page = globals.context.pageMap.get(path)

    if (page === undefined) {
      return
    }

    return getPageHref(page, query)
  }
)

engine.registerFilter('field', function (/** @type {string} */ name) {
  if (typeof name !== 'string') {
    return
  }

  const globals = /** @type {GlobalScope} */ (this.context.globals)
  const componentDef = globals.components.get(name)

  return componentDef
})

engine.registerFilter('answer', function (/** @type {string} */ name) {
  if (typeof name !== 'string') {
    return
  }

  const globals = /** @type {GlobalScope} */ (this.context.globals)
  const component = globals.context.componentMap.get(name)

  if (!component?.isFormComponent) {
    return
  }

  const field = /** @type {Field} */ (component)
  const { translator } = globals.context
  const answer = getAnswer(
    field,
    globals.context.relevantState,
    { format: 'summary' },
    translator ?? field.model.createTranslator()
  )

  return answer
})

/**
 * @param {Pick<FormContextRequest, 'method' | 'payload' | 'query'>} request
 * @param {FormResponseToolkit} h
 * @param {string} nextUrl
 */
export function proceed(request, h, nextUrl) {
  const { method, payload, query } = request
  const { returnUrl } = query

  const isReturnAllowed =
    payload && 'action' in payload
      ? payload.action === FormAction.Continue ||
        payload.action === FormAction.Validate
      : false

  // On POST, strip all query params to prevent them persisting across pages.
  // On GET, forward params (minus returnUrl) so pre-population query params
  // survive dispatch redirects (e.g. ?formId= reaching the start page).
  const nextQuery =
    method === 'get' ? stripParam(query, 'returnUrl') : undefined

  // Redirect to return location (optional)
  const response =
    isReturnAllowed && isPathRelative(returnUrl)
      ? h.redirect(returnUrl)
      : h.redirect(redirectPath(nextUrl, nextQuery))

  // Redirect POST to GET to avoid resubmission
  return method === 'post'
    ? response.code(StatusCodes.SEE_OTHER)
    : response.code(StatusCodes.MOVED_TEMPORARILY)
}

/**
 * Encodes a URL, returning undefined if the process fails.
 * @param {string} [link]
 */
export function encodeUrl(link) {
  if (link) {
    try {
      return new URL(link).toString() // escape the search params without breaking the ? and & reserved characters in rfc2368
    } catch (err) {
      logger.error(
        err,
        `[urlEncodingFailed] Failed to encode URL: ${link} - ${getErrorMessage(err)}`
      )
      throw err
    }
  }
}

/**
 * Get page href
 * @overload
 * @param {PageControllerClass} page
 * @param {FormQuery} [query]
 * @returns {string}
 */

/**
 * Get page href by path
 * @overload
 * @param {PageControllerClass} page
 * @param {string} path
 * @param {FormQuery} [query]
 * @returns {string}
 */

/**
 * @param {PageControllerClass} page
 * @param {string | FormQuery} [pathOrQuery]
 * @param {FormQuery} [queryOnly]
 */
export function getPageHref(page, pathOrQuery, queryOnly = {}) {
  const path = typeof pathOrQuery === 'string' ? pathOrQuery : page.path
  const query = typeof pathOrQuery === 'object' ? pathOrQuery : queryOnly

  if (!isPathRelative(path)) {
    throw Error(`Only relative URLs are allowed: ${path}`)
  }

  // Return path with page href as base
  return redirectPath(page.getHref(path), query)
}

/**
 * Get redirect path with optional query params
 * @param {string} nextUrl
 * @param {FormQuery} [query]
 */
export function redirectPath(nextUrl, query = {}) {
  const isRelative = isPathRelative(nextUrl)

  // Filter string query params only
  const params = Object.entries(query).filter(
    /** @returns {query is [string, string]} */
    (query) => typeof query[1] === 'string'
  )

  // Build URL with relative path support
  const url = isRelative
    ? new URL(nextUrl, 'http://example.com')
    : new URL(nextUrl)

  // Append query params
  for (const [name, value] of params) {
    url.searchParams.set(name, value)
  }

  if (isRelative) {
    return `${url.pathname}${url.search}`
  }

  return url.href
}

/**
 * @param {string} [path]
 */
export function isPathRelative(path) {
  return (path ?? '').startsWith('/')
}

export function normalisePath(path = '') {
  return path
    .trim() // Trim empty spaces
    .replace(/^\//, '') // Remove leading slash
    .replace(/\/$/, '') // Remove trailing slash
}

/**
 * @param {FormModel | undefined} model
 * @param {FormContextRequest} request
 * @returns {PageControllerClass}
 */
export function getPage(model, request) {
  const { params } = request

  const page = findPage(model, `/${params.path}`)

  if (!page) {
    throw Boom.notFound(`No page found for /${params.path}`)
  }

  return page
}

/**
 * @param {FormModel | undefined} model
 * @param {string} [path]
 * @returns {PageControllerClass | undefined}
 */
export function findPage(model, path) {
  const findPath = `/${normalisePath(path)}`
  return model?.pages.find(({ path }) => path === findPath)
}

/**
 * @param {FormModel} [model]
 */
export function getStartPath(model) {
  if (model?.engine === Engine.V2) {
    const startPath = normalisePath(model.def.pages.at(0)?.path)
    return startPath ? `/${startPath}` : ControllerPath.Start
  }

  const startPath = normalisePath(model?.def.startPage)
  return startPath ? `/${startPath}` : ControllerPath.Start
}

/**
 * @param {FormParams} [params]
 */
export function checkFormStatus(params) {
  const isPreview = !!params?.state

  let state = FormStatus.Live

  if (isPreview && params.state === FormStatus.Draft) {
    state = FormStatus.Draft
  }

  return {
    isPreview,
    state
  }
}

/**
 * @param {string | undefined} emailAddress
 * @param {boolean} isPreview
 */
export function checkEmailAddressForLiveFormSubmission(
  emailAddress,
  isPreview
) {
  if (!emailAddress && !isPreview) {
    throw Boom.internal(
      'An email address is required to complete the form submission'
    )
  }
}

/**
 * Parses the errors from {@link Schema.validate} so they can be rendered by govuk-frontend templates
 * @param {ValidationErrorItem[]} [details] - provided by {@link Schema.validate}
 * @param {string} [language] - the target language for translations, English by default
 * @returns {FormSubmissionError[] | undefined}
 */
export function getErrors(details, language) {
  if (!details?.length) {
    return
  }

  return details.map((detail) => getError(detail, language))
}

/**
 * @param {ValidationErrorItem} detail
 * @param {string} [language]
 * @returns {FormSubmissionError}
 */
export function getError(detail, language) {
  const { context, message, path } = detail

  const name = context?.key ?? ''
  const href = `#${name}`

  const text = message.replace(
    /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
    (text) =>
      format(parseISO(text), 'd MMMM yyyy', {
        locale: toLanguageLocale(language)
      })
  )

  return {
    path,
    href,
    name,
    text,
    context
  }
}

/**
 * @param {string} componentName
 * @param {string} message
 */
export function createError(componentName, message) {
  return {
    href: `#${componentName}`,
    name: componentName,
    text: message
  }
}

/**
 * Calculates an exponential backoff delay (in milliseconds) based on the current retry depth,
 * using a base delay of 2000ms (2 seconds) and doubling for each additional depth, while capping the delay at 25,000ms (25 seconds).
 * @param {number} depth - The current retry depth (1, 2, 3, …)
 * @returns {number} The calculated delay in milliseconds.
 */
export function getExponentialBackoffDelay(depth) {
  const BASE_DELAY_MS = 2000 // 2 seconds initial delay
  const CAP_DELAY_MS = 25000 // cap each delay to 25 seconds
  const delay = BASE_DELAY_MS * 2 ** (depth - 1)
  return Math.min(delay, CAP_DELAY_MS)
}

/**
 * @param {string} template
 * @param {FormContext} context
 * @returns {string}
 */
export function evaluateTemplate(template, context) {
  /** @type {GlobalScope} */
  const globals = {
    context,
    pages: context.pageDefMap,
    components: context.componentDefMap
  }

  return engine.parseAndRenderSync(template, context.relevantState, {
    globals
  })
}

/**
 * @param {Server} server
 */
export function getCacheService(server) {
  return getPluginOptions(server).cacheService
}

/**
 * @param {Server} server
 */
export function getSaveAndExitHelpers(server) {
  return getPluginOptions(server).saveAndExit
}

/**
 * @param {Server} server
 */
export function getPluginOptions(server) {
  return server.plugins['forms-engine-plugin']
}

/**
 * Handles logging and issuing a permanent redirect for legacy routes.
 * @param {ResponseToolkit} h - The Hapi response toolkit.
 * @param {string} targetUrl - The URL to redirect to.
 * @returns The Hapi response object configured for permanent redirect.
 */
export function handleLegacyRedirect(h, targetUrl) {
  return h.redirect(targetUrl).permanent().takeover()
}

/**
 * If the page doesn't have a title, set it from the title of the first form component
 * @param def - the form definition
 */
/**
 * @typedef {{
 *   versionNumber: number
 *   createdAt: Date
 * }} FormVersionMetadata
 */

/**
 * Extracts form version metadata from a form definition
 * @param {Pick<FormDefinition, 'metadata'>} definition
 * @returns {FormVersionMetadata | undefined}
 */
export function getFormVersion(definition) {
  return /** @type {FormVersionMetadata | undefined} */ (
    definition.metadata?.[FORM_VERSION_METADATA_KEY]
  )
}

const payLanguageCodes = /** @type {Record<string, string>} */ ({
  [EN_GB]: 'en',
  [CY]: 'cy'
})

const languageLocales = /** @type {Record<string, Locale>} */ ({
  [EN_GB]: enGB,
  [CY]: cy
})

const defaultLanguageCode = 'en'
const defaultLanguageLocale = enGB

/**
 * Converts a BCP 47 language tag to the ISO 639-1 code GOV.UK Pay accepts.
 * Defaults to English if the language is not supported.
 * @param { string | undefined } language - BCP 47 language code
 * @returns {string} language code required by GOV.UK Pay
 */
export function toPayLanguageCode(language) {
  return payLanguageCodes[language ?? 'unknown'] ?? defaultLanguageCode
}

/**
 * Converts a BCP 47 language tag to the date-fns Locale (for date formatting).
 * Defaults to English if the language is not supported.
 * @param { string | undefined } language - BCP 47 language code
 * @returns {Locale} language locale
 */
export function toLanguageLocale(language) {
  return languageLocales[language ?? 'unknown'] ?? defaultLanguageLocale
}

/**
 * @import { ComponentDef, FormDefinition, Page } from '@defra/forms-model'
 * @import { ResponseToolkit, Server } from '@hapi/hapi'
 * @import { Locale } from 'date-fns'
 * @import { Schema, ValidationErrorItem } from 'joi'
 * @import { Field } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { FormContext, FormContextRequest, FormSubmissionError } from '~/src/server/plugins/engine/types.js'
 * @import { FormParams, FormQuery, FormResponseToolkit } from '~/src/server/routes/types.js'
 * @import { FormsService } from '~/src/server/types.js'
 */
