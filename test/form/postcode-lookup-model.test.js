import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import * as engineHelpers from '~/src/server/plugins/engine/helpers.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/postcode-lookup`

jest.mock('~/src/server/plugins/postcode-lookup/service.js')

describe('Postcode lookup with a single model and no services', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'postcode-lookup.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true,
      ordnanceSurveyApiKey: 'dummy'
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.spyOn(engineHelpers, 'getPluginOptions').mockReturnValue({
      getLanguage: jest.fn().mockReturnValue('en-GB'),
      services: undefined,
      baseUrl: 'http://localhost:3009',
      nunjucks: {
        baseLayoutPath: 'dxt-devtool-baselayout.html',
        paths: []
      },
      // @ts-expect-error - partial mock implementation
      viewContext: {},
      // @ts-expect-error - partial mock implementation
      cacheService: {
        getFlash: jest.fn().mockReturnValue(undefined),
        setFlash: jest.fn()
      },
      saveAndExit: undefined,
      generateReferenceNumber: jest.fn().mockReturnValue('XXX-XXX-XXX')
    })
  })

  it('renders the details page with the question from the model', async () => {
    const { response: sourceResponse } = await renderResponse(server, {
      url: `${basePath}/address`
    })

    const response = await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers: getCookieHeader(sourceResponse, ['session', 'crumb']),
      payload: {
        action: 'external-ybMHIv',
        crumb: getCookie(sourceResponse, 'crumb')
      }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)

    const { container } = await renderResponse(server, {
      url: '/postcode-lookup',
      headers: getCookieHeader(response, ['session'])
    })

    expect(
      container.getByRole('heading', {
        name: 'What is your address?',
        level: 1
      })
    ).toBeInTheDocument()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
