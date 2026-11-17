import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

import { within } from '@testing-library/dom'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import { renderResponse } from '~/test/helpers/component-helpers.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/file-upload-limits`
const metadata = { retrievalKey: 'enrique.chase@defra.gov.uk' }

jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

describe('File upload limits', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload-limits.js',
      formFilePath: resolve(import.meta.dirname, 'definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    jest.mocked(initiateUpload).mockImplementation(() => {
      const uploadId = randomUUID()

      return Promise.resolve({
        uploadId,
        uploadUrl: `http://localhost:7337/upload-and-scan/${uploadId}`,
        statusUrl: `http://localhost:7337/status/${uploadId}`
      })
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  /**
   * Upload files in one go through the stubbed upload service, as when a user
   * selects several files, then post the page
   * @param {ReturnType<typeof getCookieHeader>} headers
   * @param {string} path
   * @param {number} count
   */
  async function uploadAndPost(headers, path, count) {
    const file = Array.from({ length: count }, (_, i) => ({
      fileId: randomUUID(),
      filename: `file-${i + 1}.pdf`,
      contentLength: 1024,
      fileStatus: FileStatus.complete
    }))

    // @ts-expect-error - the upload service sends an array for several files
    jest.mocked(getUploadStatus).mockResolvedValueOnce({
      uploadStatus: UploadStatus.ready,
      metadata,
      form: { file },
      numberOfRejectedFiles: 0
    })

    await server.inject({ url: `${basePath}${path}`, headers })

    return renderResponse(server, {
      url: `${basePath}${path}`,
      method: 'POST',
      headers,
      payload: {}
    })
  }

  /**
   * @param {string} path
   * @param {number} count
   * @param {string} language
   */
  async function getErrorLink(path, count, language) {
    jest.mocked(getUploadStatus).mockResolvedValue({
      uploadStatus: UploadStatus.initiated,
      metadata,
      form: {}
    })

    const response = await server.inject({
      url: `${basePath}/min-max?language=${language}`
    })

    const headers = getCookieHeader(response, 'session')

    // The exact page shows only after the page before it is complete
    if (path === '/exact') {
      await uploadAndPost(headers, '/min-max', 2)
      await server.inject({ url: `${basePath}/exact`, headers })
    }

    const { container } = await uploadAndPost(headers, path, count)

    const $errorSummary = container
      .getAllByRole('alert')
      .find(($alert) => within($alert).queryAllByRole('listitem').length)

    return $errorSummary
      ? within($errorSummary).getByRole('link').textContent.trim()
      : undefined
  }

  it.each([
    {
      path: '/min-max',
      count: 1,
      language: 'en-GB',
      error: 'You must upload 2 files or more'
    },
    {
      path: '/min-max',
      count: 4,
      language: 'en-GB',
      error: 'You can only upload 3 files or less'
    },
    {
      path: '/exact',
      count: 1,
      language: 'en-GB',
      error: 'You must upload exactly 2 files'
    },
    {
      path: '/exact',
      count: 3,
      language: 'en-GB',
      error: 'You must upload exactly 2 files'
    },
    {
      path: '/min-max',
      count: 1,
      language: 'cy',
      error: 'Rhaid i chi uwchlwytho 2 o ffeiliau neu fwy'
    },
    {
      path: '/min-max',
      count: 4,
      language: 'cy',
      error: 'Dim ond 3 o ffeiliau neu lai y gallwch eu huwchlwytho'
    },
    {
      path: '/exact',
      count: 1,
      language: 'cy',
      error: "Rhaid i chi uwchlwytho'n union 2 o ffeiliau"
    },
    {
      path: '/exact',
      count: 3,
      language: 'cy',
      error: "Rhaid i chi uwchlwytho'n union 2 o ffeiliau"
    }
  ])(
    '$path with $count files in $language shows "$error"',
    async ({ path, count, language, error }) => {
      expect(await getErrorLink(path, count, language)).toBe(error)
    }
  )
})

/**
 * @import { Server } from '@hapi/hapi'
 */
