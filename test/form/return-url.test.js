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
    it('should go to first invalid page and include returnUrl when loading summary page with empty state', async () => {
      const response = await server.inject({
        url: `${basePath}/summary`
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/age${returnUrlQueryString}`
      )
    })

    it('should go to first invalid page and include returnUrl when loading summary page without full state', async () => {
      // set context with age but without pizza answer
      const payload = {
        isOverEighteen: true
      }
      await server.inject({
        url: `${basePath}/age`,
        method: 'POST',
        headers,
        payload: { ...payload, crumb: csrfToken }
      })

      // trying to load favourite pizza page without pizza answer in context
      const response = await server.inject({
        method: 'GET',
        url: `${basePath}/summary`,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/pizza${returnUrlQueryString}`
      )
    })

    it('should go to first invalid AND relevant page and include returnUrl when loading summary page without full state', async () => {
      // set context with age, with pizza answer as no
      const agePayload = {
        isOverEighteen: true
      }
      await server.inject({
        url: `${basePath}/age`,
        method: 'POST',
        headers,
        payload: { ...agePayload, crumb: csrfToken }
      })
      const pizzaPayload = {
        likesPizza: false
      }
      await server.inject({
        url: `${basePath}/pizza`,
        method: 'POST',
        headers,
        payload: { ...pizzaPayload, crumb: csrfToken }
      })

      const response = await server.inject({
        method: 'GET',
        url: `${basePath}/summary`,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/favourite-food${returnUrlQueryString}`
      )
    })

    it('should redirect to exit page (without returnUrl) when loading summary page with age not over 18', async () => {
      const payload = {
        isOverEighteen: false
      }
      await server.inject({
        url: `${basePath}/age`,
        method: 'POST',
        headers,
        payload: { ...payload, crumb: csrfToken }
      })

      const response = await server.inject({
        method: 'GET',
        url: `${basePath}/summary`,
        headers
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(
        `${basePath}/unavailable-service-page`
      )
    })

    it('should redirect to summary after POST with full state', async () => {
      const agePayload = {
        isOverEighteen: true
      }
      await server.inject({
        url: `${basePath}/age`,
        method: 'POST',
        headers,
        payload: { ...agePayload, crumb: csrfToken }
      })
      const pizzaPayload = {
        likesPizza: false
      }
      await server.inject({
        url: `${basePath}/pizza`,
        method: 'POST',
        headers,
        payload: { ...pizzaPayload, crumb: csrfToken }
      })
      const foodPayload = {
        favouriteFood: 'Lasagna'
      }
      const response = await server.inject({
        url: `${basePath}/favourite-food`,
        method: 'POST',
        headers,
        payload: { ...foodPayload, crumb: csrfToken }
      })

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
      expect(response.headers.location).toBe(`${basePath}/summary`)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
