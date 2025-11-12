import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/return-url`
const returnUrlQueryString = `?returnUrl=${encodeURIComponent('/return-url/summary')}`

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Return URL tests', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'return-url.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

    await server.initialize()

    // Navigate to start
    const response = await server.inject({
      url: `${basePath}/age`
    })

    // Extract the session cookie
    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Return URL testing', () => {
    it('should go to first invalid page and include returnUrl query string on mid-flow page load with empty state', async () => {
      const response = await server.inject({
        url: `${basePath}/pizza`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/age${returnUrlQueryString}`
      )
    })

    // TODO see how to set the context or make POST work

    it('should go to first invalid page and include returnUrl query string on mid-flow page load without full state', async () => {
      // SET CONTEXT with age but without pizza answer
      const response = await server.inject({
        url: `${basePath}/favourite-pizza`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/pizza${returnUrlQueryString}`
      )
    })

    it('should go to first invalid AND relevant page and include returnUrl query string on mid-flow page load without full state', async () => {
      // SET CONTEXT with age, with pizza anser as NO
      const response = await server.inject({
        url: `${basePath}/favourite-pizza`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/favourite-food${returnUrlQueryString}`
      )
    })

    it('should go to page that changes flow and include returnUrl query string on next unanswered page', async () => {
      // SET CONTEXT with age as yes, pizza answer as no, favourite food as something
      const response = await server.inject({
        url: `${basePath}/pizza${returnUrlQueryString}`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/favourite-pizza${returnUrlQueryString}`
      )
    })

    it('should redirect to summary after POST with full state', async () => {
      const payload = {
        isOverEighteen: 'Some text',
        likesPizza: false,
        favouriteFood: 'Lasagna'
      }
      const response = await server.inject({
        url: `${basePath}/favourite-food`,
        method: 'POST',
        headers,
        payload: { ...payload, crumb: csrfToken }
      })

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(`${basePath}/summary`)
    })

    it('should redirect to exit page (without returnUrl) after POST with age not over 18', async () => {
      const payload = {
        // action: 'continue',
        isOverEighteen: false
      }
      const response = await server.inject({
        url: `${basePath}/age${returnUrlQueryString}`,
        method: 'POST',
        headers,
        payload: { ...payload, crumb: csrfToken }
      })

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(
        `${basePath}/unavailable-service-page`
      )
    })

    // it('should not redirect to summary after POST with full state', async () => {
    //   const payload = {
    //     isOverEighteen: 'Some text',
    //     likesPizza: false
    //   }
    //   const response = await server.inject({
    //     url: `${basePath}/favourite-food${returnUrlQueryString}`,
    //     method: 'POST',
    //     headers,
    //     payload: { ...payload, crumb: csrfToken }
    //   })

    //   console.log(response.headers.location)

    //   expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    //   expect(response.headers.location).not.toBe(`${basePath}/summary`)
    // })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
