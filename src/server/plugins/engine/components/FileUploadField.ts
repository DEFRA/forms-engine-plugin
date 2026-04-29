import {
  type FileUploadFieldComponent,
  type FormMetadata
} from '@defra/forms-model'
import Boom from '@hapi/boom'
import joi, { type ArraySchema } from 'joi'

import {
  FormComponent,
  isUploadState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import { getPluginOptions } from '~/src/server/plugins/engine/helpers.js'
import { type Translator } from '~/src/server/plugins/engine/i18n/types.js'
import { InvalidComponentStateError } from '~/src/server/plugins/engine/pageControllers/errors.js'
import { messageTemplate } from '~/src/server/plugins/engine/pageControllers/validationOptions.js'
import {
  FileStatus,
  UploadStatus,
  type ErrorMessageTemplateList,
  type FileState,
  type FileUpload,
  type FileUploadMetadata,
  type FormContext,
  type FormPayload,
  type FormState,
  type FormStateValue,
  type FormSubmissionError,
  type FormSubmissionState,
  type SummaryList,
  type SummaryListAction,
  type SummaryListRow,
  type UploadState,
  type UploadStatusFileResponse,
  type UploadStatusResponse
} from '~/src/server/plugins/engine/types.js'
import { render } from '~/src/server/plugins/nunjucks/index.js'
import { type FormRequestPayload } from '~/src/server/routes/types.js'

export const uploadIdSchema = joi.string().uuid().required()

export const fileSchema = joi
  .object<FileUpload>({
    fileId: joi.string().uuid().required(),
    filename: joi.string().required(),
    contentLength: joi.number().required()
  })
  .required()

export const tempFileSchema = fileSchema.append({
  fileStatus: joi
    .string()
    .valid(FileStatus.complete, FileStatus.rejected, FileStatus.pending)
    .required(),
  errorMessage: joi.string().optional()
})

export const formFileSchema = fileSchema.append({
  fileStatus: joi.string().valid(FileStatus.complete).required()
})

export const metadataSchema = joi
  .object<FileUploadMetadata>()
  .keys({
    retrievalKey: joi.string().email().required()
  })
  .required()

export const tempStatusSchema = joi
  .object<UploadStatusFileResponse>({
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
  .required()

export const formStatusSchema = joi
  .object<UploadStatusResponse>({
    uploadStatus: joi.string().valid(UploadStatus.ready).required(),
    metadata: metadataSchema,
    form: joi.object().required().keys({
      file: formFileSchema
    }),
    numberOfRejectedFiles: joi.number().required()
  })
  .required()

export const itemSchema = joi.object<FileState>({
  uploadId: uploadIdSchema
})

export const tempItemSchema = itemSchema.append({
  status: tempStatusSchema
})

export const formItemSchema = itemSchema.append({
  status: formStatusSchema
})

export class FileUploadField extends FormComponent {
  declare options: FileUploadFieldComponent['options']
  declare schema: FileUploadFieldComponent['schema']
  declare formSchema: ArraySchema<FileState>
  declare stateSchema: ArraySchema<FileState>

  constructor(
    def: FileUploadFieldComponent,
    props: ConstructorParameters<typeof FormComponent>[1]
  ) {
    super(def, props)

    const { options, schema } = def

    let formSchema = joi
      .array<FileState>()
      .label(this.label)
      .single()
      .required()

    if (options.required === false) {
      formSchema = formSchema.optional()
    }

    if (typeof schema.length !== 'number') {
      if (typeof schema.max === 'number') {
        formSchema = formSchema.max(schema.max)
      }

      if (typeof schema.min === 'number') {
        formSchema = formSchema.min(schema.min)
      } else if (options.required !== false) {
        formSchema = formSchema.min(1)
      }
    } else {
      formSchema = formSchema.length(schema.length)
    }

    this.formSchema = formSchema.items(formItemSchema)
    this.stateSchema = formSchema
      .items(formItemSchema)
      .default(null)
      .allow(null)

    this.options = options
    this.schema = schema
  }

  getFormValueFromState(state: FormSubmissionState) {
    const { name } = this
    return this.getFormValue(state[name])
  }

  getFormValue(value?: FormStateValue | FormState) {
    return this.isValue(value) ? value : undefined
  }

  getDisplayStringFromFormValue(
    files: FileState[] | undefined,
    translator?: Translator
  ): string {
    if (!files?.length) {
      return ''
    }

    return (
      translator?.t('components.fileUploadField.filesCount', {
        count: files.length
      }) ?? `Uploaded ${files.length} ${files.length === 1 ? 'file' : 'files'}`
    )
  }

  getDisplayStringFromState(
    state: FormSubmissionState,
    translator?: Translator
  ) {
    const files = this.getFormValueFromState(state)

    return this.getDisplayStringFromFormValue(files, translator)
  }

  getContextValueFromFormValue(
    files: UploadState | undefined
  ): string[] | null {
    return files?.map(({ status }) => status.form.file.fileId) ?? null
  }

  getContextValueFromState(state: FormSubmissionState) {
    const files = this.getFormValueFromState(state)
    return this.getContextValueFromFormValue(files)
  }

  getViewModel(
    payload: FormPayload,
    errors: FormSubmissionError[] | undefined,
    translator: Translator,
    isForceAccess = false
  ) {
    const { options, page, schema } = this

    const { t } = translator

    const viewModel = super.getViewModel(payload, errors, translator)
    const { attributes, id, value } = viewModel

    const files = this.getFormValue(value) ?? []
    const filtered = files.filter(
      (file) => file.status.form.file.fileStatus === FileStatus.complete
    )
    const count = filtered.length

    const rows: SummaryListRow[] = filtered.map((item, index) => {
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

      const items: SummaryListAction[] = []

      // Remove summary list actions from previews
      if (!isForceAccess) {
        const path = `/${file.fileId}/confirm-delete`
        const href = page?.getHref(`${page.path}${path}`) ?? '#'

        items.push({
          href,
          text: 'Remove',
          classes: 'govuk-link--no-visited-state',
          attributes: { id: `${id}__${index}` },
          visuallyHiddenText: file.filename
        })
      }

      return {
        key: {
          html: keyHtml
        },
        value: {
          html: valueHtml
        },
        actions: {
          items
        }
      } satisfies SummaryListRow
    })

    // Set up the `accept` attribute
    if ('accept' in options && options.accept) {
      attributes.accept = options.accept
    }

    // Allow multiple file selection when schema permits more than 1 file
    const allowsMultiple = schema.max !== 1 && schema.length !== 1

    const summaryList: SummaryList = {
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

  isValue(value?: FormStateValue | FormState): value is UploadState {
    return isUploadState(value)
  }

  /**
   * For error preview page that shows all possible errors on a component
   */
  getAllPossibleErrors(): ErrorMessageTemplateList {
    return FileUploadField.getAllPossibleErrors()
  }

  async onSubmit(
    request: FormRequestPayload,
    metadata: FormMetadata,
    context: FormContext
  ) {
    const { getLanguage } = getPluginOptions(request.server)
    const language = getLanguage?.(request) ?? 'en-GB'
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
   */
  static getAllPossibleErrors(): ErrorMessageTemplateList {
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
}
