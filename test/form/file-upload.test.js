import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

import { within } from '@testing-library/dom'
import { StatusCodes } from 'http-status-codes'

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

const basePath = `${FORM_PREFIX}/file-upload`

jest.mock('~/src/server/plugins/engine/services/uploadService.js')
jest.mock('~/src/server/plugins/engine/services/formsService.js')

const metadata = {
  formId: '66c304662ad3b5fe57210e7c',
  path: `${basePath}/methodology-statement`,
  retrievalKey: 'enrique.chase@defra.gov.uk'
}

/**
 * @satisfies {UploadInitiateResponse}
 */
const uploadInitiateResponse = {
  uploadId: '15b2303c-9965-4632-acb6-0776081e0399',
  uploadUrl:
    'http://localhost:7337/upload-and-scan/15b2303c-9965-4632-acb6-0776081e0399',
  statusUrl: 'http://localhost:7337/status/15b2303c-9965-4632-acb6-0776081e0399'
}

/**
 * @satisfies {UploadStatusResponse}
 */
const initiatedStatusResponse = {
  uploadStatus: UploadStatus.initiated,
  metadata,
  form: {}
}

/**
 * @satisfies {UploadStatusResponse}
 */
const readyStatusResponse = {
  uploadStatus: UploadStatus.ready,
  metadata,
  form: {
    file: {
      fileId: '5a76a1a3-bc8a-4bc0-859a-116d775c7f15',
      filename: 'test.pdf',
      contentLength: 1024,
      fileStatus: FileStatus.complete
    }
  },
  numberOfRejectedFiles: 0
}

describe('File upload GET tests', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload.js',
      formFilePath: resolve(import.meta.dirname, '../form/definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /methodology-statement returns 200', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/methodology-statement`
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $heading1 = container.getByRole('heading', {
      name: 'Upload your methodology statement',
      level: 1
    })

    const $heading2 = container.getByRole('heading', {
      name: 'Uploaded files',
      level: 2
    })

    expect($heading1).toBeInTheDocument()
    expect($heading1).toHaveClass('govuk-heading-l')

    expect($heading2).toBeInTheDocument()
    expect($heading2).toHaveClass('govuk-heading-m')
  })

  test('GET /methodology-statement returns uses cached initiated upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValueOnce(initiatedStatusResponse)

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    // Assert invalid status response from CDP throws
    jest.mocked(getUploadStatus).mockResolvedValueOnce(undefined)

    const res3 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res3.statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  test('GET /methodology-statement returns handles consumed upload', async () => {
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)
    jest.mocked(initiateUpload).mockResolvedValueOnce(uploadInitiateResponse)

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)
  })
})

describe('File upload POST tests', () => {
  /** @type {Server} */
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload.js',
      formFilePath: resolve(import.meta.dirname, '../form/definitions'),
      enforceCsrf: false
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('POST /methodology-statement with 1 file returns 200 with errors', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const { container, response } = await renderResponse(server, {
      url: `${basePath}/methodology-statement`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(response.statusCode).toBe(StatusCodes.OK)

    const $errorSummary = container
      .getAllByRole('alert')
      .find((el) => within(el).queryAllByRole('listitem').length)

    if (!$errorSummary) {
      throw new Error('Unable to find error summary')
    }

    const $errorItems = within($errorSummary).getAllByRole('listitem')

    const $heading = within($errorSummary).getByRole('heading', {
      name: 'There is a problem',
      level: 2
    })

    expect($heading).toBeInTheDocument()

    expect($errorItems[0]).toHaveTextContent('You must upload 2 files or more')

    const $input = container.getByLabelText(
      'Upload your methodology statement (optional)'
    )

    expect($input).toHaveAccessibleDescription(
      expect.stringContaining('Error: You must upload 2 files or more')
    )
  })

  test('POST /methodology-statement with 2 valid files returns 303 to /summary', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    const res3 = await server.inject({
      url: `${basePath}/methodology-statement`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(res3.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res3.headers.location).toBe(`${basePath}/summary`)
  })

  test('POST /methodology-statement with remove deletes the file', async () => {
    jest.mocked(initiateUpload).mockResolvedValue(uploadInitiateResponse)
    jest.mocked(getUploadStatus).mockResolvedValue(readyStatusResponse)

    const res1 = await server.inject({
      url: `${basePath}/methodology-statement`
    })

    expect(res1.statusCode).toBe(StatusCodes.OK)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    const res2 = await server.inject({
      url: `${basePath}/methodology-statement`,
      headers
    })

    expect(res2.statusCode).toBe(StatusCodes.OK)

    const res3 = await server.inject({
      url: `${basePath}/methodology-statement/5a76a1a3-bc8a-4bc0-859a-116d775c7f15/confirm-delete`,
      headers
    })

    expect(res3.statusCode).toBe(StatusCodes.OK)

    const res4 = await server.inject({
      url: `${basePath}/methodology-statement/5a76a1a3-bc8a-4bc0-859a-116d775c7f15/confirm-delete`,
      method: 'POST',
      headers,
      payload: {
        confirm: true
      }
    })

    expect(res4.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res4.headers.location).toBe(`${basePath}/methodology-statement`)
  })
})

describe('File upload limits', () => {
  const limitsBasePath = `${FORM_PREFIX}/file-upload-limits`

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

    await server.inject({ url: `${limitsBasePath}${path}`, headers })

    return renderResponse(server, {
      url: `${limitsBasePath}${path}`,
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
      url: `${limitsBasePath}/min-max?language=${language}`
    })

    const headers = getCookieHeader(response, 'session')

    // The exact page shows only after the page before it is complete
    if (path === '/exact') {
      await uploadAndPost(headers, '/min-max', 2)
      await server.inject({ url: `${limitsBasePath}/exact`, headers })
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
 * @import { UploadInitiateResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 */
