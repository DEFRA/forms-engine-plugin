import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { find, nearest } from '~/src/server/plugins/map/service.js'
import { result as findResult } from '~/src/server/plugins/map/test/__stubs__/find.js'
import { result as nearestResult } from '~/src/server/plugins/map/test/__stubs__/nearest.js'
import { request } from '~/src/server/services/httpService.js'

const basePath = `${FORM_PREFIX}/api`

jest.mock('~/src/server/plugins/map/service.js')
jest.mock('~/src/server/services/httpService.ts')

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

  it('should get map proxy results', async () => {
    const res = /** @type {IncomingMessage} */ ({
      headers: {
        'content-type': 'application/json'
      }
    })

    jest.mocked(request).mockResolvedValueOnce({
      res,
      payload: Buffer.from(JSON.stringify({}))
    })

    const urlToProxy = 'http://example.com?srs=3857'
    const response = await server.inject({
      url: `${basePath}/map-proxy?url=${encodeURIComponent(urlToProxy)}`,
      method: 'GET'
    })

    expect(request).toHaveBeenCalledWith(
      'get',
      'http://example.com/?srs=3857&key=dummy'
    )
    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8'
    )
    expect(response.result).toBe('{}')
  })

  it('should get map proxy results and set SRS if not present in the original request', async () => {
    const res = /** @type {IncomingMessage} */ ({
      headers: {
        'content-type': 'application/json'
      }
    })

    jest.mocked(request).mockResolvedValueOnce({
      res,
      payload: Buffer.from(JSON.stringify({}))
    })

    const urlToProxy = 'http://example.com'
    const response = await server.inject({
      url: `${basePath}/map-proxy?url=${encodeURIComponent(urlToProxy)}`,
      method: 'GET'
    })

    expect(request).toHaveBeenCalledWith(
      'get',
      'http://example.com/?key=dummy&srs=3857'
    )
    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.headers['content-type']).toBe(
      'application/json; charset=utf-8'
    )
    expect(response.result).toBe('{}')
  })

  it('should get map proxy results and not set content type if not present proxied response', async () => {
    const res = /** @type {IncomingMessage} */ ({
      headers: {}
    })

    jest.mocked(request).mockResolvedValueOnce({
      res,
      payload: Buffer.from(JSON.stringify({}))
    })

    const urlToProxy = 'http://example.com'
    const response = await server.inject({
      url: `${basePath}/map-proxy?url=${encodeURIComponent(urlToProxy)}`,
      method: 'GET'
    })

    expect(request).toHaveBeenCalledWith(
      'get',
      'http://example.com/?key=dummy&srs=3857'
    )
    expect(response.statusCode).toBe(StatusCodes.OK)
    expect(response.headers['content-type']).toBe('application/octet-stream')
    expect(response.result).toBe('{}')
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
 * @import { IncomingMessage } from 'node:http'
 * @import { Server } from '@hapi/hapi'
 */
