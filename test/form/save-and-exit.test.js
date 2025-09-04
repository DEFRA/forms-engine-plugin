import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/basic`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Save and Exit functionality', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    /**
     * @param {FormRequestPayload} request
     * @param {FormResponseToolkit} h
     */
    function saveAndExit(request, h) {
      return h.redirect('/my-save-and-exit')
    }

    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true,
      saveAndExit
    })

    await server.initialize()

    const response = await server.inject({
      url: `${basePath}/licence`
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

  describe('Save and Exit button', () => {
    it('should render the save and exit button on question pages with the correct name and value attributes', async () => {
      const { container } = await renderResponse(server, {
        url: `${basePath}/licence`,
        headers
      })

      const $saveButton = container.getByRole('button', {
        name: 'Save and exit'
      })

      expect($saveButton).toBeInTheDocument()
      expect($saveButton).toHaveClass('govuk-button--secondary')
      expect($saveButton).toHaveAttribute('name', 'action')
      expect($saveButton).toHaveAttribute('value', 'save-and-exit')
    })
  })

  describe('Save and Exit POST functionality', () => {
    it('should save form data when action is save-and-exit', async () => {
      const payload = {
        licenceLength: '1',
        action: 'save-and-exit',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe('/my-save-and-exit')
    })

    it('should continue normally when action is continue', async () => {
      const payload = {
        licenceLength: '1',
        action: 'continue',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.SEE_OTHER)
    })

    it('should prevent invalid form state being persisted', async () => {
      const payload = {
        licenceLength: '',
        action: 'save-and-exit',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).not.toBe(StatusCodes.MOVED_TEMPORARILY) // we shouldn't be redirected to the next question
    })

    it('should return 404 for non-existent page', async () => {
      const payload = {
        action: 'save-and-exit',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/non-existent-page`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })
  })

  describe('Error handling', () => {
    it('should handle CSRF token validation', async () => {
      const payload = {
        licenceLength: '1',
        action: 'save-and-exit',
        crumb: 'invalid-csrf-token'
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should handle missing CSRF token', async () => {
      const payload = {
        licenceLength: '1',
        action: 'save-and-exit'
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import  { FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
