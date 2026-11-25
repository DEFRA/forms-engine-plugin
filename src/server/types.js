/**
 * @typedef {{
 *   getFormMetadata: (slug: string) => Promise<FormMetadata>
 *   getFormMetadataById: (id: string) => Promise<FormMetadata>
 *   getFormDefinition: (
 *     id: string,
 *     state: FormStatus
 *   ) => Promise<FormDefinition | undefined>
 *   getFormSecret: (formId: string, secretName: string) => Promise<string>
 * }} FormsService
 */

/**
 * @typedef {{
 *   persistFiles: (
 *     files: { fileId: string; initiatedRetrievalKey: string }[],
 *     persistedRetrievalKey: string
 *   ) => Promise<object>
 *   submit: (data: SubmitPayload) => Promise<SubmitResponsePayload | undefined>
 * }} FormSubmissionService
 */

/**
 * @typedef {{
 *   formsService: FormsService
 *   formSubmissionService: FormSubmissionService
 *   outputService: OutputService
 *   paymentService?: PaymentService
 * }} Services
 */

/**
 * @typedef {{
 *   formFileName?: string
 *   formFilePath?: string
 *   enforceCsrf?: boolean
 *   services?: Services
 *   controllers?: Record<string, typeof PageController>
 *   preparePageEventRequestOptions?: PreparePageEventRequestOptions
 *   onRequest?: OnRequestCallback
 *   saveAndExit?: PluginOptions['saveAndExit']
 *   cacheServiceCreator?: (server: Server) => CacheService
 *   ordnanceSurveyApiKey?: string
 *   ordnanceSurveyApiSecret?: string
 *   getLanguage?: GetLanguageHandler
 * }} RouteConfig
 */

/**
 * @typedef {{
 *   submit: (
 *     context: FormContext,
 *     request: FormRequestPayload,
 *     model: FormModel,
 *     emailAddress: string,
 *     items: DetailItem[],
 *     submitResponse: SubmitResponsePayload,
 *     formMetadata?: FormMetadata
 *   ) => Promise<void>
 * }} OutputService
 */

/**
 * @import { FormDefinition, FormMetadata, SubmitPayload, SubmitResponsePayload } from '@defra/forms-model'
 * @import { Server } from '@hapi/hapi'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { DetailItem } from '~/src/server/plugins/engine/models/types.js'
 * @import { PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
 * @import { FormContext, GetLanguageHandler, OnRequestCallback, PluginOptions, PreparePageEventRequestOptions } from '~/src/server/plugins/engine/types.js'
 * @import { PaymentService } from '~/src/server/plugins/payment/service.js'
 * @import { FormRequestPayload, FormStatus } from '~/src/server/routes/types.js'
 * @import { CacheService } from '~/src/server/services/cacheService.js'
 */
