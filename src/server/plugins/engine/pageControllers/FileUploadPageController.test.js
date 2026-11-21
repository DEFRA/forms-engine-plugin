/* eslint-disable @typescript-eslint/dot-notation */
import { ComponentType } from '@defra/forms-model'
import Boom from '@hapi/boom'

import { EN_GB } from '~/src/server/constants.js'
import {
  FileUploadField,
  tempItemSchema
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import { TextField } from '~/src/server/plugins/engine/components/TextField.js'
import {
  getCacheService,
  getError
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/FormModel.js'
import {
  FileUploadPageController,
  prepareStatus
} from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { serverWithSaveAndExit } from '~/src/server/plugins/engine/pageControllers/__stubs__/server.js'
import { stubTranslator } from '~/src/server/plugins/engine/pageControllers/__stubs__/translator.js'
import * as pageHelpers from '~/src/server/plugins/engine/pageControllers/helpers/index.js'
import { getFormMetadata } from '~/src/server/plugins/engine/services/formsService.js'
import * as uploadService from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import * as fixtures from '~/test/fixtures/index.js'
import definition from '~/test/form/definitions/file-upload-basic.js'

jest.mock('~/src/server/plugins/engine/services/formsService.js')

/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects method signatures in a type literal; tsc reads them */
/**
 * @typedef {FileUploadPageController & {
 *   initiateAndStoreNewUpload(req: FormRequest, state: FormSubmissionState): Promise<FormSubmissionState>,
 *   mergeState(req: FormRequest, state: FormSubmissionState, merge: object): Promise<FormSubmissionState>,
 *   checkUploadStatus(request: FormRequest, state: FormSubmissionState, depth?: number): Promise<FormSubmissionState>,
 *   prepareStatus(status: UploadStatusFileResponse): UploadStatusFileResponse
 * }} TestableFileUploadPageController
 */
/* eslint-enable jsdoc/valid-types */

describe('FileUploadPageController', () => {
  /** @type {FormModel} */
  let model
  /** @type {FileUploadPageController} */
  let controller
  /** @type {FormRequest} */
  let request

  beforeEach(() => {
    const { pages } = structuredClone(definition)

    model = new FormModel(definition, {
      basePath: 'test'
    })

    jest.mocked(getFormMetadata).mockResolvedValue(fixtures.form.metadata)

    controller = new FileUploadPageController(model, pages[0])
    request = /** @type {FormRequest} */ (
      /** @type {unknown} */ ({
        params: {
          slug: 'test-form'
        },
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          fatal: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
          trace: jest.fn(),
          level: 'info'
        },
        server: {
          plugins: {
            'forms-engine-plugin': {
              baseLayoutPath: '',
              cacheService: /** @type {CacheService} */ (
                /** @type {unknown} */ ({
                  setFlash: jest.fn(),
                  setState: jest
                    .fn()
                    .mockImplementation((req, updated) =>
                      Promise.resolve(updated)
                    )
                })
              )
            }
          }
        },
        query: {}
      })
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    /** @type {ComponentDef} */
    const textComponent = {
      name: 'fullName',
      title: 'Full name',
      type: ComponentType.TextField,
      options: {},
      schema: {}
    }

    it('throws unless there is exactly 1 file upload component', () => {
      const { pages } = structuredClone(definition)

      // @ts-expect-error - Allow invalid component for test
      pages[0].components = [textComponent]

      expect(() => new FileUploadPageController(model, pages[0])).toThrow(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pages[0].path}'`
      )
    })

    it('throws unless file upload component is the first in the form', () => {
      const { pages } = structuredClone(definition)

      // @ts-expect-error - Allow invalid component for test
      pages[0].components.unshift(textComponent)

      expect(() => new FileUploadPageController(model, pages[0])).toThrow(
        `Expected 'fileUpload' to be the first form component in FileUploadPageController '${pages[0].path}'`
      )
    })
  })

  describe('Form validation', () => {
    it('includes title text and error', () => {
      const result = controller.collection.validate()

      expect(result.errors).toEqual([
        {
          path: ['fileUpload'],
          href: '#fileUpload',
          name: 'fileUpload',
          text: 'Select upload something',
          context: {
            key: 'fileUpload',
            label: 'Upload something',
            title: 'Upload something'
          }
        }
      ])
    })

    it('includes all field errors', () => {
      const result = controller.collection.validate()
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('checkUploadStatus', () => {
    describe('error handling', () => {
      it('throws error when getUploadStatus returns empty response', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(undefined)

        await expect(
          controller['checkUploadStatus'](request, state, 1)
        ).rejects.toThrow(
          'Unexpected empty response from getUploadStatus for some-id'
        )
      })

      it('initiates new upload when getUploadStatus throws a 404 error', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const notFoundError = Boom.notFound('Upload not found')

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockRejectedValue(notFoundError)

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )
        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        )
        initiateSpy.mockResolvedValue(/** @type {never} */ (state))

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(initiateSpy).toHaveBeenCalledWith(request, state)
        expect(result).toBe(state)
      })

      it('re-throws non-404 Boom errors from getUploadStatus', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const serverError = Boom.internal('Server error')

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockRejectedValue(serverError)

        await expect(
          controller['checkUploadStatus'](request, state, 1)
        ).rejects.toThrow('Server error')
      })

      it('re-throws non-Boom errors from getUploadStatus', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const networkError = new Error('Network failure')

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockRejectedValue(networkError)

        await expect(
          controller['checkUploadStatus'](request, state, 1)
        ).rejects.toThrow('Network failure')
      })

      it('handles pending upload with backoff and retries', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const pendingStatus = {
          uploadStatus: UploadStatus.pending,
          form: { file: { fileStatus: FileStatus.complete } }
        }

        const getUploadStatusSpy = jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValueOnce(
            /** @type {UploadStatusResponse} */ (pendingStatus)
          )
          .mockResolvedValueOnce(
            /** @type {UploadStatusResponse} */ ({
              uploadStatus: UploadStatus.initiated
            })
          )

        await controller['checkUploadStatus'](request, state, 1)

        expect(getUploadStatusSpy).toHaveBeenCalledTimes(2)
        expect(request.logger.info).toHaveBeenCalled()

        const logMsg = /** @type {jest.Mock} */ (request.logger.info).mock
          .calls[0][0]
        expect(logMsg).toEqual(expect.stringContaining('Waiting'))
        expect(logMsg).toEqual(expect.stringContaining('some-id'))
      }, 3000)

      it('throws gateway timeout when maximum retry depth is exceeded, logs an error, and re-initiates a new upload', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const pendingStatus = {
          uploadStatus: UploadStatus.pending,
          form: { file: { fileStatus: FileStatus.pending } }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(
            /** @type {UploadStatusResponse} */ (pendingStatus)
          )

        const initiateSpy = jest
          .spyOn(
            /** @type {TestableFileUploadPageController} */ (controller),
            'initiateAndStoreNewUpload'
          )
          .mockResolvedValue(/** @type {never} */ (state))

        await expect(
          controller['checkUploadStatus'](request, state, 7)
        ).rejects.toThrow(
          'Timed out waiting for some-id after cumulative retries exceeding 55 seconds'
        )

        expect(request.logger.error).toHaveBeenCalledWith(
          expect.any(Error),
          expect.stringContaining(
            '[uploadTimeout] Exceeded cumulative retry delay for uploadId: some-id at depth: 7 - re-initiating new upload'
          )
        )

        expect(initiateSpy).toHaveBeenCalledWith(request, state)
      })

      it('throws error when initiateUpload returns undefined', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {},
                files: []
              }
            }
          })
        )

        jest.spyOn(uploadService, 'initiateUpload').mockResolvedValue(undefined)

        await expect(
          controller['checkUploadStatus'](request, state, 1)
        ).rejects.toThrow('Unexpected empty response from initiateUpload')
      })

      it('handles pending file status with specific error message', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const pendingStatus = {
          uploadStatus: UploadStatus.ready,
          form: {
            file: {
              fileStatus: FileStatus.pending,
              errorMessage: 'Virus error message',
              errorCode: 'FILE_VIRUS'
            }
          }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(
            /** @type {UploadStatusResponse} */ (pendingStatus)
          )

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
          /** @type {ValidationResult} */ ({
            value: {
              uploadId: 'some-id',
              status: pendingStatus,
              type: 'object.unknown',
              path: ['fileUpload', 'errorMessage'],
              context: { value: 'Custom error message' }
            },
            error: undefined
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )
        const initiateSpy = jest.spyOn(
          testController,
          'initiateAndStoreNewUpload'
        )
        initiateSpy.mockResolvedValue(/** @type {never} */ (state))

        const cacheService = getCacheService(request.server)
        await controller['checkUploadStatus'](request, state, 1)

        expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
          errors: [
            {
              path: ['fileUpload'],
              href: '#fileUpload',
              name: 'fileUpload',
              text: 'The selected file contains a virus'
            }
          ]
        })
      })
    })

    describe('state management', () => {
      it('returns existing state when upload status is initiated', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        jest.spyOn(uploadService, 'getUploadStatus').mockResolvedValue(
          /** @type {UploadStatusResponse} */ ({
            uploadStatus: UploadStatus.initiated
          })
        )
        const result = await controller['checkUploadStatus'](request, state, 1)
        expect(result).toBe(state)
      })

      it('returns early when all files are updated', async () => {
        const files = ['file1', 'file2']
        const filesUpdated = [...files]
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files,
                filesUpdated
              }
            }
          })
        )

        const readyStatus = {
          uploadStatus: UploadStatus.ready,
          form: { file: { fileStatus: FileStatus.complete } }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(/** @type {UploadStatusResponse} */ (readyStatus))

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
          /** @type {ValidationResult} */ ({
            value: { status: readyStatus },
            error: undefined
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )
        const initiateSpy =
          /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
            jest.spyOn(testController, 'initiateAndStoreNewUpload')
          )

        initiateSpy.mockResolvedValue(state)

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(result).toBe(state)
      })

      it('initiates new upload when no upload exists', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {},
                files: []
              }
            }
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )

        const initiateSpy =
          /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
            jest.spyOn(testController, 'initiateAndStoreNewUpload')
          )

        initiateSpy.mockImplementation(
          (
            /** @type {FormRequest} */ _req,
            /** @type {FormSubmissionState} */ s
          ) => Promise.resolve(Object.assign({}, s, { initiated: true }))
        )

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(initiateSpy).toHaveBeenCalled()
        expect(result.initiated).toBe(true)
      })

      it('initiates new upload when file validation fails', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        jest.spyOn(uploadService, 'getUploadStatus').mockResolvedValue(
          /** @type {UploadStatusResponse} */ ({
            uploadStatus: UploadStatus.ready,
            form: { file: { fileStatus: FileStatus.complete } }
          })
        )

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
          /** @type {ValidationResult} */ ({
            value: {},
            error: new Error('Validation failed')
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )

        const initiateSpy =
          /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
            jest.spyOn(testController, 'initiateAndStoreNewUpload')
          )

        initiateSpy.mockImplementation(
          /**
           * @param {FormRequest} _req
           * @param {FormSubmissionState} s
           * @returns {Promise<FormSubmissionState>}
           */
          (_req, s) =>
            Promise.resolve(Object.assign({}, s, { newUpload: true }))
        )
        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(initiateSpy).toHaveBeenCalled()
        expect(result.newUpload).toBe(true)
      })

      it('merges state when file upload is complete', async () => {
        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'some-id',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files: []
              }
            }
          })
        )

        const completeStatus = {
          uploadStatus: UploadStatus.ready,
          form: { file: { fileStatus: FileStatus.complete } }
        }

        jest
          .spyOn(uploadService, 'getUploadStatus')
          .mockResolvedValue(
            /** @type {UploadStatusResponse} */ (completeStatus)
          )

        jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
          /** @type {ValidationResult} */ ({
            value: {
              status: completeStatus,
              uploadId: 'some-id'
            },
            error: undefined
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )

        const mergeStateSpy =
          /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState, object]>} */ (
            jest.spyOn(testController, 'mergeState')
          )

        mergeStateSpy.mockImplementation(
          /**
           * @param {FormRequest} _req
           * @param {FormSubmissionState} s
           * @param {object} _merge
           * @returns {Promise<FormSubmissionState>}
           */
          (_req, s, _merge) =>
            Promise.resolve(Object.assign({}, s, { merged: true }))
        )

        const initiateSpy =
          /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
            jest.spyOn(testController, 'initiateAndStoreNewUpload')
          )

        initiateSpy.mockImplementation(
          /**
           * @param {FormRequest} _req
           * @param {FormSubmissionState} s
           * @returns {Promise<FormSubmissionState>}
           */
          (_req, s) =>
            Promise.resolve(Object.assign({}, s, { newUpload: true }))
        )

        const result = await controller['checkUploadStatus'](request, state, 1)

        expect(mergeStateSpy).toHaveBeenCalled()
        expect(result.newUpload).toBe(true)
      })
    })

    describe('error messaging', () => {
      describe('when file status is not complete', () => {
        it('sets flash error with provided message', async () => {
          const state = /** @type {FormSubmissionState} */ (
            /** @type {unknown} */ ({
              upload: {
                [controller.path]: {
                  upload: {
                    uploadId: 'some-id',
                    uploadUrl: 'some-url',
                    statusUrl: 'some-status-url'
                  },
                  files: []
                }
              }
            })
          )

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: {
                fileStatus: FileStatus.rejected,
                errorMessage: 'Test error',
                errorCode: 'FILE_INVALID_TYPE',
                errorParams: /** @type {Record<string, string[]>} */ ({
                  fileExtensions: ['XLS', 'XLSX']
                })
              }
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(
              /** @type {UploadStatusResponse} */ (errorStatus)
            )

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
            /** @type {ValidationResult} */ ({
              value: {
                status: errorStatus,
                uploadId: 'some-id'
              },
              error: undefined
            })
          )

          const testController =
            /** @type {TestableFileUploadPageController} */ (controller)

          const initiateSpy =
            /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
              jest.spyOn(testController, 'initiateAndStoreNewUpload')
            )

          initiateSpy.mockImplementation(
            /**
             * @param {FormRequest} _req
             * @param {FormSubmissionState} s
             * @returns {Promise<FormSubmissionState>}
             */
            (_req, s) =>
              Promise.resolve(Object.assign({}, s, { newUpload: true }))
          )

          const cacheService = getCacheService(request.server)

          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'The selected file must be a XLS or XLSX'
              }
            ]
          })
        })
      })

      describe('when file has error status', () => {
        it('sets flash error with error message', async () => {
          const state = /** @type {FormSubmissionState} */ (
            /** @type {unknown} */ ({
              upload: {
                [controller.path]: {
                  upload: {
                    uploadId: 'some-id',
                    uploadUrl: 'some-url',
                    statusUrl: 'some-status-url'
                  },
                  files: []
                }
              }
            })
          )

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: {
                fileStatus: FileStatus.rejected,
                errorMessage: 'Test error message',
                errorCode: 'FILE_TOO_LARGE',
                errorParams: /** @type {Record<string, string>} */ ({
                  maxFileSizeFormatted: '10MB'
                })
              }
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(
              /** @type {UploadStatusResponse} */ (errorStatus)
            )

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
            /** @type {ValidationResult} */ ({
              value: { status: errorStatus },
              error: undefined
            })
          )

          const testController =
            /** @type {TestableFileUploadPageController} */ (controller)

          const initiateSpy =
            /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
              jest.spyOn(testController, 'initiateAndStoreNewUpload')
            )

          initiateSpy.mockResolvedValue(state)

          const cacheService = getCacheService(request.server)
          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'The selected file must be smaller than 10MB'
              }
            ]
          })
        })

        it('collects all file errors into a single flash when multiple files fail', async () => {
          const state = /** @type {FormSubmissionState} */ (
            /** @type {unknown} */ ({
              upload: {
                [controller.path]: {
                  upload: {
                    uploadId: 'some-id',
                    uploadUrl: 'some-url',
                    statusUrl: 'some-status-url'
                  },
                  files: []
                }
              }
            })
          )

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: [
                {
                  fileStatus: FileStatus.rejected,
                  errorMessage: 'File too large',
                  errorCode: 'FILE_TOO_LARGE',
                  errorParams: /** @type {Record<string, string>} */ ({
                    maxFileSizeFormatted: '10MB'
                  })
                },
                {
                  fileStatus: FileStatus.rejected,
                  errorMessage: 'Invalid file type',
                  errorCode: 'FILE_INVALID_TYPE',
                  errorParams: /** @type {Record<string, string[]>} */ ({
                    fileExtensions: ['DOC', 'DOCX']
                  })
                }
              ]
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(
              /** @type {UploadStatusResponse} */ (
                /** @type {unknown} */ (errorStatus)
              )
            )

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
            /** @type {ValidationResult} */ ({
              value: {
                status: errorStatus,
                uploadId: 'some-id'
              },
              error: undefined
            })
          )

          const testController =
            /** @type {TestableFileUploadPageController} */ (controller)

          const initiateSpy =
            /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
              jest.spyOn(testController, 'initiateAndStoreNewUpload')
            )

          initiateSpy.mockResolvedValue(state)

          const cacheService = getCacheService(request.server)

          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledTimes(1)
          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'The selected file must be smaller than 10MB'
              },
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'The selected file must be a DOC or DOCX'
              }
            ]
          })
        })

        it('sets default error message when none provided', async () => {
          const state = /** @type {FormSubmissionState} */ (
            /** @type {unknown} */ ({
              upload: {
                [controller.path]: {
                  upload: {
                    uploadId: 'some-id',
                    uploadUrl: 'some-url',
                    statusUrl: 'some-status-url'
                  },
                  files: []
                }
              }
            })
          )

          const errorStatus = {
            uploadStatus: UploadStatus.ready,
            form: {
              file: {
                fileStatus: FileStatus.rejected
              }
            }
          }

          jest
            .spyOn(uploadService, 'getUploadStatus')
            .mockResolvedValue(
              /** @type {UploadStatusResponse} */ (errorStatus)
            )

          jest.spyOn(tempItemSchema, 'validate').mockReturnValue(
            /** @type {ValidationResult} */ ({
              value: { status: errorStatus },
              error: undefined
            })
          )

          const testController =
            /** @type {TestableFileUploadPageController} */ (controller)

          const initiateSpy =
            /** @type {jest.SpyInstance<Promise<FormSubmissionState>, [FormRequest, FormSubmissionState]>} */ (
              jest.spyOn(testController, 'initiateAndStoreNewUpload')
            )

          initiateSpy.mockResolvedValue(state)

          const cacheService = getCacheService(request.server)

          await controller['checkUploadStatus'](request, state, 1)

          expect(cacheService.setFlash).toHaveBeenCalledWith(request, {
            errors: [
              {
                path: ['fileUpload'],
                href: '#fileUpload',
                name: 'fileUpload',
                text: 'Unknown error'
              }
            ]
          })
        })
      })
    })

    describe('file removal', () => {
      it('returns early when no file is removed', async () => {
        const files = [
          {
            uploadId: 'upload1',
            status: { form: { file: { fileId: 'file1' } } }
          },
          {
            uploadId: 'upload2',
            status: { form: { file: { fileId: 'file2' } } }
          }
        ]

        Object.defineProperty(request, 'params', {
          value: { itemId: 'nonexistent-file' },
          writable: true,
          configurable: true
        })

        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'upload-123',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files
              }
            }
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )
        const mergeStateSpy = jest.spyOn(testController, 'mergeState')

        await controller['checkRemovedFiles'](
          /** @type {FormRequestPayload} */ (request),
          state
        )

        expect(mergeStateSpy).not.toHaveBeenCalled()
      })

      it('merges state when file is removed', async () => {
        const files = [
          {
            uploadId: 'upload1',
            status: { form: { file: { fileId: 'file1' } } }
          },
          {
            uploadId: 'upload2',
            status: { form: { file: { fileId: 'file2' } } }
          }
        ]

        Object.defineProperty(request, 'params', {
          value: { itemId: 'file1' },
          writable: true,
          configurable: true
        })

        const state = /** @type {FormSubmissionState} */ (
          /** @type {unknown} */ ({
            upload: {
              [controller.path]: {
                upload: {
                  uploadId: 'upload-123',
                  uploadUrl: 'some-url',
                  statusUrl: 'some-status-url'
                },
                files
              }
            }
          })
        )

        const testController = /** @type {TestableFileUploadPageController} */ (
          controller
        )
        const mergeStateSpy = jest.spyOn(testController, 'mergeState')

        await controller['checkRemovedFiles'](
          /** @type {FormRequestPayload} */ (request),
          state
        )

        expect(mergeStateSpy).toHaveBeenCalledWith(request, state, {
          upload: {
            [controller.path]: {
              files: [
                {
                  uploadId: 'upload2',
                  status: { form: { file: { fileId: 'file2' } } }
                }
              ],
              upload: {
                uploadId: 'upload-123',
                uploadUrl: 'some-url',
                statusUrl: 'some-status-url'
              }
            }
          }
        })
      })
    })
  })

  describe('prepareStatus', () => {
    describe('when file is pending', () => {
      it('adds error message when no error message exists', () => {
        const status = /** @type {UploadStatusFileResponse} */ ({
          form: {
            file: {
              fileStatus: FileStatus.pending,
              errorMessage: undefined
            }
          }
        })

        const result = prepareStatus(status)

        expect(result.form.file.errorMessage).toBe(
          'The selected file has not fully uploaded'
        )
      })

      it('preserves existing error message', () => {
        const existingError = 'Existing error message'
        const status = /** @type {UploadStatusFileResponse} */ ({
          form: {
            file: {
              fileStatus: FileStatus.pending,
              errorMessage: existingError
            }
          }
        })

        const result = prepareStatus(status)

        expect(result.form.file.errorMessage).toBe(existingError)
      })
    })

    describe('when file is not pending', () => {
      it('does not add error message', () => {
        const status = /** @type {UploadStatusFileResponse} */ ({
          form: {
            file: {
              fileStatus: FileStatus.complete,
              errorMessage: undefined
            }
          }
        })

        const result = prepareStatus(status)

        expect(result.form.file.errorMessage).toBeUndefined()
      })
    })
  })

  describe('getErrors', () => {
    /** @type {FileUploadPageController} */
    let controller

    beforeEach(() => {
      const { pages } = structuredClone(definition)
      const model = new FormModel(definition, { basePath: 'test' })
      controller = new FileUploadPageController(model, pages[0])
    })

    describe('when no details provided', () => {
      it('returns undefined', () => {
        const errors = controller.getErrors()
        expect(errors).toBeUndefined()
      })
    })

    describe('error handling', () => {
      it('handles non-upload errors using getError helper', () => {
        const errorDetail = {
          message: 'some error',
          path: ['otherField'],
          type: 'any.required'
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([getError(errorDetail, EN_GB)])
      })

      it('handles upload root errors using getError helper', () => {
        const errorDetail = {
          message: 'some error',
          path: ['fileUpload'],
          type: 'any.required'
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([getError(errorDetail, EN_GB)])
      })
    })

    describe('object.unknown type errors', () => {
      it('pushes an error with errorMessage', () => {
        const errorDetail = {
          message: 'some error',
          path: ['fileUpload', 'errorMessage'],
          type: 'object.unknown',
          context: { value: 'some error text' }
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([
          {
            path: ['fileUpload', 'errorMessage'],
            href: '#fileUpload',
            name: 'fileUpload',
            text: 'some error text'
          }
        ])
      })

      it('handles non-string error message values with default text', () => {
        const errorDetail = {
          message: 'some error',
          path: ['fileUpload', 'errorMessage'],
          type: 'object.unknown',
          context: { value: { some: 'object' } }
        }
        const errors = controller.getErrors([errorDetail])
        expect(errors).toEqual([
          {
            path: ['fileUpload', 'errorMessage'],
            href: '#fileUpload',
            name: 'fileUpload',
            text: 'Unknown error'
          }
        ])
      })

      it('handles object.unknown error type with errorMessage path', () => {
        const details = /** @type {ValidationErrorItem[]} */ ([
          {
            type: 'object.unknown',
            path: ['fileUpload', 'errorMessage'],
            context: { value: 'Custom error message' }
          }
        ])

        const errors = controller.getErrors(details)

        expect(errors).toEqual([
          {
            path: ['fileUpload', 'errorMessage'],
            href: '#fileUpload',
            name: 'fileUpload',
            text: 'Custom error message'
          }
        ])
      })
    })
  })

  describe('initiateAndStoreNewUpload', () => {
    it('throws error when initiateUpload returns undefined', async () => {
      const state = /** @type {FormSubmissionState} */ (
        /** @type {unknown} */ ({
          upload: {
            '/test/file-upload': {
              upload: {},
              files: []
            }
          }
        })
      )

      jest.spyOn(uploadService, 'initiateUpload').mockResolvedValue(undefined)

      await expect(
        /** @type {(req: FormRequest, state: FormSubmissionState) => Promise<FormSubmissionState>} */ (
          controller['initiateAndStoreNewUpload']
        )(request, state)
      ).rejects.toThrow('Unexpected empty response from initiateUpload')
    })
  })

  describe('makeGetItemDeleteRouteHandler', () => {
    it('throws notFound error when file to delete does not exist', () => {
      const state = {
        upload: {
          [controller.path]: {
            files: [
              {
                uploadId: 'file-1',
                status: {
                  form: { file: { fileId: 'file-1', filename: 'file-1.pdf' } }
                }
              },
              {
                uploadId: 'file-2',
                status: {
                  form: { file: { fileId: 'file-2', filename: 'file-2.pdf' } }
                }
              }
            ]
          }
        }
      }

      const request = /** @type {FormRequest} */ (
        /** @type {unknown} */ ({
          params: { itemId: 'I do not exist' }
        })
      )

      const context = /** @type {FormContext} */ (
        /** @type {unknown} */ ({ state })
      )
      const h = /** @type {FormResponseToolkit} */ (/** @type {unknown} */ ({}))

      const handler = controller.makeGetItemDeleteRouteHandler()

      expect(() => handler(request, context, h)).toThrow(
        'File to delete not found'
      )
    })
  })

  describe('makePostItemDeleteRouteHandler', () => {
    it('proceeds without deleting when confirm is false', async () => {
      const request = /** @type {FormRequestPayload} */ (
        /** @type {unknown} */ ({
          params: { itemId: 'file-1' }
        })
      )

      const h = /** @type {FormResponseToolkit} */ (
        /** @type {unknown} */ ({
          redirect: jest.fn()
        })
      )

      const context = /** @type {FormContext} */ (
        /** @type {unknown} */ ({
          state: {}
        })
      )

      jest
        .spyOn(controller, 'getFormParams')
        .mockReturnValue(
          /** @type {FormPayloadParams} */ (
            /** @type {unknown} */ ({ confirm: false })
          )
        )

      const proceedSpy = jest
        .spyOn(controller, 'proceed')
        .mockResolvedValue(/** @type {never} */ ({ statusCode: 302 }))

      const handler = controller.makePostItemDeleteRouteHandler()
      await handler(request, context, h)

      expect(proceedSpy).toHaveBeenCalledWith(request, h)
    })
  })

  describe('getViewModel', () => {
    it('includes uploadId and proxyUrl in the view model', () => {
      const state = /** @type {FormSubmissionState} */ (
        /** @type {unknown} */ ({
          upload: {
            [controller.path]: {
              upload: {
                uploadId: 'some-upload-id',
                uploadUrl: 'https://cdp-upload-and-scan.com/upload',
                statusUrl: 'https://cdp-upload-and-scan.com/status'
              },
              files: []
            }
          }
        })
      )

      const context = /** @type {FormContext} */ ({ state })

      jest
        .spyOn(QuestionPageController.prototype, 'getViewModel')
        .mockReturnValue(
          /** @type {FeaturedFormPageViewModel} */ (
            /** @type {unknown} */ ({
              components: [{ model: { id: 'fileUpload' } }]
            })
          )
        )

      jest
        .spyOn(pageHelpers, 'getProxyUrlForLocalDevelopment')
        .mockReturnValue('http://uploader.127.0.0.1.sslip.io:7300')

      const viewModel = controller.getViewModel(
        /** @type {FormContextRequest} */ (request),
        context,
        stubTranslator
      )

      expect(viewModel.uploadId).toBe('some-upload-id')
      expect(viewModel.proxyUrl).toBe('http://uploader.127.0.0.1.sslip.io:7300')
      expect(viewModel.formAction).toBe(
        'https://cdp-upload-and-scan.com/upload'
      )
    })
  })

  describe('shouldShowSaveAndExit', () => {
    it('should return true when save and exit is enabled', () => {
      expect(controller.shouldShowSaveAndExit(serverWithSaveAndExit)).toBe(true)
    })
  })

  describe('getStateKeys', () => {
    it('should return nested upload path for FileUploadField component', () => {
      const component = controller.fileUpload
      const stateKeys = controller.getStateKeys(component)

      expect(stateKeys).toEqual(["upload['/file-upload-component']"])
    })

    it('should return empty array for non-FileUploadField components', () => {
      const component = new TextField(
        {
          name: 'testField',
          title: 'Test field',
          type: ComponentType.TextField,
          options: {},
          schema: {}
        },
        { model, page: controller }
      )

      const stateKeys = controller.getStateKeys(component)
      expect(stateKeys).toEqual([])
    })

    it('should return fallback upload key when component has no page', () => {
      /** @type {ComponentDef} */
      const componentDef = {
        name: 'fileUpload',
        title: 'Upload something',
        type: ComponentType.FileUploadField,
        options: {},
        schema: {}
      }

      // Create a component without a page reference - should return ['upload']
      const component = new FileUploadField(componentDef, {
        model,
        page: undefined
      })

      const stateKeys = controller.getStateKeys(component)
      expect(stateKeys).toEqual(['upload'])
    })
  })
})

/**
 * @import { ComponentDef } from '@defra/forms-model'
 * @import { ValidationErrorItem, ValidationResult } from 'joi'
 * @import { FeaturedFormPageViewModel, FormContext, FormContextRequest, FormPayloadParams, FormSubmissionState, UploadStatusFileResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 * @import { CacheService } from '~/src/server/services/index.js'
 */
