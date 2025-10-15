import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'
const basePath = `${FORM_PREFIX}/postcode-lookup`

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/postcode-lookup/service.js')

/**
 *
 * @param {Server} server
 */
async function initialiseJourney(server) {
  const response = await server.inject({
    url: `${basePath}/address`
  })

  // Extract the session cookie
  const csrfToken = getCookie(response, 'crumb')
  const headers = getCookieHeader(response, ['session', 'crumb'])

  return { csrfToken, response, headers }
}

describe('Postcode lookup form pages', () => {
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
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  it('should render the source form page with a postcode lookup buttons', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/address`
    })

    const $actionButton = container.getByRole('button', {
      name: 'Find an address'
    })

    expect($actionButton).toBeInTheDocument()
    expect($actionButton.getAttribute('name')).toBe('action')
    expect($actionButton.getAttribute('value')).toBe(
      'external-postcode-lookup--name:ybMHIv'
    )

    const $manualButton = container.getByRole('button', {
      name: 'enter address manually'
    })

    expect($manualButton).toBeInTheDocument()
    expect($manualButton.getAttribute('name')).toBe('action')
    expect($manualButton.getAttribute('value')).toBe(
      'external-postcode-lookup--name:ybMHIv--step:manual'
    )
  })

  it('should dispatch to details page on POST', async () => {
    let { csrfToken, response, headers } = await initialiseJourney(server)

    const payload = {
      action: 'external-postcode-lookup--name:ybMHIv',
      crumb: csrfToken
    }

    response = await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe('/postcode-lookup')
  })

  it('should dispatch to manual page on POST with step arg', async () => {
    let { csrfToken, response, headers } = await initialiseJourney(server)

    const payload = {
      action: 'external-postcode-lookup--name:ybMHIv--step:manual',
      crumb: csrfToken
    }

    response = await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe('/postcode-lookup?step=manual')
  })

  it('should render the details page', async () => {
    let { csrfToken, response, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    const payload = {
      action: 'external-postcode-lookup--name:ybMHIv',
      crumb: csrfToken
    }

    response = await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe('/postcode-lookup')

    headers = getCookieHeader(response, ['session'])

    response = await server.inject({
      url: '/postcode-lookup',
      method: 'GET',
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
  })

  it('should render the manual page', async () => {
    let { csrfToken, response, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    const payload = {
      action: 'external-postcode-lookup--name:ybMHIv--step:manual',
      crumb: csrfToken
    }

    response = await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toBe('/postcode-lookup?step=manual')

    headers = getCookieHeader(response, ['session'])

    response = await server.inject({
      url: '/postcode-lookup?step=manual',
      method: 'GET',
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
