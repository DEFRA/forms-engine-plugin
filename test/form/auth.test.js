import { join } from 'node:path'

import basic from '@hapi/basic'
import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const basePath = `${FORM_PREFIX}/basic`

// Example basic auth user repository
/** @type {Record<string, TestUser | undefined>} */
const users = {
  john: {
    username: 'john',
    password: 'secret',
    name: 'John Doe',
    id: '2133d32a'
  }
}

/**
 * Example basic auth user validator
 * @param {Request} request
 * @param {string} username
 * @param {string} password
 * @param {ResponseToolkit} _h
 */
function validate(request, username, password, _h) {
  const user = users[username]

  if (!user) {
    return { credentials: null, isValid: false }
  }

  const isValid = password === user.password
  const credentials = { user }

  return { isValid, credentials }
}

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Auth', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      onRequest: (request /*, params, definition, metadata */) => {
        const { auth } = request

        if (!auth.isAuthenticated) {
          throw Boom.unauthorized()
        }
      }
    })

    // Register basic auth strategy and set it to the default
    await server.register(basic)
    server.auth.strategy('simple', 'basic', { validate })
    server.auth.default('simple')

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request to restricted form returns 403 Forbidden', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/licence`
    })

    expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  test('authenticated get request to restricted form returns 200 OK', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/licence`,
      headers: {
        authorization: `Basic ${btoa('john:secret')}`
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
  })
})

/**
 * @typedef {{
 *   username: string,
 *   password: string,
 *   name: string,
 *   id: string
 * }} TestUser
 */

/**
 * @import { Request, ResponseToolkit, Server } from '@hapi/hapi'
 */
