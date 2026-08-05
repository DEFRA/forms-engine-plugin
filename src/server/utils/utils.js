import { getTraceId } from '@defra/hapi-tracing'
import Joi from 'joi'

import { config } from '~/src/config/index.js'
import { getPluginOptions } from '~/src/server/plugins/engine/helpers.js'

/**
 * Returns a set of headers to use in an HTTP request, merging them with any existing headers in options.
 * @param {Record<string, string> | undefined} [existingHeaders] - Optional existing headers to merge with the tracing headers.
 * @param {string} [header] - The tracing header name to use.
 * @returns {Record<string, string> | undefined} The merged headers, or undefined if no tracing header is available.
 */
export function applyTraceHeaders(
  existingHeaders,
  header = config.get('tracing').header
) {
  if (!header) {
    return existingHeaders
  }

  const traceId = getTraceId()

  const headers = traceId ? { [header]: traceId } : undefined

  return existingHeaders ? Object.assign(existingHeaders, headers) : headers
}

/**
 * Validates if a string conforms to the uuid structure
 * @param {string} str
 * @returns
 */
export function isValidUUID(str) {
  const { error } = Joi.string().uuid().validate(str)
  return error === undefined
}

/**
 * @param {AnyFormRequest} request
 */
export function resolveLanguage(request) {
  const { getLanguage } = getPluginOptions(request.server)
  return getLanguage?.(request.query, request.yar) ?? 'en-GB'
}

/**
 * Create a comma-separated list with the last seperator being 'or'
 * @param { string[] | undefined } items
 * @param {string} [finalSeparator]
 */
export function joinWithOr(items, finalSeparator = 'or') {
  if (!items || items.length === 0) {
    return ''
  }
  if (items.length === 1) {
    return items[0]
  }
  if (items.length === 2) {
    return `${items[0]} ${finalSeparator} ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')} ${finalSeparator} ${items.at(-1)}`
}

/**
 * @import { AnyFormRequest } from '~/src/server/plugins/engine/types.js'
 */
