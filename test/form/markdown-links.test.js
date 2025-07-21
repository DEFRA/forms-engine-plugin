import { resolve } from 'node:path'

import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

const basePath = `${FORM_PREFIX}/markdown-links`

describe('Markdown links tests', () => {
  describe('Internal link', () => {
    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer({
        formFileName: 'markdown-links.json',
        formFilePath: resolve(import.meta.dirname, 'definitions')
      })
      await server.initialize()
    })

    beforeEach(() => {
      jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    })

    afterAll(async () => {
      await server.stop()
    })

    test('should show internal and external link', async () => {
      const { response, container } = await renderResponse(server, {
        url: `${basePath}/links`
      })

      expect(response.statusCode).toBe(StatusCodes.OK)
      const links = container.getAllByRole('link')
      const internalLink = /** @type {HTMLAnchorElement} */ (links[4])
      const externalLink = /** @type {HTMLAnchorElement} */ (links[5])
      expect(internalLink.textContent).toBe('is an internal link')
      expect(externalLink.textContent).toBe(
        'is an external link (opens in new tab)'
      )
      expect(internalLink.target).toBe('')
      expect(externalLink.target).toBe('_blank')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
