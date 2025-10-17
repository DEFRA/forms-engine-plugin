import {
  type ComponentDef,
  type Event,
  type FormVersionMetadata,
  type Item,
  type List,
  type Page
} from '@defra/forms-model'
import {
  type PluginProperties,
  type Request,
  type ResponseObject
} from '@hapi/hapi'
import { type JoiExpression, type ValidationErrorItem } from 'joi'

import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
import { type UkAddressState } from '~/src/server/plugins/engine/components/UkAddressField.js'
import { type Component } from '~/src/server/plugins/engine/components/helpers/components.js'
import { type FileUploadField } from '~/src/server/plugins/engine/components/index.js'
import {
  type BackLink,
  type ComponentText,
  type ComponentViewModel,
  type DatePartsState,
  type MonthYearState
} from '~/src/server/plugins/engine/components/types.js'
import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItemField } from '~/src/server/plugins/engine/models/types.js'
import { type PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import {
  type FileStatus,
  type FormAdapterSubmissionSchemaVersion,
  type UploadStatus
} from '~/src/server/plugins/engine/types/enums.js'
import { type ViewContext } from '~/src/server/plugins/nunjucks/types.js'
import {
  type FormAction,
  type FormRequest,
  type FormRequestPayload,
  type FormResponseToolkit,
  type FormStatus
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/cacheService.js'
import { type RequestOptions } from '~/src/server/services/httpService.js'
import { type Services } from '~/src/server/types.js'

export type AnyFormRequest = FormRequest | FormRequestPayload
export type AnyRequest = Request | AnyFormRequest

/**
 * Form submission state stores the following in Redis:
 * Props containing user's submitted values as `{ [inputId]: value }` or as `{ [sectionName]: { [inputName]: value } }`
 *   a) . e.g:
 * ```ts
 *     {
 *       _C9PRHmsgt: 'Ben',
 *       WfLk9McjzX: 'Music',
 *       IK7jkUFCBL: 'Royal Academy of Music'
 *     }
 * ```
 *
 *   b)
 * ```ts
 *   {
 *         checkBeforeYouStart: { ukPassport: true },
 *         applicantDetails: {
 *           numberOfApplicants: 1,
 *           phoneNumber: '77777777',
 *           emailAddress: 'aaa@aaa.com'
 *         },
 *         applicantOneDetails: {
 *           firstName: 'a',
 *           middleName: 'a',
 *           lastName: 'a',
 *           address: { addressLine1: 'a', addressLine2: 'a', town: 'a', postcode: 'a' }
 *         }
 *     }
 * ```
 */

/**
 * Form submission state
 */
export type FormSubmissionState = {
  upload?: Record<string, TempFileState>
} & FormState

export interface FormSubmissionError
  extends Pick<ValidationErrorItem, 'context' | 'path'> {
  href: string // e.g: '#dateField__day'
  name: string // e.g: 'dateField__day'
  text: string // e.g: 'Date field must be a real date'
}

export interface FormPayloadParams {
  action?: FormAction
  confirm?: true
  crumb?: string
  itemId?: string
}

/**
 * Form POST for question pages
 * (after Joi has converted value types)
 */
export type FormPayload = FormPayloadParams & Partial<Record<string, FormValue>>

export type FormValue =
  | Item['value']
  | Item['value'][]
  | UploadState
  | RepeatListState
  | undefined

export type FormState = Partial<Record<string, FormStateValue>>
export type FormStateValue = Exclude<FormValue, undefined> | null

export interface FormValidationResult<
  ValueType extends FormPayload | FormSubmissionState
> {
  value: ValueType
  errors: FormSubmissionError[] | undefined
}

export interface FormContext {
  /**
   * Evaluation form state only (filtered by visited paths),
   * with values formatted for condition evaluation using
   * {@link FormComponent.getContextValueFromState}
   */
  evaluationState: FormState

  /**
   * Relevant form state only (filtered by visited paths)
   */
  relevantState: FormState

  /**
   * Relevant pages only (filtered by visited paths)
   */
  relevantPages: PageControllerClass[]

  /**
   * Form submission payload (single page)
   */
  payload: FormPayload

  /**
   * Form submission state (entire form)
   */
  state: FormSubmissionState

  /**
   * Validation errors (entire form)
   */
  errors?: FormSubmissionError[]

  /**
   * Visited paths evaluated from form state
   */
  paths: string[]

  /**
   * Preview URL direct access is allowed
   */
  isForceAccess: boolean

  /**
   * Miscellaneous extra data from event responses
   */
  data: object

  pageDefMap: Map<string, Page>
  listDefMap: Map<string, List>
  componentDefMap: Map<string, ComponentDef>
  pageMap: Map<string, PageControllerClass>
  componentMap: Map<string, Component>
  referenceNumber: string
  submittedVersionNumber?: number
}

export type FormContextRequest = (
  | {
      method: 'get'
      payload?: undefined
    }
  | {
      method: 'post'
      payload: FormPayload
    }
  | {
      method: FormRequest['method']
      payload?: object | undefined
    }
) &
  Pick<
    FormRequest,
    'app' | 'method' | 'params' | 'path' | 'query' | 'url' | 'server'
  >

export interface UploadInitiateResponse {
  uploadId: string
  uploadUrl: string
  statusUrl: string
}

export {
  FileStatus,
  UploadStatus
} from '~/src/server/plugins/engine/types/enums.js'

export type UploadState = FileState[]

export type FileUpload = {
  fileId: string
  filename: string
  contentLength: number
} & (
  | {
      fileStatus: FileStatus.complete | FileStatus.rejected | FileStatus.pending
      errorMessage?: string
    }
  | {
      fileStatus: FileStatus.complete
      errorMessage?: undefined
    }
)

export interface FileUploadMetadata {
  retrievalKey: string
}

export type UploadStatusResponse =
  | {
      uploadStatus: UploadStatus.initiated
      metadata: FileUploadMetadata
      form: { file?: undefined }
    }
  | {
      uploadStatus: UploadStatus.pending | UploadStatus.ready
      metadata: FileUploadMetadata
      form: { file: FileUpload }
      numberOfRejectedFiles?: number
    }
  | {
      uploadStatus: UploadStatus.ready
      metadata: FileUploadMetadata
      form: { file: FileUpload }
      numberOfRejectedFiles: 0
    }

export type UploadStatusFileResponse = Exclude<
  UploadStatusResponse,
  { uploadStatus: UploadStatus.initiated }
>

export interface FileState {
  uploadId: string
  status: UploadStatusFileResponse
}

export interface TempFileState {
  upload?: UploadInitiateResponse
  files: UploadState
}

export interface RepeatItemState extends FormPayload {
  itemId: string
}

export type RepeatListState = RepeatItemState[]

export interface CheckAnswers {
  title?: ComponentText
  summaryList: SummaryList
}

export interface SummaryList {
  classes?: string
  rows: SummaryListRow[]
}

export interface SummaryListRow {
  key: ComponentText
  value: ComponentText
  actions?: { items: SummaryListAction[] }
}

export type SummaryListAction = ComponentText & {
  href: string
  visuallyHiddenText: string
}

export interface PageViewModelBase extends Partial<ViewContext> {
  page: PageController
  name?: string
  pageTitle: string
  sectionTitle?: string
  showTitle: boolean
  isStartPage: boolean
  backLink?: BackLink
  feedbackLink?: string
  serviceUrl: string
  phaseTag?: string
}

export interface ItemDeletePageViewModel extends PageViewModelBase {
  context: FormContext
  itemTitle: string
  confirmation?: ComponentText
  buttonConfirm: ComponentText
  buttonCancel: ComponentText
}

export interface FormPageViewModel extends PageViewModelBase {
  components: ComponentViewModel[]
  context: FormContext
  errors?: FormSubmissionError[]
  hasMissingNotificationEmail?: boolean
  allowSaveAndExit: boolean
}

export interface RepeaterSummaryPageViewModel extends PageViewModelBase {
  context: FormContext
  errors?: FormSubmissionError[]
  checkAnswers: CheckAnswers[]
  repeatTitle: string
  allowSaveAndExit: boolean
}

export interface FeaturedFormPageViewModel extends FormPageViewModel {
  formAction?: string
  formComponent: ComponentViewModel
  componentsBefore: ComponentViewModel[]
  uploadId: string | undefined
  proxyUrl: string | null
}

export type PageViewModel =
  | PageViewModelBase
  | ItemDeletePageViewModel
  | FormPageViewModel
  | RepeaterSummaryPageViewModel
  | FeaturedFormPageViewModel

export type GlobalFunction = (value: unknown) => unknown
export type FilterFunction = (value: unknown) => unknown
export interface ErrorMessageTemplate {
  type: string
  template: JoiExpression
}

export interface ErrorMessageTemplateList {
  baseErrors: ErrorMessageTemplate[]
  advancedSettingsErrors: ErrorMessageTemplate[]
}

export type PreparePageEventRequestOptions = (
  options: RequestOptions,
  event: Event,
  page: PageControllerClass,
  context: FormContext
) => void

export type OnRequestCallback = (
  request: AnyFormRequest,
  h: FormResponseToolkit,
  context: FormContext
) =>
  | ResponseObject
  | FormResponseToolkit['continue']
  | Promise<ResponseObject | FormResponseToolkit['continue']>

export type SaveAndExitHandler = (
  request: FormRequestPayload,
  h: FormResponseToolkit,
  context: FormContext
) => ResponseObject

export interface PluginOptions {
  model?: FormModel
  services?: Services
  controllers?: Record<string, typeof PageController>
  cache?: CacheService | string
  globals?: Record<string, GlobalFunction>
  filters?: Record<string, FilterFunction>
  saveAndExit?: SaveAndExitHandler
  pluginPath?: string
  nunjucks: {
    baseLayoutPath: string
    paths: string[]
  }
  viewContext: PluginProperties['forms-engine-plugin']['viewContext']
  preparePageEventRequestOptions?: PreparePageEventRequestOptions
  onRequest?: OnRequestCallback
  baseUrl: string // base URL of the application, protocol and hostname e.g. "https://myapp.com"
}

export interface FormAdapterSubmissionMessageMeta {
  schemaVersion: FormAdapterSubmissionSchemaVersion
  timestamp: Date
  referenceNumber: string
  formName: string
  formId: string
  formSlug: string
  status: FormStatus
  isPreview: boolean
  notificationEmail: string
  versionMetadata?: FormVersionMetadata
  custom?: Record<string, unknown>
}

export type FormAdapterSubmissionMessageMetaSerialised = Omit<
  FormAdapterSubmissionMessageMeta,
  'schemaVersion' | 'timestamp' | 'status'
> & {
  schemaVersion: number
  status: string
  timestamp: string
}
export interface FormAdapterFile {
  fileName: string
  fileId: string
  userDownloadLink: string
}

export interface FormAdapterSubmissionMessageResult {
  files: {
    main: string
    repeaters: Record<string, string>
  }
}

/**
 * A detail item specifically for files
 */
export type FileUploadFieldDetailitem = Omit<DetailItemField, 'field'> & {
  field: FileUploadField
}
export type RichFormValue =
  | FormValue
  | FormPayload
  | DatePartsState
  | MonthYearState
  | UkAddressState

export interface FormAdapterSubmissionMessageData {
  main: Record<string, RichFormValue | null>
  repeaters: Record<string, Record<string, RichFormValue>[]>
  files: Record<string, FormAdapterFile[]>
}

export interface FormAdapterSubmissionMessagePayload {
  meta: FormAdapterSubmissionMessageMeta
  data: FormAdapterSubmissionMessageData
  result: FormAdapterSubmissionMessageResult
}

export interface FormAdapterSubmissionMessage
  extends FormAdapterSubmissionMessagePayload {
  messageId: string
  recordCreatedAt: Date
}

export interface FormAdapterSubmissionService {
  handleFormSubmission: (
    submissionMessage: FormAdapterSubmissionMessage
  ) => unknown
}
