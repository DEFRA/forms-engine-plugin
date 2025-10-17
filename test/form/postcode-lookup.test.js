import { join } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  search,
  searchByUPRN
} from '~/src/server/plugins/postcode-lookup/service.js'
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
    expect($actionButton.getAttribute('value')).toBe('external-ybMHIv')

    const $manualButton = container.getByRole('button', {
      name: 'enter address manually'
    })

    expect($manualButton).toBeInTheDocument()
    expect($manualButton.getAttribute('name')).toBe('action')
    expect($manualButton.getAttribute('value')).toBe(
      'external-ybMHIv--step:manual'
    )
  })

  it('should return a single validation message', async () => {
    const { csrfToken, headers } = await initialiseJourney(server)

    const payload = {
      crumb: csrfToken
    }

    const { response, container } = await renderResponse(server, {
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $errorSummary = container.getByRole('alert')
    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })
    expect($heading).toBeInTheDocument()

    const $errorItems = within($errorSummary).getAllByRole('listitem')
    expect($errorItems).toHaveLength(1)
    expect($errorItems[0]).toHaveTextContent('Enter address')
  })

  it('should dispatch to details page on POST', async () => {
    let { csrfToken, response, headers } = await initialiseJourney(server)

    const payload = {
      action: 'external-ybMHIv',
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
      action: 'external-ybMHIv--step:manual',
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
      action: 'external-ybMHIv',
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
      action: 'external-ybMHIv--step:manual',
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

  it('should render validation errors after POST when no postcode is provided', async () => {
    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    const { response, container } = await renderResponse(server, {
      url: '/postcode-lookup',
      method: 'POST',
      headers,
      payload: {
        step: 'details',
        postcodeQuery: '',
        buildingNameQuery: '',
        crumb: csrfToken
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    const $errorSummary = container.getByRole('alert')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })
    expect($heading).toBeInTheDocument()
  })

  it('should render the select page after POST when multiple addresses are found', async () => {
    jest.mocked(search).mockResolvedValueOnce([
      {
        address:
          'PRIME MINISTER & FIRST LORD OF THE TREASURY, 10, DOWNING STREET, LONDON, SW1A 2AA',
        addressLine1: 'Prime Minister & First Lord Of The Treasury 10',
        addressLine2: 'Downing Street',
        county: '',
        formatted:
          'Prime Minister & First Lord Of The Treasury 10, Downing Street, London, SW1A 2AA',
        postcode: 'SW1A 2AA',
        town: 'London',
        uprn: '100023336956'
      },
      {
        address:
          'CHANCELLOR & FIRST LORD OF THE TREASURY, 10, DOWNING STREET, LONDON, SW1A 2AA',
        addressLine1: 'Chancellor & First Lord Of The Treasury 11',
        addressLine2: 'Downing Street',
        county: '',
        formatted:
          'Chancellor & First Lord Of The Treasury 10, Downing Street, London, SW1A 2AA',
        postcode: 'SW1A 2AA',
        town: 'London',
        uprn: '100023336957'
      }
    ])

    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    const { response: selectResponse, container } = await renderResponse(
      server,
      {
        url: '/postcode-lookup',
        method: 'POST',
        headers,
        payload: {
          step: 'details',
          postcodeQuery: 'SW1A 2AA',
          buildingNameQuery: '',
          crumb: csrfToken
        }
      }
    )

    expect(selectResponse.statusCode).toBe(StatusCodes.OK)

    const $addressSelector = container.getByRole('combobox')
    expect($addressSelector).toBeInTheDocument()

    const $addressSelectorOptions = container.getAllByRole('option')
    expect($addressSelectorOptions).toHaveLength(3)

    const $useAddressButton = container.getByRole('button', {
      name: 'Use this address'
    })

    expect($useAddressButton).toBeInTheDocument()
  })

  it('should render the select page after POST when a single address is found', async () => {
    jest.mocked(search).mockResolvedValueOnce([
      {
        address: 'SHERLOCK HOLMES MUSEUM, 221B, BAKER STREET, LONDON, NW1 6XE',
        addressLine1: 'Sherlock Holmes Museum 221b',
        addressLine2: 'Baker Street',
        county: '',
        formatted: 'Sherlock Holmes Museum 221b, Baker Street, London, NW1 6XE',
        postcode: 'NW1 6XE',
        town: 'London',
        uprn: '100023071949'
      }
    ])

    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    const { response: selectResponse, container } = await renderResponse(
      server,
      {
        url: '/postcode-lookup',
        method: 'POST',
        headers,
        payload: {
          step: 'details',
          postcodeQuery: 'NW1 6XE',
          buildingNameQuery: '221B',
          crumb: csrfToken
        }
      }
    )

    expect(selectResponse.statusCode).toBe(StatusCodes.OK)

    const $addressPostcodeDisplay = container.getByText('NW1 6XE', {
      selector: 'strong'
    })
    expect($addressPostcodeDisplay).toBeInTheDocument()

    const $addressBuildingNameDisplay = container.getByText('221B', {
      selector: 'strong'
    })
    expect($addressBuildingNameDisplay).toBeInTheDocument()

    const $addressDisplay = container.getByText(
      'Sherlock Holmes Museum 221b, Baker Street, London, NW1 6XE'
    )
    expect($addressDisplay).toBeInTheDocument()

    const $useAddressButton = container.getByRole('button', {
      name: 'Use this address'
    })

    expect($useAddressButton).toBeInTheDocument()
  })

  it('should render the select page after POST when a no addresses are found', async () => {
    jest.mocked(search).mockResolvedValueOnce([])

    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    const { response: selectResponse, container } = await renderResponse(
      server,
      {
        url: '/postcode-lookup',
        method: 'POST',
        headers,
        payload: {
          step: 'details',
          postcodeQuery: 'AA1 1AA',
          buildingNameQuery: '100',
          crumb: csrfToken
        }
      }
    )

    expect(selectResponse.statusCode).toBe(StatusCodes.OK)

    const $noAddressesFound = container.getByRole('heading', {
      name: 'No address found',
      level: 1
    })
    expect($noAddressesFound).toBeInTheDocument()
  })

  it('should redirect back to the source page after POST when multiple addresses are found', async () => {
    jest.mocked(searchByUPRN).mockResolvedValueOnce([
      {
        address:
          'PRIME MINISTER & FIRST LORD OF THE TREASURY, 10, DOWNING STREET, LONDON, SW1A 2AA',
        addressLine1: 'Prime Minister & First Lord Of The Treasury 10',
        addressLine2: 'Downing Street',
        county: '',
        formatted:
          'Prime Minister & First Lord Of The Treasury 10, Downing Street, London, SW1A 2AA',
        postcode: 'SW1A 2AA',
        town: 'London',
        uprn: '100023336956'
      }
    ])

    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    let { response } = await renderResponse(server, {
      url: '/postcode-lookup',
      method: 'POST',
      headers,
      payload: {
        step: 'select',
        uprn: '100023336956',
        crumb: csrfToken
      }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toEndWith('/address')

    // Follow the redirect back to the source
    // page to exercise `importExternalComponentState`
    response = await server.inject({
      url: `${basePath}/address`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
  })

  it('should render validation errors after POST when no address is selected', async () => {
    jest.mocked(search).mockResolvedValueOnce([
      {
        address:
          'PRIME MINISTER & FIRST LORD OF THE TREASURY, 10, DOWNING STREET, LONDON, SW1A 2AA',
        addressLine1: 'Prime Minister & First Lord Of The Treasury 10',
        addressLine2: 'Downing Street',
        county: '',
        formatted:
          'Prime Minister & First Lord Of The Treasury 10, Downing Street, London, SW1A 2AA',
        postcode: 'SW1A 2AA',
        town: 'London',
        uprn: '100023336956'
      }
    ])

    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    const { response, container } = await renderResponse(server, {
      url: '/postcode-lookup',
      method: 'POST',
      headers,
      payload: {
        step: 'select',
        crumb: csrfToken
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    const $errorSummary = container.getByRole('alert')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })
    expect($heading).toBeInTheDocument()
  })

  it('should render validation errors after POST to manual page when no address lines are provided', async () => {
    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    const { response, container } = await renderResponse(server, {
      url: '/postcode-lookup?step=manual',
      method: 'POST',
      headers,
      payload: {
        step: 'manual',
        addressLine1: '',
        addressLine2: '',
        town: '',
        county: '',
        postcode: '',
        crumb: csrfToken
      }
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
    const $errorSummary = container.getByRole('alert')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })
    expect($heading).toBeInTheDocument()
  })

  it('should redirect back to the source page after successful POST to manual page', async () => {
    const { csrfToken, headers } = await initialiseJourney(server)

    // Dispatch to postcode journey
    await server.inject({
      url: `${basePath}/address`,
      method: 'POST',
      headers,
      payload: {
        action: 'external-ybMHIv',
        crumb: csrfToken
      }
    })

    let { response } = await renderResponse(server, {
      url: '/postcode-lookup?step=manual',
      method: 'POST',
      headers,
      payload: {
        step: 'manual',
        addressLine1: '1 Street Name',
        addressLine2: '',
        town: 'Middletown',
        county: '',
        postcode: 'M15 5TN',
        crumb: csrfToken
      }
    })

    expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(response.headers.location).toEndWith('/address')

    // Follow the redirect back to the source
    // page to exercise `importExternalComponentState`
    response = await server.inject({
      url: `${basePath}/address`,
      headers
    })

    expect(response.statusCode).toBe(StatusCodes.OK)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
