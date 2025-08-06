import { type Server } from '@hapi/hapi'
// eslint-disable-next-line n/no-unpublished-import -- not sure why this is triggering, it's not a private module
import MockDate from 'mockdate'

import { createServer } from '~/src/server/index.js'

describe('Dummy API', () => {
  let server: Server

  const payload = {
    meta: {
      referenceNumber: 'FOO-BAR-123'
    },
    data: {
      main: {
        applicantFirstName: 'Joe',
        applicantLastName: 'Bloggs',
        dateOfBirth: '2020-01-01'
      }
    }
  }

  beforeAll(async () => {
    MockDate.set('2025-01-01T00:00:00Z')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    MockDate.reset()
  })

  it('should validate on-load-page POST response', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/example/on-load-page',
      payload
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toMatchObject({
      submissionEvent: 'GET',
      submissionReferenceNumber: payload.meta.referenceNumber
    })
  })

  /*
  This is just dummy code that won't run in prod, we don't need a full suite of tests.
  */
  it('should validate on-summary POST response', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/example/on-summary',
      payload
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toMatchObject({
      calculatedAge: 5,
      submissionEvent: 'POST',
      submissionReferenceNumber: payload.meta.referenceNumber
    })
  })

  it('should calculate age correctly when birthday has not occurred yet this year', async () => {
    // Set today's date to just before the birthday in 2025
    MockDate.set('2025-01-01T00:00:00Z')

    const payloadWithFutureBirthday = {
      meta: {
        referenceNumber: 'FOO-BAR-456'
      },
      data: {
        main: {
          applicantFirstName: 'Jane',
          applicantLastName: 'Doe',
          dateOfBirth: '2020-02-01' // Birthday is in February, today is January
        }
      }
    }

    const res = await server.inject({
      method: 'POST',
      url: '/api/example/on-summary',
      payload: payloadWithFutureBirthday
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toMatchObject({
      calculatedAge: 4, // Should be 4, not 5, because birthday hasn't occurred yet
      submissionEvent: 'POST',
      submissionReferenceNumber: payloadWithFutureBirthday.meta.referenceNumber
    })
  })
})
