import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { PageController } from '~/src/server/plugins/engine/pageControllers/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as httpService from '~/src/server/services/httpService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const basePath = `${FORM_PREFIX}/basic`

jest.mock('~/src/server/services/httpService')
jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Plugin options - page events', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'plugin-options.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request invokes page event', async () => {
    const res = /** @type {IncomingMessage} */ ({
      statusCode: StatusCodes.OK
    })
    jest
      .mocked(httpService.postJson)
      .mockResolvedValueOnce({ res, payload: { backendContext: 'hello' } })

    await renderResponse(server, {
      url: `${basePath}/licence`
    })

    expect(httpService.postJson).toHaveBeenCalledExactlyOnceWith(
      'http://example.com',
      { payload: expect.any(String) }
    )
  })
})

describe('Plugin options - page events with preparePageEventRequestOptions', () => {
  /** @type {Server} */
  let server

  /** @type {jest.Mock} */
  let preparePageEventRequestOptions

  // Create server before each test
  beforeAll(async () => {
    preparePageEventRequestOptions = jest.fn()

    server = await createServer({
      formFileName: 'plugin-options.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      preparePageEventRequestOptions
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request invokes page event and calls preparePageEventRequestOptions', async () => {
    const res = /** @type {IncomingMessage} */ ({
      statusCode: StatusCodes.OK
    })
    jest
      .mocked(httpService.postJson)
      .mockResolvedValueOnce({ res, payload: { backendContext: 'hello' } })

    await renderResponse(server, {
      url: `${basePath}/licence`
    })

    expect(preparePageEventRequestOptions).toHaveBeenCalledExactlyOnceWith(
      { payload: expect.any(String) },
      {
        type: 'http',
        options: {
          method: 'POST',
          url: 'http://example.com'
        }
      },
      expect.any(PageController),
      expect.any(Object)
    )

    expect(httpService.postJson).toHaveBeenCalledExactlyOnceWith(
      'http://example.com',
      { payload: expect.any(String) }
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { IncomingMessage } from 'node:http'
 */
