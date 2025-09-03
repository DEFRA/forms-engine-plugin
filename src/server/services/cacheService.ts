import { type Server } from '@hapi/hapi'
import * as Hoek from '@hapi/hoek'

import { config } from '~/src/config/index.js'
import { type createServer } from '~/src/server/index.js'
import {
  type AnyFormRequest,
  type AnyRequest,
  type FormPayload,
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'

const partition = 'cache'

export enum ADDITIONAL_IDENTIFIER {
  Confirmation = ':confirmation'
}

export class CacheService {
  /**
   * This service is responsible for getting, storing or deleting a user's session data in the cache. This service has been registered by {@link createServer}
   */
  cache
  logger: Server['logger']

  constructor({ server, cacheName }: { server: Server; cacheName?: string }) {
    if (!cacheName) {
      server.log(
        'warn',
        'You are using the default hapi cache. Please provide a cache name in plugin registration options.'
      )
    }

    this.cache = server.cache({ cache: cacheName, segment: 'formSubmission' })
    this.logger = server.logger
  }

  async getState(request: AnyRequest): Promise<FormSubmissionState> {
    const key = this.Key(request)
    const cached = await this.cache.get(key)

    return cached ?? {}
  }

  async setState(request: AnyFormRequest, state: FormSubmissionState) {
    const key = this.Key(request)
    const ttl = config.get('sessionTimeout')

    await this.cache.set(key, state, ttl)

    return this.getState(request)
  }

  async getConfirmationState(
    request: AnyFormRequest
  ): Promise<{ confirmed?: true }> {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const value = await this.cache.get(key)

    return value ?? {}
  }

  async setConfirmationState(
    request: AnyFormRequest,
    confirmationState: { confirmed?: true }
  ) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const ttl = config.get('confirmationSessionTimeout')

    return this.cache.set(key, confirmationState, ttl)
  }

  async clearState(request: AnyFormRequest) {
    if (request.yar.id) {
      await this.cache.drop(this.Key(request))
    }
  }

  getFlash(
    request: AnyFormRequest
  ): { errors: FormSubmissionError[] } | undefined {
    const key = this.Key(request)
    const messages = request.yar.flash(key.id)

    if (Array.isArray(messages) && messages.length) {
      return messages.at(0) as { errors: FormSubmissionError[] }
    }
  }

  setFlash(
    request: AnyFormRequest,
    message: { errors: FormSubmissionError[] }
  ) {
    const key = this.Key(request)

    request.yar.flash(key.id, message)
  }

  /**
   * The key used to store user session data against.
   * If there are multiple forms on the same runner instance, for example `form-a` and `form-a-feedback` this will prevent CacheService from clearing data from `form-a` if a user gave feedback before they finished `form-a`
   * @param request - hapi request object
   * @param additionalIdentifier - appended to the id
   */
  Key(request: AnyRequest, additionalIdentifier?: ADDITIONAL_IDENTIFIER) {
    if (!request.yar.id) {
      throw new Error('No session ID found')
    }

    const state = (request.params.state as string) || ''
    const slug = (request.params.slug as string) || ''
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
 */
export function merge<StateType extends FormState | FormPayload>(
  state: StateType,
  update: object
): StateType {
  return Hoek.merge(state, update, {
    mergeArrays: false
  })
}
