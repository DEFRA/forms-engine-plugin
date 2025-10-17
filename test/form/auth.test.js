import { join } from 'node:path'

import basic from '@hapi/basic'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { FileFormService } from '~/src/server/utils/file-form-service.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

const basePath = `${FORM_PREFIX}/auth-test`

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

describe('Auth', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    const loader = new FileFormService()
    const now = new Date()
    const user = { id: 'user', displayName: 'Username' }
    const author = {
      createdAt: now,
      createdBy: user,
      updatedAt: now,
      updatedBy: user
    }
    const metadata = {
      organisation: 'Defra',
      teamName: 'Team name',
      teamEmail: 'team@defra.gov.uk',
      submissionGuidance: "Thanks for your submission, we'll be in touch",
      notificationEmail: 'email@domain.com',
      ...author,
      live: author
    }
    await loader.addForm(
      `${join(import.meta.dirname, 'definitions')}/text.json`,
      {
        ...metadata,
        id: '95e92559-968d-44ae-8666-2b1ad3dffd31',
        title: 'Auth test',
        slug: 'auth-test'
      }
    )

    const services = /** @type {Services} */ ({
      formsService: loader.toFormsService()
    })

    server = await createServer({
      services,
      onRequest: (request, h, _context) => {
        const { auth } = request

        if (!auth.isAuthenticated) {
          return h.redirect('/unauthorized').takeover()
        }

        return h.continue
      }
    })

    // Register basic auth strategy and set
    // it to the default with { mode: try }
    await server.register(basic)
    server.auth.strategy('simple', 'basic', { validate })
    server.auth.default({
      strategy: 'simple',
      mode: 'try'
    })

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('get request to restricted form returns 403 Forbidden', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/first-page`
    })

    expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(response.headers.location).toBe('/unauthorized')
  })

  test('authenticated get request to restricted form returns 200 OK', async () => {
    const { response } = await renderResponse(server, {
      url: `${basePath}/first-page`,
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
 * @import { Services } from '~/src/server/types.js'
 */
