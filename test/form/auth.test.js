import { join } from 'node:path'

import basic from '@hapi/basic'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/basic`

const users = {
  john: {
    profile: {
      username: 'john',
      password: 'secret',
      name: 'John Doe',
      id: '2133d32a'
    },
    scope: ['form-auth-read', 'read', 'write']
  }
}

const validate = async (request, username, password, h) => {
  const user = users[username]
  if (!user) {
    return { credentials: null, isValid: false }
  }

  const isValid = password === user.profile.password
  const credentials = { user: user.profile, scope: user.scope }

  return { isValid, credentials }
}

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Auth', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'auth.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true
    })

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

  // test('get request to restricted form returns 403 forbidden', async () => {
  //   const { response } = await renderResponse(server, {
  //     url: `${basePath}/licence`
  //   })

  //   expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
  // })

  test('authenticated get request to restricted form returns 200 OK', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/licence`,
      headers: {
        authorization: `Basic ${btoa('john:secret')}`
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
  })

  // test('post request without CSRF token returns 403 forbidden', async () => {
  //   const response = await server.inject({
  //     url: `${basePath}/licence`,
  //     method: 'POST',
  //     payload: {
  //       licenceLength: '1'
  //     }
  //   })

  //   expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
  // })

  // test('post request with CSRF token returns 303 redirect', async () => {
  //   const csrfToken = 'dummy-token'

  //   const response = await server.inject({
  //     url: `${basePath}/licence`,
  //     method: 'POST',
  //     headers: {
  //       cookie: `crumb=${csrfToken}`
  //     },
  //     payload: {
  //       crumb: csrfToken,
  //       licenceLength: '1'
  //     }
  //   })

  //   expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
  // })
})

/**
 * @import { Server, ServerInjectOptions } from '@hapi/hapi'
 */
