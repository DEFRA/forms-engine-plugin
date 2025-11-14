import { resolve } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Joined conditions functional tests', () => {
  describe('Simple joined conditions (V2)', () => {
    const basePath = `${FORM_PREFIX}/joined-conditions-simple-v2`

    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer({
        formFileName: 'joined-conditions-simple-v2.js',
        formFilePath: resolve(import.meta.dirname, 'definitions')
      })
      await server.initialize()
    })

    beforeEach(() => {
      jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    })

    afterAll(async () => {
      await server.stop()
    })

    describe('Basic navigation', () => {
      test('GET /name returns 200', async () => {
        const res = await server.inject({
          url: `${basePath}/name`
        })

        expect(res.statusCode).toBe(StatusCodes.OK)
      })

      test('GET /age without session redirects to /name', async () => {
        const res = await server.inject({
          url: `${basePath}/age`
        })

        expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(res.headers.location).toBe(`${basePath}/name`)
      })

      test('GET /simple-and-page without session redirects to /name', async () => {
        const res = await server.inject({
          url: `${basePath}/simple-and-page`
        })

        expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(res.headers.location).toBe(`${basePath}/name`)
      })
    })

    describe('Condition: is Bob', () => {
      test('POST /name with "Bob" allows access to /age', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Bob' }
        })

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res1.headers.location).toBe(`${basePath}/age`)

        const headers = getCookieHeader(res1, 'session')
        const res2 = await server.inject({
          url: `${basePath}/age`,
          headers
        })

        expect(res2.statusCode).toBe(StatusCodes.OK)
      })

      test('POST /name with "Alice" skips /age and goes to /summary', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Alice' }
        })

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res1.headers.location).toBe(`${basePath}/summary`)

        const headers = getCookieHeader(res1, 'session')
        const res2 = await server.inject({
          url: `${basePath}/age`,
          headers
        })

        expect(res2.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect([`${basePath}/summary`, `${basePath}/status`]).toContain(
          res2.headers.location
        )
      })

      test('POST /name with "bob" (lowercase) skips /age', async () => {
        const res = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'bob' }
        })

        expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res.headers.location).toBe(`${basePath}/summary`)
      })
    })

    describe('Joined condition: is Bob AND over 18', () => {
      test('Bob who is over 18 can access /simple-and-page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Bob' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/age`,
          method: 'POST',
          headers,
          payload: { isOverEighteen: true }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/simple-and-page`)

        const res3 = await server.inject({
          url: `${basePath}/simple-and-page`,
          headers
        })

        expect(res3.statusCode).toBe(StatusCodes.OK)
      })

      test('Bob who is NOT over 18 skips /simple-and-page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Bob' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/age`,
          method: 'POST',
          headers,
          payload: { isOverEighteen: false }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/summary`)

        const res3 = await server.inject({
          url: `${basePath}/simple-and-page`,
          headers
        })

        expect(res3.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect([`${basePath}/summary`, `${basePath}/status`]).toContain(
          res3.headers.location
        )
      })

      test('Alice (any age) cannot access /simple-and-page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Alice' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/simple-and-page`,
          headers
        })

        expect(res2.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect([`${basePath}/summary`, `${basePath}/status`]).toContain(
          res2.headers.location
        )
      })
    })

    describe('Complete form flows', () => {
      test('Bob over 18: name -> age -> simple-and-page -> summary', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Bob' }
        })

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res1.headers.location).toBe(`${basePath}/age`)

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/age`,
          method: 'POST',
          headers,
          payload: { isOverEighteen: true }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/simple-and-page`)

        const res3 = await server.inject({
          url: `${basePath}/simple-and-page`,
          method: 'POST',
          headers,
          payload: {}
        })

        expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res3.headers.location).toBe(`${basePath}/summary`)
      })

      test('Bob under 18: name -> age -> summary', async () => {
        const res1 = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Bob' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/age`,
          method: 'POST',
          headers,
          payload: { isOverEighteen: false }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/summary`)
      })

      test('Alice: name -> summary', async () => {
        const res = await server.inject({
          url: `${basePath}/name`,
          method: 'POST',
          payload: { userName: 'Alice' }
        })

        expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res.headers.location).toBe(`${basePath}/summary`)
      })
    })
  })

  describe('Complex joined conditions (V2)', () => {
    const basePath = `${FORM_PREFIX}/joined-conditions-complex-v2`

    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer({
        formFileName: 'joined-conditions-complex-v2.js',
        formFilePath: resolve(import.meta.dirname, 'definitions')
      })
      await server.initialize()
    })

    beforeEach(() => {
      jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    })

    afterAll(async () => {
      await server.stop()
    })

    describe('Complex OR condition: likes blue OR red OR green', () => {
      test('User who likes blue can access /occupation', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Test User' }
        })

        const headers = getCookieHeader(res1, 'session')

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res1.headers.location).toBe(`${basePath}/what-is-your-dob`)

        const res2 = await server.inject({
          url: res1.headers.location ?? '',
          method: 'POST',
          headers,
          payload: {
            eNanXF__day: 1,
            eNanXF__month: 1,
            eNanXF__year: 1990
          }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/favourite-color`)

        const res3 = await server.inject({
          url: res2.headers.location ?? '',
          method: 'POST',
          headers,
          payload: { favoriteColor: 'blue' }
        })

        expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res3.headers.location).toBe(`${basePath}/occupation`)
      })

      test('User who likes red can access /occupation', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Test User' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: res1.headers.location ?? '',
          method: 'POST',
          headers,
          payload: {
            eNanXF__day: 1,
            eNanXF__month: 1,
            eNanXF__year: 1990
          }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/favourite-color`)

        const res3 = await server.inject({
          url: res2.headers.location ?? '',
          method: 'POST',
          headers,
          payload: { favoriteColor: 'red' }
        })

        expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res3.headers.location).toBe(`${basePath}/occupation`)
      })

      test('User who likes yellow skips /occupation', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Test User' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: res1.headers.location ?? '',
          method: 'POST',
          headers,
          payload: {
            eNanXF__day: 1,
            eNanXF__month: 1,
            eNanXF__year: 1990
          }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res2.headers.location).toBe(`${basePath}/favourite-color`)

        const res3 = await server.inject({
          url: res2.headers.location ?? '',
          method: 'POST',
          headers,
          payload: { favoriteColor: 'yellow' }
        })

        expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)
        expect(res3.headers.location).toBe(`${basePath}/summary`)
      })
    })

    describe('Nested condition: (Bob AND born 01/01/2001) AND (likes blue OR red OR green)', () => {
      test('Bob born on 01/01/2001 who likes blue can access /complex-nested-page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Bob' }
        })

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: res1.headers.location ?? '',
          method: 'POST',
          headers,
          payload: { DaBGpS: true }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)

        const res3 = await server.inject({
          url: res2.headers.location ?? '',
          method: 'POST',
          headers,
          payload: {
            eNanXF__day: 1,
            eNanXF__month: 1,
            eNanXF__year: 2001
          }
        })

        expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)

        const res4 = await server.inject({
          url: res3.headers.location ?? '',
          method: 'POST',
          headers,
          payload: { favoriteColor: 'blue' }
        })

        expect(res4.statusCode).toBe(StatusCodes.SEE_OTHER)

        const res5 = await server.inject({
          url: res4.headers.location ?? '',
          method: 'POST',
          headers,
          payload: { occupation: 'developer' }
        })

        expect(res5.statusCode).toBe(StatusCodes.SEE_OTHER)

        const res6 = await server.inject({
          url: `${basePath}/complex-nested-page`,
          headers
        })

        expect(res6.statusCode).toBe(StatusCodes.OK)
      })

      test('Bob born on different date who likes blue cannot access /complex-nested-page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Bob' }
        })

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        const headers = getCookieHeader(res1, 'session')

        const res6 = await server.inject({
          url: `${basePath}/complex-nested-page`,
          headers
        })

        expect(res6.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect(res6.headers.location).toBe(`${basePath}/are-you-over-18`)
      })

      test('Alice born on 01/01/2001 who likes blue cannot access /complex-nested-page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Alice' }
        })

        expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
        const headers = getCookieHeader(res1, 'session')

        expect(res1.headers.location).toBe(`${basePath}/what-is-your-dob`)

        const res2 = await server.inject({
          url: `${basePath}/complex-nested-page`,
          headers
        })

        expect(res2.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
        expect([
          `${basePath}/summary`,
          `${basePath}/status`,
          `${basePath}/what-is-your-dob`
        ]).toContain(res2.headers.location)
      })
    })

    describe('Complex OR with nested AND: (Bob OR over 18 OR (Bob AND over 18)) OR developer', () => {
      test('Developer can access /occupation page', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'John' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/occupation`,
          method: 'POST',
          headers,
          payload: { occupation: 'developer' }
        })

        expect(res2.statusCode).toBe(StatusCodes.SEE_OTHER)
      })

      test('Bob (any age) satisfies the condition', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Bob' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/are-you-over-18`,
          headers
        })

        expect(res2.statusCode).toBe(StatusCodes.OK)
      })

      test('Non-Bob over 18 satisfies the condition', async () => {
        const res1 = await server.inject({
          url: `${basePath}/what-is-your-name`,
          method: 'POST',
          payload: { fsZNJr: 'Alice' }
        })

        const headers = getCookieHeader(res1, 'session')

        const res2 = await server.inject({
          url: `${basePath}/are-you-over-18`,
          headers
        })

        expect(res2.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
