import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { find, nearest } from '~/src/server/plugins/map/service.js'
import { result as findResult } from '~/src/server/plugins/map/test/__stubs__/find.js'
import { result as nearestResult } from '~/src/server/plugins/map/test/__stubs__/nearest.js'
const basePath = `${FORM_PREFIX}/api`

jest.mock('~/src/server/plugins/map/service.js')

describe('Map API routes', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer({
      enforceCsrf: true,
      ordnanceSurveyApiKey: 'dummy'
    })

    await server.initialize()
  })

  it('should get geocode results', async () => {
    jest.mocked(find).mockResolvedValueOnce(findResult)

    const response = await server.inject({
      url: `${basePath}/geocode-proxy?query=NW1%206XE`,
      method: 'GET'
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.result).toEqual(findResult)
  })

  it('should get reverse geocode results', async () => {
    jest.mocked(nearest).mockResolvedValueOnce(nearestResult)

    const response = await server.inject({
      url: `${basePath}/reverse-geocode-proxy?easting=523065&northing=185795`,
      method: 'GET'
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.result).toEqual(nearestResult)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
