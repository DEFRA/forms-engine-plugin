import { type Request, type Server } from '@hapi/hapi'
import * as Hoek from '@hapi/hoek'

import { config } from '~/src/config/index.js'
import { type createServer } from '~/src/server/index.js'
import {
  type FormPayload,
  type FormState,
  type FormSubmissionError,
  type FormSubmissionState
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

const partition = 'cache'

export enum ADDITIONAL_IDENTIFIER {
  Confirmation = ':confirmation'
}

export class CacheService {
  /**
   * This service is responsible for getting, storing or deleting a user's session data in the cache. This service has been registered by {@link createServer}
   */
  cache
  generateKey?: (request: Request | FormRequest | FormRequestPayload) => string
  customClearer?: (request: Request | FormRequest | FormRequestPayload) => void
  customFetcher?: (
    request: Request | FormRequest | FormRequestPayload
  ) => Promise<FormSubmissionState | null>

  logger: Server['logger']

  constructor({
    server,
    cacheName,
    options
  }: {
    server: Server
    cacheName?: string
    options?: {
      keyGenerator?: (
        request: Request | FormRequest | FormRequestPayload
      ) => string
      sessionHydrator?: (
        request: Request | FormRequest | FormRequestPayload
      ) => Promise<FormSubmissionState | null>
    }
  }) {
    const { keyGenerator, sessionHydrator } = options ?? {}
    if (!cacheName) {
      server.log(
        'warn',
        'You are using the default hapi cache. Please provide a cache name in plugin registration options.'
      )
    }
    this.generateKey = keyGenerator ?? this.defaultKeyGenerator.bind(this)
    this.customFetcher = sessionHydrator ?? undefined
    this.cache = server.cache({ cache: cacheName, segment: 'formSubmission' })
    this.logger = server.logger
  }

  async getState(
    request: Request | FormRequest | FormRequestPayload
  ): Promise<FormSubmissionState> {
    let cached = await this.cache.get(this.Key(request))

    // If nothing in Redis, attempt to rehydrate from backend DB
    if (!cached && this.customFetcher) {
      const rehydrated = await this.customFetcher(request)

      if (rehydrated != null) {
        await this.cache.set(
          this.Key(request),
          rehydrated,
          config.get('sessionTimeout')
        )
        cached = await this.getState(request)
      }
    }

    return cached || {}
  }

  async setState(
    request: FormRequest | FormRequestPayload,
    state: FormSubmissionState
  ) {
    const key = this.Key(request)
    const ttl = config.get('sessionTimeout')

    await this.cache.set(key, state, ttl)
    return this.getState(request)
  }

  async getConfirmationState(
    request: FormRequest | FormRequestPayload
  ): Promise<{ confirmed?: true }> {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const value = await this.cache.get(key)

    return value || {}
  }

  async setConfirmationState(
    request: FormRequest | FormRequestPayload,
    confirmationState: { confirmed?: true }
  ) {
    const key = this.Key(request, ADDITIONAL_IDENTIFIER.Confirmation)
    const ttl = config.get('confirmationSessionTimeout')

    return this.cache.set(key, confirmationState, ttl)
  }

  async clearState(request: FormRequest | FormRequestPayload) {
    if (request.yar.id) {
      await this.cache.drop(this.Key(request))
    }
  }

  getFlash(
    request: FormRequest | FormRequestPayload
  ): { errors: FormSubmissionError[] } | undefined {
    const key = this.Key(request)
    const messages = request.yar.flash(key.id)

    if (Array.isArray(messages) && messages.length) {
      return messages.at(0) as { errors: FormSubmissionError[] }
    }
  }

  setFlash(
    request: FormRequest | FormRequestPayload,
    message: { errors: FormSubmissionError[] }
  ) {
    const key = this.Key(request)

    request.yar.flash(key.id, message)
  }

  private defaultKeyGenerator(
    request: Request | FormRequest | FormRequestPayload
  ): string {
    if (!request.yar.id) {
      throw new Error('No session ID found')
    }

    const state = request.params.state ?? ''
    const slug = request.params.slug ?? ''
    return `${request.yar.id}:${state}:${slug}:`
  }

  /**
   * The key used to store user session data against.
   * If there are multiple forms on the same runner instance, for example `form-a` and `form-a-feedback` this will prevent CacheService from clearing data from `form-a` if a user gave feedback before they finished `form-a`
   * @param request - hapi request object
   * @param additionalIdentifier - appended to the id
   */
  Key(
    request: Request | FormRequest | FormRequestPayload,
    additionalIdentifier?: ADDITIONAL_IDENTIFIER
  ) {
    const baseKey = this.generateKey
      ? this.generateKey(request)
      : this.defaultKeyGenerator(request)

    return {
      segment: partition,
      id: `${baseKey}${additionalIdentifier ?? ''}`
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
