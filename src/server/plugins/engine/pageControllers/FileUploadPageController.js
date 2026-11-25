import { ComponentType } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { wait } from '@hapi/hoek'
import { StatusCodes } from 'http-status-codes'

import {
  FileUploadField,
  tempItemSchema
} from '~/src/server/plugins/engine/components/FileUploadField.js'
import {
  getCacheService,
  getError,
  getExponentialBackoffDelay
} from '~/src/server/plugins/engine/helpers.js'
import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/QuestionPageController.js'
import { getProxyUrlForLocalDevelopment } from '~/src/server/plugins/engine/pageControllers/helpers/index.js'
import {
  getUploadStatus,
  initiateUpload
} from '~/src/server/plugins/engine/services/uploadService.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { joinWithOr } from '~/src/server/utils/utils.js'

const MAX_UPLOADS = 25
const CDP_UPLOAD_TIMEOUT_MS = 60000 // 1 minute

/**
 * @param {UploadStatusFileResponse} status
 */
export function prepareStatus(status) {
  const file = status.form.file
  const isPending = file.fileStatus === FileStatus.pending

  if (!file.errorMessage && isPending) {
    file.errorMessage = 'The selected file has not fully uploaded'
  }

  return status
}

/**
 * @param {FileState} fileState
 */
function prepareFileState(fileState) {
  prepareStatus(fileState.status)

  return fileState
}

export class FileUploadPageController extends QuestionPageController {
  /** @type {PageFileUpload} */
  // @ts-expect-error TS2729: the base constructor has already set it
  pageDef = this.pageDef

  /** @type {FileUploadField} */
  fileUpload

  fileDeleteViewName = 'item-delete'

  /**
   * @param {FormModel} model
   * @param {PageFileUpload} pageDef
   */
  constructor(model, pageDef) {
    super(model, pageDef)

    const { collection } = this

    // Get the file upload fields from the collection
    const fileUploads = collection.fields.filter(
      /**
       * @returns {field is FileUploadField}
       */
      (field) => field.type === ComponentType.FileUploadField
    )

    const fileUpload = fileUploads.at(0)

    // Assert we have exactly 1 file upload component
    if (!fileUpload || fileUploads.length > 1) {
      throw Boom.badImplementation(
        `Expected 1 FileUploadFieldComponent in FileUploadPageController '${pageDef.path}'`
      )
    }

    // Assert the file upload component is the first form component
    if (collection.fields.indexOf(fileUpload) !== 0) {
      throw Boom.badImplementation(
        `Expected '${fileUpload.name}' to be the first form component in FileUploadPageController '${pageDef.path}'`
      )
    }

    // Assign the file upload component to the controller
    this.fileUpload = fileUpload
    this.viewName = /** @type {QuestionPageController['viewName']} */ (
      'file-upload'
    )
  }

  /**
   * Get supplementary state keys for clearing file upload state.
   * Returns the nested upload path for FileUploadField components only.
   * @param {FormComponent} component - The component to get supplementary state keys for
   * @returns {string[]} Array containing the nested upload path, e.g., ["upload['/page-path']"]
   * or ['upload'] if no page path is available. Returns empty array for non-FileUploadField components.
   */
  getStateKeys(component) {
    // Only return upload keys for FileUploadField components
    if (!(component instanceof FileUploadField)) {
      return []
    }

    const pagePath = component.page?.path
    return pagePath ? [`upload['${pagePath}']`] : ['upload']
  }

  /**
   * @param {FormContextRequest | undefined} request
   * @param {FormSubmissionState} state
   */
  getFormDataFromState(request, state) {
    const { fileUpload } = this

    const payload = super.getFormDataFromState(request, state)
    const files = this.getFilesFromState(state)

    // Append the files to the payload
    payload[fileUpload.name] = files.length ? files : undefined

    return payload
  }

  /**
   * @param {AnyFormRequest} request
   */
  async getState(request) {
    const { fileUpload } = this

    // Get the actual state
    const state = await super.getState(request)
    const files = this.getFilesFromState(state)

    // Overwrite the files with those in the upload state
    state[fileUpload.name] = files

    return this.refreshUpload(request, state)
  }

  /**
   * Get the uploaded files from state.
   * @param {FormSubmissionState} state
   */
  getFilesFromState(state) {
    const { path } = this

    const uploadState = state.upload?.[path]
    return uploadState?.files ?? []
  }

  /**
   * Get the initiated upload from state.
   * @param {FormSubmissionState} state
   */
  getUploadFromState(state) {
    const { path } = this

    const uploadState = state.upload?.[path]
    return uploadState?.upload
  }

  makeGetItemDeleteRouteHandler() {
    /**
     * @param {FormRequest} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return (request, context, h) => {
      const { viewModel } = this
      const { params } = request
      const { state } = context

      const files = this.getFilesFromState(state)

      const fileToRemove = files.find(
        ({ status }) => status.form.file.fileId === params.itemId
      )

      if (!fileToRemove) {
        throw Boom.notFound('File to delete not found')
      }

      const { filename } = fileToRemove.status.form.file

      const translator = this.getTranslator(request)
      const { t } = translator

      return h.view(
        this.fileDeleteViewName,
        /** @satisfies {ItemDeletePageViewModel} */ ({
          ...viewModel,
          context,
          backLink: this.getBackLink(request, context, t),
          pageTitle: t('pages.fileUpload.removeFileTitle'),
          itemTitle: filename,
          confirmation: { text: t('pages.fileUpload.removeFileBody') },
          buttonConfirm: { text: t('pages.fileUpload.removeFileButton') },
          buttonCancel: { text: t('pages.fileUpload.cancel') },
          t
        })
      )
    }
  }

  makePostItemDeleteRouteHandler() {
    /**
     * @param {FormRequestPayload} request
     * @param {FormContext} context
     * @param {FormResponseToolkit} h
     */
    return async (request, context, h) => {
      const { path } = this
      const { state } = context

      const { confirm } = this.getFormParams(request)

      // Check for any removed files in the POST payload
      if (confirm) {
        await this.checkRemovedFiles(request, state)
        return this.proceed(request, h, path)
      }

      return this.proceed(request, h)
    }
  }

  /**
   * @param {ValidationErrorItem[]} [details]
   * @param {string} [language]
   */
  getErrors(details, language) {
    const { fileUpload } = this

    if (details) {
      /** @type {FormSubmissionError[]} */
      const errors = []

      details.forEach((error) => {
        const isUploadError = error.path[0] === fileUpload.name
        const isUploadRootError = isUploadError && error.path.length === 1

        if (!isUploadError || isUploadRootError) {
          // The error is for the root of the upload or another
          // field on the page so defer to the getError helper
          errors.push(getError(error, language))
        } else {
          const { context, path, type } = error

          if (type === 'object.unknown' && path.at(-1) === 'errorMessage') {
            const value = /** @type {string | undefined} */ (context?.value)

            if (value) {
              const name = fileUpload.name
              const text = typeof value === 'string' ? value : 'Unknown error'
              const href = `#${name}`

              errors.push({ path, href, name, text })
            }
          }
        }
      })

      return errors
    }
  }

  /**
   * @param {FormContextRequest} request
   * @param {FormContext} context
   * @param {Translator} [translator]
   * @returns {FeaturedFormPageViewModel}
   */
  getViewModel(
    request,
    context,
    translator = context.translator ?? this.model.createTranslator()
  ) {
    const { fileUpload } = this
    const { state } = context
    const { t } = translator

    const upload = this.getUploadFromState(state)

    const viewModel = super.getViewModel(request, context, translator)
    const { components } = viewModel

    // Featured form component
    const [formComponent] = components.filter(
      ({ model }) => model.id === fileUpload.name
    )

    formComponent.model.upload = {
      count: formComponent.model.upload?.count ?? 0,
      summaryList: formComponent.model.upload?.summaryList ?? { rows: [] },
      uploadingLabel: t('components.fileUploadField.uploading')
    }
    formComponent.model = {
      ...formComponent.model,
      javascript: true,
      chooseFilesButtonText: t('components.fileUploadField.chooseFile'),
      dropInstructionText: t('components.fileUploadField.dropFile'),
      noFileChosenText: t('components.fileUploadField.noFileChosen')
    }

    const index = components.indexOf(formComponent)

    const proxyUrl = getProxyUrlForLocalDevelopment(upload?.uploadUrl)

    return {
      ...viewModel,
      formAction: upload?.uploadUrl,
      uploadId: upload?.uploadId,
      formComponent,

      // Split out components before/after
      componentsBefore: components.slice(0, index),
      components: components.slice(index),
      proxyUrl,
      t
    }
  }

  /**
   * Refreshes the CDP upload and files in the
   * state and checks for any removed files.
   *
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise we initiate a new one.
   * @private
   * @param {AnyFormRequest} request - the hapi request
   * @param {FormSubmissionState} state - the form state
   */
  async refreshUpload(request, state) {
    state = await this.checkUploadStatus(request, state)

    return state
  }

  /**
   * If an upload exists and hasn't been consumed
   * it gets re-used, otherwise a new one is initiated.
   * @private
   * @param {AnyFormRequest} request - the hapi request
   * @param {FormSubmissionState} state - the form state
   * @param {number} [depth] - the number of retries so far
   * @returns {Promise<FormSubmissionState>}
   */
  async checkUploadStatus(request, state, depth = 1) {
    const upload = this.getUploadFromState(state)
    const files = this.getFilesFromState(state)

    // If no upload exists, initiate a new one.
    if (!upload?.uploadId) {
      return this.initiateAndStoreNewUpload(request, state)
    }

    const uploadId = upload.uploadId

    let statusResponse

    try {
      statusResponse = await getUploadStatus(uploadId)
    } catch (err) {
      // if the user loads a file upload page and queries the cached upload, after the upload has
      // expired in CDP, we will get a 404 from the getUploadStatus endpoint.
      // In this case we want to initiate a new upload and return that state, so the form
      // doesn't blow up for the end user.
      if (
        Boom.isBoom(err) &&
        err.output.statusCode === StatusCodes.NOT_FOUND.valueOf()
      ) {
        return this.initiateAndStoreNewUpload(request, state)
      }
      throw err
    }

    if (!statusResponse) {
      throw Boom.badRequest(
        `Unexpected empty response from getUploadStatus for ${uploadId}`
      )
    }

    // Re-use the upload if it is still in the "initiated" state.
    if (statusResponse.uploadStatus === UploadStatus.initiated) {
      return state
    }

    if (statusResponse.uploadStatus === UploadStatus.pending) {
      // Using exponential backoff delays:
      // Depth 1: 2000ms, Depth 2: 4000ms, Depth 3: 8000ms, Depth 4: 16000ms, Depth 5+: 30000ms (capped)
      // A depth of 5 (or more) implies cumulative delays roughly reaching 55 seconds.
      if (depth >= 5) {
        const err = new Error(
          `Exceeded cumulative retry delay for ${uploadId} (depth: ${depth}). Re-initiating a new upload.`
        )
        request.logger.error(
          err,
          `[uploadTimeout] Exceeded cumulative retry delay for uploadId: ${uploadId} at depth: ${depth} - re-initiating new upload`
        )
        await this.initiateAndStoreNewUpload(request, state)
        throw Boom.gatewayTimeout(
          `Timed out waiting for ${uploadId} after cumulative retries exceeding ${((CDP_UPLOAD_TIMEOUT_MS - 5000) / 1000).toFixed(0)} seconds`
        )
      }
      const delay = getExponentialBackoffDelay(depth)
      request.logger.info(
        `[uploadRetry] Waiting ${delay / 1000} seconds for uploadId: ${uploadId} to complete (retry depth: ${depth})`
      )
      await wait(delay)
      return this.checkUploadStatus(request, state, depth + 1)
    }

    // Only add to files state if the file validates.
    // This secures against html tampering of the file input
    // (e.g. changing it to a simple text field or similar).
    const validationResult = tempItemSchema.validate(
      { uploadId, status: statusResponse },
      { stripUnknown: true }
    )
    const error = validationResult.error

    if (error) {
      return this.initiateAndStoreNewUpload(request, state)
    }

    // CDP returns form.file as a single object for one file,
    // or an array for multiple files. The Joi schema normalises
    // both to an array via .single().
    await this.processUploadedFiles(
      request,
      state,
      validationResult.value,
      files,
      upload
    )

    return this.initiateAndStoreNewUpload(request, state)
  }

  /**
   * Processes the uploaded files from a CDP status response.
   * Complete files are added to state, rejected/pending files
   * have their error messages flashed.
   * @private
   * @param {AnyFormRequest} request - the hapi request
   * @param {FormSubmissionState} state - the form state
   * @param {FileState} validatedItem - the Joi-validated upload item
   * @param {FileState[]} files - the current files array from state
   * @param {UploadInitiateResponse | undefined} upload - the current upload initiation response
   */
  async processUploadedFiles(request, state, validatedItem, files, upload) {
    const { uploadId } = validatedItem
    const validatedStatus = validatedItem.status
    const rawFile = /** @type {FileUpload | FileUpload[]} */ (
      /** @type {unknown} */ (validatedStatus.form.file)
    )
    const uploadedFiles = Array.isArray(rawFile) ? rawFile : [rawFile]

    /** @type {FormSubmissionError[]} */
    const allErrors = []

    const translator = this.getTranslator(request)
    const { t } = translator

    for (const file of uploadedFiles) {
      if (file.fileStatus === FileStatus.complete) {
        /** @type {FileState} */
        const perFileState = {
          uploadId,
          status: /** @type {FileState['status']} */ ({
            ...validatedStatus,
            form: { file }
          })
        }
        files.unshift(prepareFileState(perFileState))
      } else {
        // Collect the error for rejected/pending files.
        const { fileUpload } = this
        const name = fileUpload.name
        const errorParams = this.expandErrorParams(
          file.errorParams,
          t('common.or')
        )
        const text = t(
          `pages.fileUpload.${file.errorCode ?? 'FILE_ERROR_UNKNOWN'}`,
          errorParams
        )
        allErrors.push({ path: [name], href: `#${name}`, name, text })
      }
    }

    if (allErrors.length) {
      const cacheService = getCacheService(request.server)
      cacheService.setFlash(request, { errors: allErrors })
    }

    if (uploadedFiles.some((f) => f.fileStatus === FileStatus.complete)) {
      await this.mergeState(request, state, {
        upload: { [this.path]: { files, upload } }
      })
    }
  }

  /**
   * Process the error parameters so any arrays get expanded (joined), ready to be passed into the error message
   * @private
   * @param {Record<string, number | string | string[]> | undefined} errorParams - received from the file upload (may be a number, a string, or a string array)
   * @param {string} finalSeparator - 'or' in English, and 'neu' in Welsh
   */
  expandErrorParams(errorParams, finalSeparator) {
    if (!errorParams) {
      return {}
    }
    const expanded = /** @type {Record<string, number | string>} */ ({})
    for (const [key, value] of Object.entries(errorParams)) {
      if (Array.isArray(value)) {
        expanded[key] = joinWithOr(value, finalSeparator)
      } else {
        expanded[key] = value
      }
    }
    return expanded
  }

  /**
   * Checks the payload for a file getting removed
   * and removes it from the upload files if found
   * @private
   * @param {FormRequestPayload} request - the hapi request
   * @param {FormSubmissionState} state - the form state
   * @returns updated state if any files have been removed
   */
  async checkRemovedFiles(request, state) {
    const { path } = this
    const { params } = request

    const upload = this.getUploadFromState(state)
    const files = this.getFilesFromState(state)

    const filesUpdated = files.filter(
      ({ status }) => status.form.file.fileId !== params.itemId
    )

    if (filesUpdated.length === files.length) {
      return
    }

    await this.mergeState(request, state, {
      upload: { [path]: { files: filesUpdated, upload } }
    })
  }

  /**
   * Initiates a CDP file upload and stores in the upload state
   * @private
   * @param {AnyFormRequest} request - the hapi request
   * @param {FormSubmissionState} state - the form state
   */
  async initiateAndStoreNewUpload(request, state) {
    const { fileUpload, href, path } = this
    const { options, schema } = fileUpload
    const { getFormMetadata } = this.model.services.formsService

    const files = this.getFilesFromState(state)

    // Reset the upload in state
    /** @type {UploadInitiateResponse | undefined} */
    let upload

    // Don't initiate anymore after minimum of `schema.max` or MAX_UPLOADS
    const max = Math.min(schema.max ?? MAX_UPLOADS, MAX_UPLOADS)

    if (files.length < max) {
      const formMetadata = await getFormMetadata(request.params.slug)
      const notificationEmail =
        formMetadata.notificationEmail ?? 'defraforms@defra.gov.uk'

      const newUpload = await initiateUpload(
        href,
        notificationEmail,
        options.accept
      )

      if (newUpload === undefined) {
        throw Boom.badRequest('Unexpected empty response from initiateUpload')
      }

      upload = newUpload
    }

    return this.mergeState(request, state, {
      upload: { [path]: { files, upload } }
    })
  }
}

/**
 * @import { PageFileUpload } from '@defra/forms-model'
 * @import { ValidationErrorItem } from 'joi'
 * @import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { AnyFormRequest, FeaturedFormPageViewModel, FileState, FileUpload, FormContext, FormContextRequest, FormSubmissionError, FormSubmissionState, ItemDeletePageViewModel, UploadInitiateResponse, UploadStatusFileResponse } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
