import {
  type FormDefinition,
  type FormMetadata,
  type SubmitPayload,
  type SubmitResponsePayload
} from '@defra/forms-model'
import { type Server } from '@hapi/hapi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type DetailItem } from '~/src/server/plugins/engine/models/types.js'
import { type PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import {
  type FormContext,
  type OnRequestCallback,
  type PluginOptions,
  type PreparePageEventRequestOptions
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequestPayload,
  type FormStatus
} from '~/src/server/routes/types.js'
import { type CacheService } from '~/src/server/services/cacheService.js'

export interface FormsService {
  getFormMetadata: (slug: string) => Promise<FormMetadata>
  getFormDefinition: (
    id: string,
    state: FormStatus
  ) => Promise<FormDefinition | undefined>
}

export interface FormSubmissionService {
  persistFiles: (
    files: { fileId: string; initiatedRetrievalKey: string }[],
    persistedRetrievalKey: string
  ) => Promise<object>
  submit: (data: SubmitPayload) => Promise<SubmitResponsePayload | undefined>
}

export interface Services {
  formsService: FormsService
  formSubmissionService: FormSubmissionService
  outputService: OutputService
}

export interface RouteConfig {
  formFileName?: string
  formFilePath?: string
  enforceCsrf?: boolean
  services?: Services
  controllers?: Record<string, typeof PageController>
  preparePageEventRequestOptions?: PreparePageEventRequestOptions
  onRequest?: OnRequestCallback
  saveAndExit?: PluginOptions['saveAndExit']
  cacheServiceCreator?: (server: Server) => CacheService
}

export interface OutputService {
  submit: (
    context: FormContext,
    request: FormRequestPayload,
    model: FormModel,
    emailAddress: string,
    items: DetailItem[],
    submitResponse: SubmitResponsePayload,
    formMetadata?: FormMetadata
  ) => Promise<void>
}
