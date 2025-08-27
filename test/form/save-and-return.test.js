import { join } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { configureEnginePlugin } from '~/src/server/plugins/engine/configureEnginePlugin.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookie, getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/basic`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')

describe('Save and Return functionality', () => {
  /** @type {Server} */
  let server

  /** @type {string} */
  let csrfToken

  /** @type {ReturnType<typeof getCookieHeader>} */
  let headers

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'basic.js',
      formFilePath: join(import.meta.dirname, 'definitions'),
      enforceCsrf: true,
      saveAndReturn: {
        keyGenerator: () => 'test-key',
        sessionHydrator: () => Promise.resolve({ someState: 'value' }),
        sessionPersister: () => Promise.resolve(undefined),
        sessionPurger: () => Promise.resolve(undefined)
      }
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

  describe('Save and Return button', () => {
    it('should render the save and return button on question pages with the correct name and value attributes', async () => {
      const { container } = await renderResponse(server, {
        url: `${basePath}/licence`,
        headers
      })

      const $saveButton = container.getByRole('button', {
        name: 'Save and return'
      })

      expect($saveButton).toBeInTheDocument()
      expect($saveButton).toHaveClass('govuk-button--secondary')
      expect($saveButton).toHaveAttribute('name', 'action')
      expect($saveButton).toHaveAttribute('value', 'save-and-return')
    })
  })

  describe('Save and Return POST functionality', () => {
    it('should save form data and redirect to exit page when action is save-and-return', async () => {
      const payload = {
        licenceLength: '1',
        action: 'save-and-return',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(`${basePath}/exit`)
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
      expect(response.headers.location).not.toBe(`${basePath}/exit`)
    })

    it('should work correctly when no saveAndReturn is provided', async () => {
      const { options } = await configureEnginePlugin({
        formFileName: 'basic.js',
        formFilePath: join(import.meta.dirname, 'definitions')
      })

      expect(options.saveAndReturn).toBeUndefined()

      const payload = {
        licenceLength: '1',
        action: 'save-and-return',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY)
      expect(response.headers.location).toBe(`${basePath}/exit`)
    })

    it('should prevent invalid form state being persisted', async () => {
      const payload = {
        licenceLength: '',
        action: 'save-and-return',
        crumb: csrfToken
      }

      const response = await server.inject({
        url: `${basePath}/licence`,
        method: 'POST',
        headers,
        payload
      })

      expect(response.headers.location).not.toBe(`${basePath}/exit`)
      expect(response.statusCode).not.toBe(StatusCodes.MOVED_TEMPORARILY) // we shouldn't be redirected to the next question
    })

    it('should return 404 for non-existent page', async () => {
      const payload = {
        action: 'save-and-return',
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

  describe('Exit page', () => {
    it('should render the exit page with success message', async () => {
      const { container } = await renderResponse(server, {
        url: `${basePath}/exit`,
        headers
      })

      const $heading = container.getByRole('heading', {
        level: 1
      })

      expect($heading).toHaveTextContent('Your progress has been saved')
    })

    it('should render the exit page with return URL when provided', async () => {
      const returnUrl = 'https://example.com/return'
      const { container } = await renderResponse(server, {
        url: `${basePath}/exit?returnUrl=${encodeURIComponent(returnUrl)}`,
        headers
      })

      const $returnButton = container.getByRole('button', {
        name: 'Return to application'
      })

      expect($returnButton).toBeInTheDocument()
      expect($returnButton).toHaveAttribute('href', returnUrl)
    })

    it('should not render return button when no return URL is provided', async () => {
      const { container } = await renderResponse(server, {
        url: `${basePath}/exit`,
        headers
      })

      const $returnButton = container.queryByRole('button', {
        name: 'Return to application'
      })

      expect($returnButton).not.toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('should handle CSRF token validation', async () => {
      const payload = {
        licenceLength: '1',
        action: 'save-and-return',
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
        action: 'save-and-return'
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
 */
