import Boom from '@hapi/boom'
import { type Request, type Server } from '@hapi/hapi'
import { isEqual } from 'date-fns'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import {
  getAnswer,
  type Field
} from '~/src/server/plugins/engine/components/helpers/components.js'
import {
  checkEmailAddressForLiveFormSubmission,
  evaluateTemplate,
  getCacheService,
  getPageHref
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { TerminalPageController } from '~/src/server/plugins/engine/pageControllers/index.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import {
  type FormContext,
  type FormContextRequest,
  type FormSubmissionError
} from '~/src/server/plugins/engine/types.js'
import { FormStatus } from '~/src/server/routes/types.js'
import { type Services } from '~/src/server/types.js'

type JourneyState = FormStatus | 'preview'

export interface FormModelOptions {
  services?: Services
  controllers?: Record<string, typeof PageController>
  basePath?: string
  versionNumber?: number
  ordnanceSurveyApiKey?: string
  formId?: string
  routePrefix?: string
  isPreview?: boolean
}

export interface FormContextOptions extends FormModelOptions {
  errors?: FormSubmissionError[]
  referenceNumber?: string
}

type SummaryRequest = FormContextRequest & {
  yar: Request['yar']
}

export async function getFormModel(
  slug: string,
  state: JourneyState,
  options: FormModelOptions = {}
) {
  const services = options.services ?? defaultServices
  const { formsService } = services
  const isPreview = isPreviewState(state, options)
  const formState = resolveState(state)

  const metadata = await formsService.getFormMetadata(slug)
  const versionNumber =
    options.versionNumber ?? metadata.versions?.[0]?.versionNumber

  const definition = await formsService.getFormDefinition(
    metadata.id,
    formState
  )

  if (!definition) {
    throw Boom.notFound(
      `No definition found for form metadata ${metadata.id} (${slug}) ${state}`
    )
  }

  return new FormModel(
    definition,
    {
      basePath:
        options.basePath ??
        buildBasePath(
          options.routePrefix ?? '',
          slug,
          formState,
          isPreview
        ),
      versionNumber,
      ordnanceSurveyApiKey: options.ordnanceSurveyApiKey,
      formId: options.formId ?? metadata.id
    },
    services,
    options.controllers
  )
}

export async function getFormContext(
  { server, yar }: Pick<Request, 'server' | 'yar'>,
  journey: string,
  state: JourneyState = FormStatus.Live,
  options: FormContextOptions = {}
): Promise<FormContext> {
  const formModel = await resolveFormModel(
    server,
    journey,
    state,
    options
  )

  const cacheService = getCacheService(server)

  const summaryRequest: SummaryRequest = {
    app: {},
    method: 'get',
    params: {
      path: 'summary',
      slug: journey,
      ...(isPreviewState(state, options) && {
        state: resolveState(state)
      })
    },
    path: `/${formModel.basePath}/summary`,
    query: {},
    url: new URL(
      `/${formModel.basePath}/summary`,
      'http://form-context.local'
    ),
    server,
    yar
  }

  const cachedState = await cacheService.getState(summaryRequest)

  const formState = {
    ...cachedState,
    $$__referenceNumber:
      options.referenceNumber ??
      cachedState.$$__referenceNumber ??
      'TODO'
  }

  return formModel.getFormContext(
    summaryRequest,
    formState,
    options.errors ?? []
  )
}

export async function resolveFormModel(
  server: Server,
  slug: string,
  state: JourneyState,
  options: FormModelOptions = {}
) {
  const services = options.services ?? defaultServices
  const { formsService } = services

  const metadata = await formsService.getFormMetadata(slug)
  const formState = resolveState(state)
  const isPreview = options.isPreview ?? isPreviewState(state, options)
  const stateMetadata = metadata[formState]

  if (!stateMetadata) {
    throw Boom.notFound(`No '${formState}' state for form metadata ${metadata.id}`)
  }

  // The models cache is created lazily per server instance
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!server.app.models) {
    server.app.models = new Map<string, { model: FormModel; updatedAt: Date }>()
  }

  const cache = server.app.models as Map<
    string,
    { model: FormModel; updatedAt: Date }
  >

  const cacheKey = `${metadata.id}_${formState}_${isPreview}`
  let entry = cache.get(cacheKey)

  if (!entry || !isEqual(entry.updatedAt, stateMetadata.updatedAt)) {
    const definition = await formsService.getFormDefinition(
      metadata.id,
      formState
    )

    if (!definition) {
      throw Boom.notFound(
        `No definition found for form metadata ${metadata.id} (${slug}) ${state}`
      )
    }

    const emailAddress = metadata.notificationEmail ?? definition.outputEmail

    checkEmailAddressForLiveFormSubmission(emailAddress, isPreview)

    const routePrefix =
      options.routePrefix ?? server.realm.modifiers.route.prefix

    const model = new FormModel(
      definition,
      {
        basePath:
          options.basePath ??
          buildBasePath(routePrefix, slug, formState, isPreview),
        versionNumber:
          options.versionNumber ?? metadata.versions?.[0]?.versionNumber,
        ordnanceSurveyApiKey: options.ordnanceSurveyApiKey,
        formId: options.formId ?? metadata.id
      },
      services,
      options.controllers
    )

    entry = { model, updatedAt: stateMetadata.updatedAt }
    cache.set(cacheKey, entry)
  }

  return entry.model
}

function buildBasePath(
  routePrefix: string,
  slug: string,
  state: FormStatus,
  isPreview: boolean
) {
  const base = (
    isPreview
      ? `${routePrefix}${PREVIEW_PATH_PREFIX}/${state}/${slug}`
      : `${routePrefix}/${slug}`
  ).replace(/\/{2,}/g, '/')

  return base.startsWith('/') ? base.slice(1) : base
}

export function getFirstJourneyPage(
  context?: Pick<FormContext, 'relevantPages'>
) {
  if (!context?.relevantPages) {
    return undefined
  }

  const lastPageReached = context.relevantPages.at(-1)
  const penultimatePageReached = context.relevantPages.at(-2)

  if (
    lastPageReached instanceof TerminalPageController &&
    penultimatePageReached
  ) {
    return penultimatePageReached
  }

  return lastPageReached
}

export function mapFormContextToAnswers(
  context?: Pick<FormContext, 'relevantPages' | 'state'>,
  { returnPath = '/summary' }: { returnPath?: string } = {}
) {
  if (!context) {
    return []
  }

  const { relevantPages = [], state = {} } = context

  return relevantPages.flatMap((page) => {
    const fields = page.collection.fields

    return fields
      .map((field) => {
        const value = field.getFormValueFromState(state)
        if (!hasRenderableValue(value)) {
          return undefined
        }

        return {
          slug: resolveFieldSlug(page),
          changeHref: resolveChangeHref(page, returnPath),
          question: safeEvaluateTemplate(field.title, context),
          questionKey: field.name,
          answer: {
            type: mapAnswerType(field),
            value,
            displayText: getAnswer(field, state)
          }
        }
      })
      .filter(Boolean)
  })
}

function hasRenderableValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasRenderableValue(entry))
  }

  if (typeof value === 'object') {
    return Object.values(value).some((entry) => hasRenderableValue(entry))
  }

  return true
}

function mapAnswerType(field: Field) {
  const map = {
    UkAddressField: 'address',
    DatePartsField: 'date',
    MonthYearField: 'date',
    NumberField: 'number',
    CheckboxesField: 'checkbox',
    FileUploadField: 'file'
  }

  return map[field.type] ?? 'text'
}

function safeEvaluateTemplate(template: string, context: FormContext) {
  try {
    return evaluateTemplate(template, context)
  } catch {
    return template
  }
}

function resolveFieldSlug(page?: PageControllerClass) {
  if (!page) {
    return undefined
  }

  try {
    if (typeof page.getHref === 'function') {
      const targetPath = page.path || '/'
      return getPageHref(page, targetPath)
    }
  } catch {
    // ignore and fall back to raw path
  }

  return page.path
}

function resolveChangeHref(page: PageControllerClass | undefined, summaryPath: string) {
  const slug = resolveFieldSlug(page)

  if (!page || !slug) {
    return slug
  }

  if (typeof page.getHref !== 'function' || typeof summaryPath !== 'string') {
    return slug
  }

  try {
    const target = getPageHref(page, summaryPath)
    return getPageHref(page, page.path || '/', { returnUrl: target })
  } catch {
    return slug
  }
}

function resolveState(state: JourneyState): FormStatus {
  return state === 'preview' ? FormStatus.Live : state
}

function isPreviewState(
  state: JourneyState,
  options: FormModelOptions = {}
): boolean {
  return options.isPreview ?? state === 'preview'
}
