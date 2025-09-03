import { join } from 'path'

import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/minimal`

class NewCacheService extends CacheService {
  /**
   *
   * @param {AnyRequest} _request
   * @param {ADDITIONAL_IDENTIFIER} [_additionalIdentifier]
   * @returns
   */
  Key(_request, _additionalIdentifier) {
    return {
      segment: 'irrelevant',
      id: 'my-custom-identifier'
    }
  }
}

describe('CacheService', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  afterAll(async () => {
    await server.stop()
  })

  test('the new cache service is utilised', async () => {
    // Spy on CatboxMemory.prototype.set globally
    const setStateSpy = jest.spyOn(NewCacheService.prototype, 'setState')
    const catboxSetSpy = jest.spyOn(CatboxMemory.prototype, 'set')

    server = await createServer({
      formFileName: 'minimal.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      cacheServiceClass: NewCacheService
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}/start`,
      headers
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])

    // Submit answers
    await server.inject({
      url: `${basePath}/start`,
      method: 'POST',
      headers,
      payload: {
        crumb: csrfToken,
        field: 'value'
      }
    })

    // assert our new custom cache is used
    expect(setStateSpy).toHaveBeenCalled()
    setStateSpy.mockRestore()

    // Assert the custom ID 'my-custom-identifier' is used
    expect(catboxSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-custom-identifier',
        segment: 'formSubmission'
      }),
      expect.any(Object),
      expect.any(Number)
    )
    catboxSetSpy.mockRestore()
  })

  test('the default cache service is utilised', async () => {
    // Spy on CatboxMemory.prototype.set globally
    const setStateSpy = jest.spyOn(CacheService.prototype, 'setState')

    server = await createServer({
      formFileName: 'minimal.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}/start`,
      headers
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])

    // Submit answers
    await server.inject({
      url: `${basePath}/start`,
      method: 'POST',
      headers,
      payload: {
        crumb: csrfToken,
        field: 'value'
      }
    })

    // assert our new custom cache is used
    expect(setStateSpy).toHaveBeenCalled()
    setStateSpy.mockRestore()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { AnyFormRequest, AnyRequest, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 * @import { ADDITIONAL_IDENTIFIER } from '~/src/server/services/cacheService.js'
 */
