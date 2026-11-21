import Wreck from '@hapi/wreck'

import { applyTraceHeaders } from '~/src/server/utils/utils.js'

/**
 * @typedef {keyof Pick<typeof Wreck, 'get' | 'post' | 'put' | 'delete'>} Method
 */

/**
 * @typedef {Parameters<typeof Wreck.defaults>[0]} RequestOptions
 */

/**
 * @template [BodyType=Buffer]
 * @param {Method} method
 * @param {string} url
 * @param {RequestOptions} [options]
 */
export const request = async (method, url, options) => {
  const headers = applyTraceHeaders(options?.headers)

  const mergedOptions = { ...options, headers }

  const { res, payload } =
    await /** @type {ReturnType<typeof Wreck.get<BodyType>>} */ (
      Wreck[method](url, mergedOptions)
    )

  if (!res.statusCode || res.statusCode < 200 || res.statusCode > 299) {
    return { res, error: payload || new Error('Unknown error') }
  }

  return { res, payload }
}

/**
 * @template BodyType
 * @param {string} url
 * @param {RequestOptions} [options]
 */
export const get = (url, options) => {
  return /** @type {typeof request<BodyType>} */ (request)('get', url, options)
}

/**
 * @template {object} BodyType
 * @param {string} url
 */
export const getJson = (url) => {
  return /** @type {typeof get<BodyType>} */ (get)(url, { json: true })
}

/**
 * @template BodyType
 * @param {string} url
 * @param {RequestOptions} options
 */
export const post = (url, options) => {
  return /** @type {typeof request<BodyType>} */ (request)('post', url, options)
}

/**
 * @template {object} BodyType
 * @param {string} url
 * @param {RequestOptions} options
 */
export const postJson = (url, options) => {
  return /** @type {typeof post<BodyType>} */ (post)(url, {
    ...options,
    json: true
  })
}

/**
 * @template BodyType
 * @param {string} url
 * @param {RequestOptions} options
 */
export const put = (url, options) => {
  return /** @type {typeof request<BodyType>} */ (request)('put', url, options)
}
