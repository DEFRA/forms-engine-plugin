import * as Hoek from '@hapi/hoek'
import unset from 'lodash/unset.js'

import { config } from '~/src/config/index.js'

const partition = 'cache'

/** @type {{ readonly Confirmation: ':confirmation' }} */
export const ADDITIONAL_IDENTIFIER = {
  Confirmation: ':confirmation'
}

export class CacheService {
  /**
   * This service is responsible for getting, storing or deleting a user's session data in the cache. This service has been registered by {@link createServer}
   */
  cache

  /** @type {Server['logger']} */
  logger

  /**
   * @param {{ server: Server, cacheName?: string }} param0
   */
  constructor({ server, cacheName }) {
    if (!cacheName) {
      server.log(
        'warn',
        'You are using the default hapi cache. Please provide a cache name in plugin registration options.'
      )
    }

    this.cache = server.cache({ cache: cacheName, segment: 'formSubmission' })
    this.logger = server.logger
  }

  /**
   * @param {CacheRequest} request
   * @returns {Promise<FormSubmissionState>}
   */
  async getState(request) {
    const key = this.Key(request)
    const cached = await this.cache.get(key)

    return cached ?? {}
  }

  /**
   * @param {CacheRequest} request
   * @param {FormSubmissionState} state
   */
  async setState(request, state) {
    const key = this.Key(request)
    const ttl = config.get('sessionTimeout')

    await this.cache.set(key, state, ttl)

    return this.getState(request)
  }

  /**
   * @param {CacheRequest} request
   * @returns {Promise<FormConfirmationState>}
   */
  async getConfirmationState(request) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const value = await this.cache.get(key)

    return value ?? {}
  }

  /**
   * @param {CacheRequest} request
   * @param {FormConfirmationState} confirmationState
   */
  async setConfirmationState(request, confirmationState) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const ttl = config.get('confirmationSessionTimeout')

    return this.cache.set(key, confirmationState, ttl)
  }

  /**
   * @param {CacheRequest} request
   */
  async clearState(request) {
    if (request.yar.id) {
      await this.cache.drop(this.Key(request))
    }
  }

  /**
   * @param {AnyFormRequest} request
   * @returns {{ errors: FormSubmissionError[] } | undefined}
   */
  getFlash(request) {
    const key = this.Key(request)
    const messages = request.yar.flash(key.id)

    if (Array.isArray(messages) && messages.length) {
      return messages.at(0)
    }
  }

  /**
   * @param {AnyFormRequest} request
   * @param {{ errors: FormSubmissionError[] }} message
   */
  setFlash(request, message) {
    const key = this.Key(request)

    request.yar.flash(key.id, message)
  }

  /**
   * Resets (removes) component states from the form state by their keys.
   * Supports both flat keys and nested paths.
   * @param {CacheRequest} request - The Hapi request object
   * @param {string[]} componentNames - Array of state keys to remove. Uses lodash's unset syntax. Can be:
   * - Flat keys: `'componentName'` for top-level state
   * - Nested paths: `"upload['/my-page']"` or `'upload./my-page'` for nested state
   * @example
   * ```typescript
   * // Remove a flat component state
   * await cacheService.resetComponentStates(request, ['emailAddress'])
   *
   * // Remove nested upload state for a specific page
   * await cacheService.resetComponentStates(request, ["upload['/file-upload-page']"])
   *
   * // Remove multiple states at once
   * await cacheService.resetComponentStates(request, [
   *   'componentName',
   *   "upload['/my-page']"
   * ])
   * ```
   * @returns The updated state after removal
   */
  async resetComponentStates(request, componentNames) {
    const state = await this.getState(request)

    for (const componentName of componentNames) {
      unset(state, componentName)
    }

    return this.setState(request, state)
  }

  /**
   * The key used to store user session data against.
   * If there are multiple forms on the same runner instance, for example `form-a` and `form-a-feedback` this will prevent CacheService from clearing data from `form-a` if a user gave feedback before they finished `form-a`
   * @param {CacheRequest} request - hapi request object
   * @param {ADDITIONAL_IDENTIFIER} [additionalIdentifier] - appended to the id
   */
  Key(request, additionalIdentifier) {
    if (!request.yar.id) {
      throw new Error('No session ID found')
    }

    const state = request.params.state ?? ''
    const slug = request.params.slug ?? ''
    const key = `${request.yar.id}:${state}:${slug}:`

    return {
      segment: partition,
      id: `${key}${additionalIdentifier ?? ''}`
    }
  }
}

/**
 * State merge helper
 * 1. Merges objects (form fields)
 * 2. Overwrites arrays
 * @template {FormState | FormPayload} StateType
 * @param {StateType} state
 * @param {object} update
 * @returns {StateType}
 */
export function merge(state, update) {
  return Hoek.merge(state, update, {
    mergeArrays: false
  })
}

/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects indexed access on `typeof`; tsc reads it */
/**
 * @typedef {(typeof ADDITIONAL_IDENTIFIER)[keyof typeof ADDITIONAL_IDENTIFIER]} ADDITIONAL_IDENTIFIER
 */
/* eslint-enable jsdoc/valid-types */

/**
 * @import { Server } from '@hapi/hapi'
 * @import { createServer } from '~/src/server/index.js'
 * @import { AnyFormRequest, CacheRequest, FormConfirmationState, FormPayload, FormState, FormSubmissionError, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
