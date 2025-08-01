import nock from 'nock'

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
    // Configure nock before server is constructed
    nock('http://localhost:3009')
      .persist()
      .post('/api/example/on-load-page')
      .reply(200, {
        submissionEvent: 'GET',
        submissionReferenceNumber: 'FOO-BAR-123'
      })
      .post('/api/example/on-summary')
      .reply(200, {
        calculatedAge: '900',
        submissionEvent: 'POST',
        submissionReferenceNumber: 'FOO-BAR-123'
      })

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
    nock.cleanAll()
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
      expectedNextPath: '/page-events-demo/status',
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
      // crumbCookie = getCookie(res, 'crumb')
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 */
