import { join } from 'node:path'

import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'

import { FORM_PREFIX } from '~/src/server/constants.js'
import { createServer } from '~/src/server/index.js'
import {
  persistFiles,
  submit
} from '~/src/server/plugins/engine/services/formSubmissionService.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as uploadService from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { FormAction } from '~/src/server/routes/types.js'
import { CacheService } from '~/src/server/services/cacheService.js'
import * as fixtures from '~/test/fixtures/index.js'
import { getCookieHeader } from '~/test/utils/get-cookie.js'

const basePath = `${FORM_PREFIX}/file-upload-basic`

jest.mock('~/src/server/utils/notify.ts')
jest.mock('~/src/server/plugins/engine/services/formsService.js')
jest.mock('~/src/server/plugins/engine/services/formSubmissionService.js')
jest.mock('~/src/server/plugins/engine/services/uploadService.js')

/**
 * @satisfies {FileState}
 */
const readyFile = {
  uploadId: '404a31b2-8ee8-49b5-a6e8-23da9e69ba9e',
  status: {
    uploadStatus: UploadStatus.ready,
    metadata: {
      retrievalKey: 'foo.bar@defra.gov.uk'
    },
    form: {
      file: {
        fileId: 'a9e7470b-86a5-4826-a908-360a36aac71d',
        filename: 'api details.pdf',
        fileStatus: FileStatus.complete,
        contentLength: 735163
      }
    },
    numberOfRejectedFiles: 0
  }
}

describe('Component State Error Tests - File Upload', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer({
      formFileName: 'file-upload-basic.js',
      formFilePath: join(import.meta.dirname, 'definitions')
    })

    await server.initialize()
  })

  beforeEach(() => {
    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('POST /summary with 403 error from persistFiles resets component state and redirects', async () => {
    // Set up initial state with uploaded file
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce(
      // @ts-expect-error - Allow upload property mismatch with `FormState`
      /** @type {FormSubmissionState} */ ({
        upload: {
          '/file-upload-component': {
            files: [readyFile],
            upload: {
              uploadId: '123-546-788',
              uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
              statusUrl: 'http://localhost:7337/status/123-546-788'
            }
          }
        }
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    // POST the form data to navigate to summary
    const res1 = await server.inject({
      url: `${basePath}/file-upload-component`,
      method: 'POST',
      payload: {
        crumb: 'dummyCrumb',
        action: FormAction.Validate
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res1.headers.location).toBe(`${basePath}/summary`)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    // Mock persistFiles to throw a 403 Forbidden error (invalid retrieval key)
    const forbiddenError = Boom.forbidden('Invalid retrieval key')
    jest.mocked(persistFiles).mockRejectedValueOnce(forbiddenError)

    // POST the summary form - should catch the error and redirect back
    const submitRes = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {}
    })

    // Should redirect back to the file upload component page
    expect(submitRes.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(submitRes.headers.location).toBe(`${basePath}/file-upload-component`)

    // Verify persistFiles was called
    expect(persistFiles).toHaveBeenCalledTimes(1)
    expect(persistFiles).toHaveBeenCalledWith(
      [
        {
          fileId: readyFile.status.form.file.fileId,
          initiatedRetrievalKey: readyFile.status.metadata.retrievalKey
        }
      ],
      'defraforms@defra.gov.uk'
    )

    // Verify submit was NOT called
    expect(submit).not.toHaveBeenCalled()
  })

  test('POST /summary with 410 error from persistFiles resets component state and redirects', async () => {
    // Set up initial state with uploaded file
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce(
      // @ts-expect-error - Allow upload property mismatch with `FormState`
      /** @type {FormSubmissionState} */ ({
        upload: {
          '/file-upload-component': {
            files: [readyFile],
            upload: {
              uploadId: '123-546-788',
              uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
              statusUrl: 'http://localhost:7337/status/123-546-788'
            }
          }
        }
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    // POST the form data to navigate to summary
    const res1 = await server.inject({
      url: `${basePath}/file-upload-component`,
      method: 'POST',
      payload: {
        crumb: 'dummyCrumb',
        action: FormAction.Validate
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res1.headers.location).toBe(`${basePath}/summary`)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    // Mock persistFiles to throw a 410 Gone error (file expired)
    const goneError = Boom.resourceGone('File has expired')
    jest.mocked(persistFiles).mockRejectedValueOnce(goneError)

    // POST the summary form - should catch the error and redirect back
    const submitRes = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {}
    })

    // Should redirect back to the file upload component page
    expect(submitRes.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(submitRes.headers.location).toBe(`${basePath}/file-upload-component`)

    // Verify persistFiles was called
    expect(persistFiles).toHaveBeenCalledTimes(1)
    expect(persistFiles).toHaveBeenCalledWith(
      [
        {
          fileId: readyFile.status.form.file.fileId,
          initiatedRetrievalKey: readyFile.status.metadata.retrievalKey
        }
      ],
      'defraforms@defra.gov.uk'
    )

    // Verify submit was NOT called
    expect(submit).not.toHaveBeenCalled()
  })

  test('POST /summary with other Boom errors throws and does not redirect', async () => {
    // Set up initial state with uploaded file
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce(
      // @ts-expect-error - Allow upload property mismatch with `FormState`
      /** @type {FormSubmissionState} */ ({
        upload: {
          '/file-upload-component': {
            files: [readyFile],
            upload: {
              uploadId: '123-546-788',
              uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
              statusUrl: 'http://localhost:7337/status/123-546-788'
            }
          }
        }
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    // POST the form data to navigate to summary
    const res1 = await server.inject({
      url: `${basePath}/file-upload-component`,
      method: 'POST',
      payload: {
        crumb: 'dummyCrumb',
        action: FormAction.Validate
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res1.headers.location).toBe(`${basePath}/summary`)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    // Mock persistFiles to throw a 500 Internal Server Error
    const serverError = Boom.internal('Internal server error')
    jest.mocked(persistFiles).mockRejectedValueOnce(serverError)

    // POST the summary form - should throw the error
    const submitRes = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {}
    })

    // Should return an error response (not redirect)
    expect(submitRes.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

    // Verify persistFiles was called
    expect(persistFiles).toHaveBeenCalledTimes(1)

    // Verify submit was NOT called
    expect(submit).not.toHaveBeenCalled()
  })

  test('POST /summary with non-Boom error throws and does not redirect', async () => {
    // Set up initial state with uploaded file
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce(
      // @ts-expect-error - Allow upload property mismatch with `FormState`
      /** @type {FormSubmissionState} */ ({
        upload: {
          '/file-upload-component': {
            files: [readyFile],
            upload: {
              uploadId: '123-546-788',
              uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
              statusUrl: 'http://localhost:7337/status/123-546-788'
            }
          }
        }
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    // POST the form data to navigate to summary
    const res1 = await server.inject({
      url: `${basePath}/file-upload-component`,
      method: 'POST',
      payload: {
        crumb: 'dummyCrumb',
        action: FormAction.Validate
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(res1.headers.location).toBe(`${basePath}/summary`)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    // Mock persistFiles to throw a regular error
    const regularError = new Error('Something went wrong')
    jest.mocked(persistFiles).mockRejectedValueOnce(regularError)

    // POST the summary form - should throw the error
    const submitRes = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {}
    })

    // Should return an error response (not redirect)
    expect(submitRes.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)

    // Verify persistFiles was called
    expect(persistFiles).toHaveBeenCalledTimes(1)

    // Verify submit was NOT called
    expect(submit).not.toHaveBeenCalled()
  })

  test('GET /file-upload-component after 403 error shows error message', async () => {
    // Set up initial state with uploaded file
    jest.spyOn(CacheService.prototype, 'getState').mockResolvedValueOnce(
      // @ts-expect-error - Allow upload property mismatch with `FormState`
      /** @type {FormSubmissionState} */ ({
        upload: {
          '/file-upload-component': {
            files: [readyFile],
            upload: {
              uploadId: '123-546-788',
              uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-788',
              statusUrl: 'http://localhost:7337/status/123-546-788'
            }
          }
        }
      })
    )

    jest
      .mocked(uploadService.getUploadStatus)
      .mockResolvedValueOnce(readyFile.status)

    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-790',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-790',
      statusUrl: 'http://localhost:7337/status/123-546-790'
    })

    // POST the form data to navigate to summary
    const res1 = await server.inject({
      url: `${basePath}/file-upload-component`,
      method: 'POST',
      payload: {
        crumb: 'dummyCrumb',
        action: FormAction.Validate
      }
    })

    expect(res1.statusCode).toBe(StatusCodes.SEE_OTHER)

    // Extract the session cookie
    const headers = getCookieHeader(res1, 'session')

    // Mock persistFiles to throw a 403 Forbidden error
    const forbiddenError = Boom.forbidden('Invalid retrieval key')
    jest.mocked(persistFiles).mockRejectedValueOnce(forbiddenError)

    // POST the summary form - should catch the error and redirect back
    const submitRes = await server.inject({
      url: `${basePath}/summary`,
      method: 'POST',
      headers,
      payload: {}
    })

    expect(submitRes.statusCode).toBe(StatusCodes.SEE_OTHER)
    expect(submitRes.headers.location).toBe(`${basePath}/file-upload-component`)

    // Now GET the file upload page and verify the error message is displayed
    jest.mocked(uploadService.initiateUpload).mockResolvedValueOnce({
      uploadId: '123-546-791',
      uploadUrl: 'http://localhost:7337/upload-and-scan/123-546-791',
      statusUrl: 'http://localhost:7337/status/123-546-791'
    })

    const pageRes = await server.inject({
      url: `${basePath}/file-upload-component`,
      headers
    })

    expect(pageRes.statusCode).toBe(StatusCodes.OK)

    // Verify the error message appears in the response
    const html = pageRes.payload
    expect(html).toContain('There was a problem with your uploaded files')
    expect(html).toContain('Re-upload them before submitting the form again')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 * @import { FileState, FormSubmissionState } from '~/src/server/plugins/engine/types.js'
 */
