import { resolve } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/checkboxes`
const key = 'wqJmSf'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

describe('Checkboxes based conditions', () => {
  /** @type {Server} */
  let server
  /** @type {string} */
  let csrfToken
  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'checkboxes.json',
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
    })

    await server.initialize()
    // Navigate to first page to establish a session and get CSRF + session cookies
    const response = await server.inject({
      url: `${basePath}/first-page`
    })

    csrfToken = getCookie(response, 'crumb')
    headers = getCookieHeader(response, ['session', 'crumb'])
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('Checkboxes are rendered', async () => {
    const { container } = await renderResponse(server, {
      url: `${basePath}/first-page`
    })

    for (const example of [
      {
        name: key,
        id: key,
        text: 'Shire',
        value: 'shire'
      },
      {
        name: key,
        id: `${key}-2`,
        text: 'Race',
        value: 'race'
      },
      {
        name: key,
        id: `${key}-3`,
        text: 'Pantomime',
        value: 'pantomime'
      },
      {
        name: key,
        id: `${key}-4`,
        text: 'Other',
        value: 'other'
      }
    ]) {
      const $checkbox = container.getByRole('checkbox', {
        name: example.text
      })

      expect($checkbox).toBeInTheDocument()
      expect($checkbox).toHaveAttribute('id', expect.any(String)) // id is now a uuid
      expect($checkbox).toHaveAttribute('name', example.name)
      expect($checkbox).toHaveAttribute('value', example.value)
      expect($checkbox).toHaveClass('govuk-checkboxes__input')
      expect($checkbox).not.toBeChecked()
    }
  })

  test('Testing POST /first-page with nothing checked redirects correctly with single value', async () => {
    const form = { crumb: csrfToken }

    const res = await server.inject({
      url: `${basePath}/first-page`,
      method: 'POST',
      headers,
      payload: form
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/second-page`)
  })

  test('Testing POST /first-page with "other" checked redirects correctly', async () => {
    const form = {
      crumb: csrfToken,
      [key]: 'other'
    }

    const setStateSpy = jest.spyOn(CacheService.prototype, 'setState')

    const res = await server.inject({
      url: `${basePath}/first-page`,
      method: 'POST',
      headers,
      payload: form
    })

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/third-page`)

    // Ensure the stored state contains an array for the checkbox key
    expect(setStateSpy).toHaveBeenCalled()
    const savedState = setStateSpy.mock.calls[0][1]
    expect(Array.isArray(savedState[key])).toBe(true)

    setStateSpy.mockRestore()
  })

  test('Testing POST /first-page with "other" checked redirects correctly with multiple options', async () => {
    const form = {
      crumb: csrfToken,
      [key]: ['other', 'shire']
    }

    const setStateSpy = jest.spyOn(CacheService.prototype, 'setState')

    const res = await server.inject({
      url: `${basePath}/first-page`,
      method: 'POST',
      headers,
      payload: form
    })

    // Ensure the stored state contains an array for the checkbox key
    expect(setStateSpy).toHaveBeenCalled()
    const savedState = setStateSpy.mock.calls[0][1]
    expect(Array.isArray(savedState[key])).toBe(true)

    expect(res.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res.headers.location).toBe(`${basePath}/third-page`)
  })

  test('DF-686 Test that when a radio question is changed to a checkbox question, the state validation forces the user to re-answer the question', async () => {
    // Create a fresh session and extract cookies
    const response = await server.inject({ url: `${basePath}/first-page` })
    const hdrs = getCookieHeader(response, ['session', 'crumb'])

    // Mock CacheService.getState to return a malformed value (string instead of array)
    const malformedState = { [key]: 'other' }
    const getStateSpy = jest
      .spyOn(CacheService.prototype, 'getState')
      .mockResolvedValueOnce(malformedState)

    // GET the summary - server should redirect back to first-page because value isn't an array
    const res = await server.inject({
      url: `${basePath}/third-page`,
      method: 'GET',
      headers: hdrs
    })

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
    expect(res.headers.location).toBe(`${basePath}/first-page`)

    getStateSpy.mockRestore()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
