import { createServer } from '~/src/server/index.js'
import { getCookie } from '~/test/utils/get-cookie.js'

describe('Page Events Demo Journey', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let sessionCookie

  /** @type {string} */
  let crumbCookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    // Initial GET request to start session
    const getRes = await server.inject({
      method: 'GET',
      url: '/page-events-demo/your-name'
    })

    sessionCookie = getCookie(getRes, 'session')
    crumbCookie = getCookie(getRes, 'crumb')
  })

  afterAll(async () => {
    await server.stop()
  })

  const postSteps = [
    {
      path: '/page-events-demo/your-name',
      expectedNextPath: '/page-events-demo/date-of-birth',
      payload: {
        applicantFirstName: 'Alex',
        applicantLastName: 'Smith'
      }
    },
    {
      path: '/page-events-demo/date-of-birth',
      expectedNextPath: '/page-events-demo/summary',
      payload: {
        dateOfBirth__day: '1',
        dateOfBirth__month: '1',
        dateOfBirth__year: '1990'
      }
    },
    {
      path: '/page-events-demo/summary',
      expectedNextPath: undefined,
      payload: {}
    }
  ]

  it.each(postSteps)(
    'POST %s should redirect to %s',
    async ({ path, expectedNextPath, payload }) => {
      const headers = {
        cookie: `session=${sessionCookie.trim()};crumb=${crumbCookie.trim()}`
      }
      const res = await server.inject({
        method: 'POST',
        url: path,
        payload: { ...payload, crumb: crumbCookie },
        headers
      })
      expect(res.headers.location).toBe(expectedNextPath)
      expect(res.statusCode).toBe(303)
      // crumbCookie = getCookie(res, 'crumb') // Uncomment if crumb changes per step
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 */
