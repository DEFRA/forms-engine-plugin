/**
 * @typedef {FormRequest | FormRequestPayload} AnyFormRequest
 */
/**
 * @typedef {Request | AnyFormRequest} AnyRequest
 */

/**
 * @typedef {{
 *   yar: { id: string | undefined }
 *   params: { slug?: string; state?: string }
 * }} CacheRequest
 */

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
 * @typedef {{
 *   upload?: Record<string, TempFileState>
 * } & FormState} FormSubmissionState
 */

/**
 * @typedef {object} FormSubmissionErrorFields
 * @property {string} href - e.g: '#dateField__day'
 * @property {string} name - e.g: 'dateField__day'
 * @property {string} text - e.g: 'Date field must be a real date'
 */

/**
 * @typedef {Pick<ValidationErrorItem, 'context' | 'path'> & FormSubmissionErrorFields} FormSubmissionError
 */

/**
 * @typedef {{
 *   confirmed?: true
 *   formId?: string
 *   referenceNumber?: string
 * }} FormConfirmationState
 */

/**
 * @typedef {{
 *   action?: FormAction
 *   confirm?: true
 *   crumb?: string
 *   itemId?: string
 * }} FormPayloadParams
 */

/**
 * Form POST for question pages
 * (after Joi has converted value types)
 * @typedef {FormPayloadParams & Partial<Record<string, FormValue>>} FormPayload
 */

/**
 * @typedef {Item['value'] | Item['value'][] | UploadState | RepeatListState | GeospatialState | undefined} FormValue
 */

/**
 * @typedef {Partial<Record<string, FormStateValue>>} FormState
 */
/**
 * @typedef {Exclude<FormValue, undefined> | null} FormStateValue
 */

/**
 * @template {FormPayload | FormSubmissionState} ValueType
 * @typedef {{
 *   value: ValueType
 *   errors: FormSubmissionError[] | undefined
 * }} FormValidationResult
 */

/* eslint-disable jsdoc/require-property-description -- only the members with a comment in the source have a description */
/**
 * @typedef {object} FormContext
 * @property {FormState} evaluationState - Evaluation form state only (filtered by visited paths),
 *   with values formatted for condition evaluation using
 *   {@link FormComponent.getContextValueFromState}
 * @property {FormState} relevantState - Relevant form state only (filtered by visited paths)
 * @property {PageControllerClass[]} relevantPages - Relevant pages only (filtered by visited paths)
 * @property {FormPayload} payload - Form submission payload (single page)
 * @property {FormSubmissionState} state - Form submission state (entire form)
 * @property {FormSubmissionError[]} [errors] - Validation errors (entire form)
 * @property {string[]} paths - Visited paths evaluated from form state
 * @property {boolean} isForceAccess - Preview URL direct access is allowed
 * @property {object} data - Miscellaneous extra data from event responses
 * @property {Map<string, Page>} pageDefMap
 * @property {Map<string, List>} listDefMap
 * @property {Map<string, ComponentDef>} componentDefMap
 * @property {Map<string, PageControllerClass>} pageMap
 * @property {Map<string, Component>} componentMap
 * @property {string} referenceNumber
 * @property {{ name: string; code: string }[]} [languages]
 * @property {Translator} [translator]
 */
/* eslint-enable jsdoc/require-property-description */

/**
 * @typedef {({
 *   method: 'get'
 *   payload?: undefined
 * } | {
 *   method: 'post'
 *   payload: FormPayload
 * } | {
 *   method: FormRequest['method']
 *   payload?: object | undefined
 * }) & Pick<
 *   FormRequest,
 *   'app' | 'method' | 'params' | 'path' | 'query' | 'url' | 'server'
 * >} FormContextRequest
 */

/**
 * @typedef {{
 *   uploadId: string
 *   uploadUrl: string
 *   statusUrl: string
 * }} UploadInitiateResponse
 */

export {
  FileStatus,
  UploadStatus
} from '~/src/server/plugins/engine/types/enums.js'

/**
 * @typedef {FileState[]} UploadState
 */

/**
 * @typedef {{
 *   fileId: string
 *   filename: string
 *   contentLength: number
 * } & ({
 *   fileStatus: FileStatus.complete | FileStatus.rejected | FileStatus.pending
 *   errorCode?: string
 *   errorMessage?: string
 *   errorParams?: Record<string, number | string | string[]>
 * } | {
 *   fileStatus: FileStatus.complete
 *   errorCode?: string
 *   errorMessage?: undefined
 *   errorParams?: Record<string, number | string | string[]>
 * })} FileUpload
 */

/**
 * @typedef {{
 *   retrievalKey: string
 * }} FileUploadMetadata
 */

/**
 * @typedef {{
 *   uploadStatus: UploadStatus.initiated
 *   metadata: FileUploadMetadata
 *   form: { file?: undefined }
 * } | {
 *   uploadStatus: UploadStatus.pending | UploadStatus.ready
 *   metadata: FileUploadMetadata
 *   form: { file: FileUpload }
 *   numberOfRejectedFiles?: number
 * } | {
 *   uploadStatus: UploadStatus.ready
 *   metadata: FileUploadMetadata
 *   form: { file: FileUpload }
 *   numberOfRejectedFiles: 0
 * }} UploadStatusResponse
 */

/**
 * @typedef {Exclude<
 *   UploadStatusResponse,
 *   { uploadStatus: UploadStatus.initiated }
 * >} UploadStatusFileResponse
 */

/**
 * @typedef {{
 *   uploadId: string
 *   status: UploadStatusFileResponse
 * }} FileState
 */

/**
 * @typedef {{
 *   upload?: UploadInitiateResponse
 *   files: UploadState
 * }} TempFileState
 */

/**
 * @typedef {FormPayload & {
 *   itemId: string
 * }} RepeatItemState
 */

/**
 * @typedef {RepeatItemState[]} RepeatListState
 */

/**
 * A longitude/latitude coordinate pair in WGS84 format
 * Format: [longitude, latitude]
 * @typedef {[longitude: number, latitude: number]} Coordinates
 */

/**
 * GeoJSON Point geometry
 * @typedef {{
 *   type: 'Point'
 *   coordinates: Coordinates
 * }} PointGeometry
 */

/**
 * GeoJSON LineString geometry
 * @typedef {{
 *   type: 'LineString'
 *   coordinates: Coordinates[]
 * }} LineStringGeometry
 */

/**
 * GeoJSON Polygon geometry
 * @typedef {{
 *   type: 'Polygon'
 *   coordinates: Coordinates[][]
 * }} PolygonGeometry
 */

/**
 * Supported geometry types
 * @typedef {PointGeometry | LineStringGeometry | PolygonGeometry} Geometry
 */

/**
 * Feature metadata
 * @typedef {object} FeatureProperties
 * @property {string} description - Human-readable description of the feature
 * @property {string} [coordinateGridReference] - The OS grid reference of the first coordinate of the feature
 * @property {string} [centroidGridReference] - The OS grid reference of the centroid of the feature
 */

/**
 * A single GeoJSON Feature
 * @typedef {{
 *   id: string
 *   type: 'Feature'
 *   properties: FeatureProperties
 *   geometry: Geometry
 * }} Feature
 */

/**
 * A GeoJSON FeatureCollection
 * @typedef {Feature[]} FeatureCollection
 */

/**
 * @typedef {FeatureCollection} GeospatialState
 */

/**
 * @typedef {{
 *   title?: ComponentText
 *   summaryList: SummaryList
 * }} CheckAnswers
 */

/**
 * @typedef {{
 *   classes?: string
 *   rows: SummaryListRow[]
 * }} SummaryList
 */

/**
 * @typedef {{
 *   key: ComponentText
 *   value: ComponentText
 *   actions?: { items: SummaryListAction[] }
 * }} SummaryListRow
 */

/**
 * @typedef {ComponentText & {
 *   href: string
 *   visuallyHiddenText: string
 * }} SummaryListAction
 */

/**
 * @typedef {Partial<ViewContext> & {
 *   page: PageController
 *   name?: string
 *   pageTitle: string
 *   sectionTitle?: string
 *   showTitle: boolean
 *   isStartPage: boolean
 *   backLink?: BackLink
 *   feedbackLink?: string
 *   serviceUrl: string
 *   phaseTag?: string
 *   t?: (key: string, opts?: Record<string, unknown>) => string
 * }} PageViewModelBase
 */

/**
 * @typedef {PageViewModelBase & {
 *   context: FormContext
 *   itemTitle: string
 *   confirmation?: ComponentText
 *   buttonConfirm: ComponentText
 *   buttonCancel: ComponentText
 * }} ItemDeletePageViewModel
 */

/**
 * @typedef {PageViewModelBase & {
 *   components: ComponentViewModel[]
 *   context: FormContext
 *   errors?: FormSubmissionError[]
 *   hasMissingNotificationEmail?: boolean
 *   allowSaveAndExit: boolean
 *   showSubmitButton?: boolean
 *   showPaymentExpiredNotification?: boolean
 * }} FormPageViewModel
 */

/**
 * @typedef {PageViewModelBase & {
 *   context: FormContext
 *   errors?: FormSubmissionError[]
 *   checkAnswers: CheckAnswers[]
 *   repeatTitle: string
 *   allowSaveAndExit: boolean
 * }} RepeaterSummaryPageViewModel
 */

/**
 * @typedef {FormPageViewModel & {
 *   formAction?: string
 *   formComponent: ComponentViewModel
 *   componentsBefore: ComponentViewModel[]
 *   uploadId: string | undefined
 *   proxyUrl: string | null
 * }} FeaturedFormPageViewModel
 */

/**
 * @typedef {PageViewModelBase | ItemDeletePageViewModel | FormPageViewModel | RepeaterSummaryPageViewModel | FeaturedFormPageViewModel} PageViewModel
 */

/**
 * @typedef {(value: unknown) => unknown} GlobalFunction
 */
/**
 * @typedef {(value: unknown) => unknown} FilterFunction
 */
/**
 * @typedef {{
 *   type: string
 *   template: JoiExpression
 * }} ErrorMessageTemplate
 */

/**
 * @typedef {{
 *   baseErrors: ErrorMessageTemplate[]
 *   advancedSettingsErrors: ErrorMessageTemplate[]
 * }} ErrorMessageTemplateList
 */

/**
 * @typedef {(
 *   options: RequestOptions,
 *   event: Event,
 *   page: PageControllerClass,
 *   context: FormContext
 * ) => void} PreparePageEventRequestOptions
 */

/**
 * @typedef {(
 *   request: AnyFormRequest,
 *   h: FormResponseToolkit,
 *   context: FormContext
 * ) => ResponseObject | FormResponseToolkit['continue'] | Promise<ResponseObject | FormResponseToolkit['continue']>} OnRequestCallback
 */

/**
 * @typedef {(
 *   request: FormRequestPayload,
 *   h: FormResponseToolkit,
 *   context: FormContext
 * ) => ResponseObject} SaveAndExitHandler
 */

/**
 * @typedef {(request: AnyFormRequest) => string} GetLanguageHandler
 */

/**
 * @typedef {(
 *   prefix?: string
 * ) => Promise<string>} GenerateReferenceNumberHandler
 */

/**
 * @typedef {{
 *   component: ComponentDef
 *   controller: QuestionPageController
 *   sourceUrl: string
 *   actionArgs?: Record<string, string>
 *   isLive: boolean
 *   isPreview: boolean
 * }} ExternalArgs
 */

/**
 * @typedef {ExternalArgs & {
 *   component: UkAddressFieldComponent
 *   actionArgs: { step: string }
 * }} PostcodeLookupExternalArgs
 */

/**
 * @typedef {ExternalArgs & {
 *   component: PaymentFieldComponent
 * }} PaymentExternalArgs
 */

/**
 * @typedef {{
 *   component: string
 *   data: FormStateValue | FormState
 * }} ExternalStateAppendage
 */

/* eslint-disable jsdoc/require-property-description -- only the members with a comment in the source have a description */
/**
 * @typedef {object} PluginOptions
 * @property {FormModel} [model]
 * @property {Services} [services]
 * @property {Record<string, typeof PageController>} [controllers]
 * @property {CacheService | string} [cache]
 * @property {Record<string, GlobalFunction>} [globals]
 * @property {Record<string, FilterFunction>} [filters]
 * @property {SaveAndExitHandler} [saveAndExit]
 * @property {string} [pluginPath]
 * @property {{
 *   baseLayoutPath: string
 *   paths: string[]
 * }} nunjucks
 * @property {PluginProperties['forms-engine-plugin']['viewContext']} viewContext
 * @property {PreparePageEventRequestOptions} [preparePageEventRequestOptions]
 * @property {OnRequestCallback} [onRequest]
 * @property {GetLanguageHandler} [getLanguage]
 * @property {GenerateReferenceNumberHandler} [generateReferenceNumber]
 * @property {string} baseUrl - base URL of the application, protocol and hostname e.g. "https://myapp.com"
 * @property {string} [ordnanceSurveyApiKey]
 * @property {string} [ordnanceSurveyApiSecret]
 */
/* eslint-enable jsdoc/require-property-description */

/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects indexed access on `typeof`; tsc reads it */
/**
 * @typedef {{
 *   schemaVersion: (typeof FormAdapterSubmissionSchemaVersion)[keyof typeof FormAdapterSubmissionSchemaVersion]
 *   timestamp: Date
 *   referenceNumber: string
 *   formName: string
 *   formId: string
 *   formSlug: string
 *   status: FormStatus
 *   isPreview: boolean
 *   notificationEmail: string
 *   versionMetadata?: FormVersionMetadata
 *   language?: string
 *   custom?: Record<string, unknown>
 *   auth?: {
 *     sub: string
 *     issuer: string
 *   }
 * }} FormAdapterSubmissionMessageMeta
 */
/* eslint-enable jsdoc/valid-types */

/**
 * @typedef {Omit<
 *   FormAdapterSubmissionMessageMeta,
 *   'schemaVersion' | 'timestamp' | 'status'
 * > & {
 *   schemaVersion: number
 *   status: string
 *   timestamp: string
 * }} FormAdapterSubmissionMessageMetaSerialised
 */
/**
 * @typedef {{
 *   fileName: string
 *   fileId: string
 *   userDownloadLink: string
 * }} FormAdapterFile
 */

/**
 * @typedef {{
 *   paymentId: string
 *   reference: string
 *   amount: number
 *   description: string
 *   descriptionInEng?: string
 *   createdAt: string
 * }} FormAdapterPayment
 */

/**
 * @typedef {{
 *   files: {
 *     main: string
 *     repeaters: Record<string, string>
 *   }
 * }} FormAdapterSubmissionMessageResult
 */

/**
 * A detail item specifically for files
 * @typedef {Omit<DetailItemField, 'field'> & {
 *   field: FileUploadField
 * }} FileUploadFieldDetailitem
 */

/**
 * A detail item specifically for payments
 * @typedef {Omit<DetailItemField, 'field'> & {
 *   field: PaymentField
 * }} PaymentFieldDetailItem
 */
/**
 * @typedef {FormValue | FormPayload | DatePartsState | MonthYearState | UkAddressState | EastingNorthingState | LatLongState | GeospatialState} RichFormValue
 */

/**
 * @typedef {{
 *   main: Record<string, RichFormValue | null>
 *   repeaters: Record<string, Record<string, RichFormValue | null>[]>
 *   files: Record<string, FormAdapterFile[]>
 *   payment?: FormAdapterPayment
 * }} FormAdapterSubmissionMessageData
 */

/* eslint-disable jsdoc/require-property-description -- only the members with a comment in the source have a description */
/**
 * @typedef {object} FormAdapterSubmissionMessagePayload
 * @property {FormAdapterSubmissionMessageMeta} meta
 * @property {FormAdapterSubmissionMessageData} data
 * @property {FormAdapterSubmissionMessageResult} result
 * @property {SubmitConditionEvaluation[]} [conditionEvaluations] - The outcome of every condition in the form definition, evaluated against
 *   the final answers at the point of submission.
 *
 *   Always emitted, empty when there is nothing to report - a V1-engine form
 *   has no stable condition ids to record against. Optional only for
 *   backwards compatibility: a message published before this existed carries
 *   no evaluations at all, and consumers fall back to resolving the recipients
 *   from the form definition themselves.
 */
/* eslint-enable jsdoc/require-property-description */

/**
 * @typedef {FormAdapterSubmissionMessagePayload & {
 *   messageId: string
 *   recordCreatedAt: Date
 * }} FormAdapterSubmissionMessage
 */

/**
 * @typedef {{
 *   handleFormSubmission: (
 *     submissionMessage: FormAdapterSubmissionMessage
 *   ) => unknown
 * }} FormAdapterSubmissionService
 */

/**
 * @import { ComponentDef, Event, FormVersionMetadata, Item, List, Page, PaymentFieldComponent, SubmitConditionEvaluation, UkAddressFieldComponent } from '@defra/forms-model'
 * @import { PluginProperties, Request, ResponseObject } from '@hapi/hapi'
 * @import { JoiExpression, ValidationErrorItem } from 'joi'
 * @import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
 * @import { UkAddressState } from '~/src/server/plugins/engine/components/UkAddressField.js'
 * @import { Component } from '~/src/server/plugins/engine/components/helpers/components.js'
 * @import { FileUploadField, PaymentField } from '~/src/server/plugins/engine/components/index.js'
 * @import { BackLink, ComponentText, ComponentViewModel, DatePartsState, EastingNorthingState, LatLongState, MonthYearState } from '~/src/server/plugins/engine/components/types.js'
 * @import { Translator } from '~/src/server/plugins/engine/i18n/types.js'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItemField } from '~/src/server/plugins/engine/models/types.js'
 * @import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { QuestionPageController } from '~/src/server/plugins/engine/pageControllers/index.js'
 * @import { FileStatus, FormAdapterSubmissionSchemaVersion, UploadStatus } from '~/src/server/plugins/engine/types/enums.js'
 * @import { ViewContext } from '~/src/server/plugins/nunjucks/types.js'
 * @import { FormAction, FormRequest, FormRequestPayload, FormResponseToolkit, FormStatus } from '~/src/server/routes/types.js'
 * @import { CacheService } from '~/src/server/services/cacheService.js'
 * @import { RequestOptions } from '~/src/server/services/httpService.js'
 * @import { Services } from '~/src/server/types.js'
 */
