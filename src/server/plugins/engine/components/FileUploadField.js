import Boom from '@hapi/boom'
import joi from 'joi'

import { EN_GB } from '~/src/server/constants.js'
import {
  FormComponent,
  isUploadState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { t as tPlugin } from '~/src/server/plugins/engine/i18n/index.js'
import { InvalidComponentStateError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import { FileStatus, UploadStatus } from '~/src/server/plugins/engine/types.js'
import { render } from '~/src/server/plugins/nunjucks/index.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

export const uploadIdSchema = joi.string().uuid().required()

export const fileSchema = /** @type {ObjectSchema<FileUpload>} */ (
  joi.object({
    fileId: joi.string().uuid().required(),
    filename: joi.string().required(),
    contentLength: joi.number().required()
  })
).required()

export const tempFileSchema = fileSchema.append({
  fileStatus: joi
    .string()
    .valid(FileStatus.complete, FileStatus.rejected, FileStatus.pending)
    .required(),
  errorMessage: joi.string().optional(),
  errorCode: joi.string().optional(),
  errorParams: joi.any().optional()
})

export const formFileSchema = fileSchema.append({
  fileStatus: joi.string().valid(FileStatus.complete).required()
})

export const metadataSchema = /** @type {ObjectSchema<FileUploadMetadata>} */ (
  joi.object()
)
  .keys({
    retrievalKey: joi.string().email().required()
  })
  .required()

export const tempStatusSchema =
  /** @type {ObjectSchema<UploadStatusFileResponse>} */ (
    joi.object({
      uploadStatus: joi
        .string()
        .valid(UploadStatus.ready, UploadStatus.pending)
        .required(),
      metadata: metadataSchema,
      form: joi
        .object()
        .required()
        .keys({
          file: joi.array().items(tempFileSchema).single().required()
        }),
      numberOfRejectedFiles: joi.number().optional()
    })
  ).required()

export const formStatusSchema =
  /** @type {ObjectSchema<UploadStatusResponse>} */ (
    joi.object({
      uploadStatus: joi.string().valid(UploadStatus.ready).required(),
      metadata: metadataSchema,
      form: joi.object().required().keys({
        file: formFileSchema
      }),
      numberOfRejectedFiles: joi.number().required()
    })
  ).required()

export const itemSchema = /** @type {ObjectSchema<FileState>} */ (
  joi.object({
    uploadId: uploadIdSchema
  })
)

export const tempItemSchema = itemSchema.append({
  status: tempStatusSchema
})

export const formItemSchema = itemSchema.append({
  status: formStatusSchema
})

export class FileUploadField extends FormComponent {
  /** @type {FileUploadFieldComponent['options']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  options = this.options

  /** @type {FileUploadFieldComponent['schema']} */
  // @ts-expect-error TS2729: the base constructor has already set it
  schema = this.schema

  /** @type {ArraySchema<FileState[]>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  formSchema = this.formSchema

  /** @type {ArraySchema<FileState[]>} */
  // @ts-expect-error TS2729: the base constructor has already set it
  stateSchema = this.stateSchema

  /** @type {{ min?: number, max?: number, length?: number }} */
  limits

  /**
   * @param {FileUploadFieldComponent} def
   * @param {ConstructorParameters<typeof FormComponent>[1]} props
   */
  constructor(def, props) {
    super(def, props)

    const { options, schema } = def

    let formSchema = /** @type {ArraySchema<FileState>} */ (joi.array())
      .label(this.label)
      .single()
      .required()

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    /** @type {{ min?: number, max?: number, length?: number }} */
    const limits = {}

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
        limits.max = schema.max
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
        limits.min = schema.min
      } else if (options.required !== false) {
        formSchema = formSchema.min(1)
        limits.min = 1
      }
    } else {
      formSchema = formSchema.length(schema.length)
      limits.length = schema.length
    }

    this.limits = limits

    formSchema = formSchema.messages(
      FileUploadField.buildErrorMessages(EN_GB, limits)
    )

    this.formSchema = formSchema.items(formItemSchema)
    this.stateSchema = formSchema
      .items(formItemSchema)
      .default(null)
      .allow(null)

    this.options = options
    this.schema = schema
  }

  /**
   * @param {FormSubmissionState} state
   */
  getFormValueFromState(state) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  /**
   * @param {FormStateValue | FormState} [value]
   */
  getFormValue(value) {
    return this.isValue(value) ? value : undefined
  }

  /**
   * @param {FileState[] | undefined} files
   * @param {Translator} [translator]
   * @returns {string}
   */
  getDisplayStringFromFormValue(
    files,
    translator = this.model.createTranslator()
  ) {
    if (!files?.length) {
      return ''
    }

    return translator.t('pages.summary.fileUpload', {
      count: files.length
    })
  }

  /**
   * @param {FormSubmissionState} state
   * @param {Translator} [translator]
   */
  getDisplayStringFromState(state, translator = this.model.createTranslator()) {
    const files = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(files, translator)
  }

  /**
   * @param {UploadState | undefined} files
   * @returns {string[] | null}
   */
  getContextValueFromFormValue(files) {
    return files?.map(({ status }) => status.form.file.fileId) ?? null
  }

  /**
   * @param {FormSubmissionState} state
   */
  getContextValueFromState(state) {
    const files = this.getFormValueFromState(state)
    return this.getContextValueFromFormValue(files)
  }

  /**
   * @param {RenderContext} context
   */
  getViewModel(context) {
    const {
      errors,
      query = {},
      translator = this.model.createTranslator()
    } = context

    const isForceAccess = 'force' in query
    const { t } = translator
    const { options, page, schema } = this

    const viewModel = super.getViewModel(context)
    const { attributes, id, value } = viewModel

    const files = this.getFormValue(value) ?? []
    const filtered = files.filter(
      (file) => file.status.form.file.fileStatus === FileStatus.complete
    )
    const count = filtered.length

    /** @type {SummaryListRow[]} */
    const rows = filtered.map((item, index) => {
      const { status } = item
      const { form } = status
      const { file } = form

      const tag = {
        classes: 'govuk-tag--green',
        text: t('components.fileUploadField.uploaded')
      }

      const valueHtml = render
        .view('components/fileuploadfield-value.html', {
          context: { params: { tag } }
        })
        .trim()

      const keyHtml = render
        .view('components/fileuploadfield-key.html', {
          context: {
            params: {
              name: file.filename,
              errorMessage: errors && file.errorMessage
            }
          }
        })
        .trim()

      /** @type {SummaryListAction[]} */
      const items = []

      // Remove summary list actions from previews
      if (!isForceAccess) {
        const path = `/${file.fileId}/confirm-delete`
        const href = page?.getHref(`${page.path}${path}`) ?? '#'

        items.push({
          href,
          text: t('pages.fileUpload.remove'),
          classes: 'govuk-link--no-visited-state',
          attributes: { id: `${id}__${index}` },
          visuallyHiddenText: file.filename
        })
      }

      return /** @satisfies {SummaryListRow} */ ({
        key: {
          html: keyHtml
        },
        value: {
          html: valueHtml
        },
        actions: {
          items
        }
      })
    })

    // Set up the `accept` attribute
    if ('accept' in options && options.accept) {
      attributes.accept = options.accept
    }

    // Allow multiple file selection when schema permits more than 1 file
    const allowsMultiple = schema.max !== 1 && schema.length !== 1

    /** @type {SummaryList} */
    const summaryList = {
      classes: 'govuk-summary-list--long-key',
      rows
    }

    return {
      ...viewModel,

      // File input can't have a initial value
      value: '',

      // Override the component name we send to CDP
      name: 'file',

      // Enable multi-file selection in the file picker
      ...(allowsMultiple && { multiple: true }),

      upload: {
        count,
        summaryList
      }
    }
  }

  /**
   * @param {FormStateValue | FormState} [value]
   * @returns {value is UploadState}
   */
  isValue(value) {
    return isUploadState(value)
  }

  /**
   * @param {Translator} translator
   */
  getValidationMessagesOverride(translator) {
    const { language } = translator
    return {
      [this.name]: FileUploadField.buildErrorMessages(language, this.limits)
    }
  }

  /**
   * For error preview page that shows all possible errors on a component
   * @returns {ErrorMessageTemplateList}
   */
  getAllPossibleErrors() {
    return FileUploadField.getAllPossibleErrors()
  }

  /**
   * @param {FormRequestPayload} request
   * @param {FormMetadata} metadata
   * @param {FormContext} context
   */
  async onSubmit(request, metadata, context) {
    const language = resolveLanguage(request)
    const { t } = this.model.createTranslator(language)

    const notificationEmail = metadata.notificationEmail

    if (!notificationEmail) {
      // this should not happen because notificationEmail is checked further up
      // the chain in SummaryPageController before submitForm is called.
      throw new Error('Unexpected missing notificationEmail in metadata')
    }

    if (!request.app.model?.services.formSubmissionService) {
      throw new Error('No form submission service available in app model')
    }

    const { formSubmissionService } = request.app.model.services
    const values = this.getFormValueFromState(context.state) ?? []

    const files = values.map((value) => ({
      fileId: value.status.form.file.fileId,
      initiatedRetrievalKey: value.status.metadata.retrievalKey
    }))

    if (!files.length) {
      return
    }

    try {
      await formSubmissionService.persistFiles(files, notificationEmail)
    } catch (error) {
      if (
        Boom.isBoom(error) &&
        (error.output.statusCode === 403 || // Forbidden - retrieval key invalid
          error.output.statusCode === 404 || // Not Found - file not found
          error.output.statusCode === 410) // Gone - file expired (took to long to submit, etc)
      ) {
        // Failed to persist files. We can't recover from this, the only real way we can recover the submissions is
        // by resetting the problematic components and letting the user re-try.
        // Scenarios: file missing from S3, invalid retrieval key (timing problem), etc.
        throw new InvalidComponentStateError(
          this,
          t('components.fileUploadField.uploadFailed')
        )
      }

      throw error
    }
  }

  /**
   * Static version of getAllPossibleErrors that doesn't require a component instance.
   * @returns {ErrorMessageTemplateList}
   */
  static getAllPossibleErrors() {
    return {
      baseErrors: [
        { type: 'selectRequired', template: messageTemplate.selectRequired },
        {
          type: 'filesMimes',
          template: 'The selected file must be a {{#limit}}'
        },
        {
          type: 'filesSize',
          template: 'The selected file must be smaller than 100MB'
        },
        { type: 'filesEmpty', template: 'The selected file is empty' },
        { type: 'filesVirus', template: 'The selected file contains a virus' },
        {
          type: 'filesPartial',
          template: 'The selected file has not fully uploaded'
        },
        {
          type: 'filesError',
          template: 'The selected file could not be uploaded – try again'
        }
      ],
      advancedSettingsErrors: [
        {
          type: 'filesMin',
          template: 'You must upload {{#limit}} files or more'
        },
        {
          type: 'filesMax',
          template: 'You can only upload {{#limit}} files or less'
        },
        {
          type: 'filesExact',
          template: 'You must upload exactly {{#limit}} files'
        }
      ]
    }
  }

  /**
   * @param {string} language
   * @param {{ min?: number, max?: number, length?: number }} [limits]
   */
  static buildErrorMessages(language, limits = {}) {
    return {
      'array.min': tPlugin('validation.filesMin', language, {
        count: limits.min ?? 1
      }),
      'array.max': tPlugin('validation.filesMax', language, {
        count: limits.max ?? 1
      }),
      'array.length': tPlugin('validation.filesLength', language, {
        count: limits.length ?? 1
      })
    }
  }
}

/**
 * @import { FileUploadFieldComponent, FormMetadata } from '@defra/forms-model'
 * @import { ArraySchema, ObjectSchema } from 'joi'
 * @import { RenderContext } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { ErrorMessageTemplateList, FileState, FileUpload, FileUploadMetadata, FormContext, FormState, FormStateValue, FormSubmissionState, SummaryList, SummaryListAction, SummaryListRow, UploadState, UploadStatusFileResponse, UploadStatusResponse } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayload } from '~/src/server/routes/types.js'
 */
