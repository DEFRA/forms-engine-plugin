import Boom from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type Server
} from '@hapi/hapi'

import {
  EXTERNAL_STATE_APPENDAGE,
  EXTERNAL_STATE_PAYLOAD
} from '~/src/server/constants.js'
import { resolveFormModel } from '~/src/server/plugins/engine/beta/form-context.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  checkFormStatus,
  findPage,
  getCacheService,
  getPage,
  getStartPath,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { generateUniqueReference } from '~/src/server/plugins/engine/referenceNumbers.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import {
  type AnyFormRequest,
  type ExternalStateAppendage,
  type FormContext,
  type FormPayload,
  type FormSubmissionState,
  type OnRequestCallback,
  type PluginOptions
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'

export async function redirectOrMakeHandler(
  request: AnyFormRequest,
  h: FormResponseToolkit,
  onRequest: OnRequestCallback | undefined,
  makeHandler: (
    page: PageControllerClass,
    context: FormContext
  ) => ResponseObject | Promise<ResponseObject>
) {
  const { app, params } = request
  const { model } = app

  if (!model) {
    throw Boom.notFound(`No model found for /${params.path}`)
  }

  const cacheService = getCacheService(request.server)
  const page = getPage(model, request)
  let state = await page.getState(request)

  if (!state.$$__referenceNumber) {
    const prefix = model.def.metadata?.referenceNumberPrefix ?? ''

    if (typeof prefix !== 'string') {
      throw Boom.badImplementation(
        'Reference number prefix must be a string or undefined'
      )
    }

    const referenceNumber = generateUniqueReference(prefix)
    state = await page.mergeState(request, state, {
      $$__referenceNumber: referenceNumber
    })
  }

  state = await importExternalComponentState(request, page, state)

  const flash = cacheService.getFlash(request)
  const context = model.getFormContext(request, state, flash?.errors)
  const relevantPath = page.getRelevantPath(request, context)
  const summaryPath = page.getSummaryPath()

  // Call the onRequest callback if it has been supplied
  if (onRequest) {
    const result = await onRequest(request, h, context)
    if (result !== h.continue) {
      return result
    }
  }

  // Return handler for relevant pages or preview URL direct access
  if (relevantPath.startsWith(page.path) || context.isForceAccess) {
    return makeHandler(page, context)
  }

  // Redirect back to last relevant page
  const redirectTo = findPage(model, relevantPath)

  // Set the return URL unless an exit page
  if (redirectTo?.next.length) {
    request.query.returnUrl = page.getHref(summaryPath)
  }

  return proceed(request, h, page.getHref(relevantPath))
}

async function importExternalComponentState(
  request: AnyFormRequest,
  page: PageControllerClass,
  state: FormSubmissionState
): Promise<FormSubmissionState> {
  const externalComponentData = request.yar.flash(EXTERNAL_STATE_APPENDAGE)

  if (Array.isArray(externalComponentData)) {
    return state
  }

  const typedStateAppendage = externalComponentData as ExternalStateAppendage
  const componentName = typedStateAppendage.component
  const stateAppendage = typedStateAppendage.data

  const component = request.app.model?.componentMap.get(componentName)

  if (!component) {
    throw new Error(`Component ${componentName} not found in form`)
  }

  if (!(component instanceof FormComponent)) {
    throw new TypeError(
      `Component ${componentName} is not a FormComponent and does not support isState`
    )
  }

  const isStateValid = component.isState(stateAppendage)

  if (!isStateValid) {
    throw new Error(`State for component ${componentName} is invalid`)
  }

  // Create state structure from appendage state
  // Some components use a record structure with properties of the format of '<compName>__<fieldName>'
  // e.g. UKAddressField
  // Some components use a single object structure e.g. PaymentField
  const componentState =
    isFormState(stateAppendage) && !component.isAppendageStateSingleObject
      ? Object.fromEntries(
          Object.entries(stateAppendage).map(([key, value]) => [
            `${componentName}__${key}`,
            value
          ])
        )
      : { [componentName]: stateAppendage }

  // Save the external component state directly (already has correct key format)
  const savedState = await page.mergeState(request, state, componentState)

  // Merge any stashed payload into the local state
  const payload = request.yar.flash(EXTERNAL_STATE_PAYLOAD)
  const stashedPayload = Array.isArray(payload) ? {} : (payload as FormPayload)

  const localState = page.getStateFromValidForm(request, savedState, {
    ...stashedPayload,
    ...componentState
  } as FormPayload)

  return { ...savedState, ...localState }
}

export function makeLoadFormPreHandler(server: Server, options: PluginOptions) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- hapi types are wrong
  const prefix = server.realm.modifiers.route.prefix ?? ''

  const {
    services = defaultServices,
    controllers,
    ordnanceSurveyApiKey
  } = options

  async function handler(request: AnyFormRequest, h: ResponseToolkit) {
    if (server.app.model) {
      request.app.model = server.app.model

      return h.continue
    }

    const { params } = request
    const { slug } = params
    const { isPreview, state: formState } = checkFormStatus(params)

    const model = await resolveFormModel(server, slug, formState, {
      services,
      controllers,
      ordnanceSurveyApiKey,
      routePrefix: prefix,
      isPreview
    })

    request.app.model = model

    return h.continue
  }

  return handler
}

export function dispatchHandler(request: FormRequest, h: FormResponseToolkit) {
  const { model } = request.app

  const servicePath = model ? `/${model.basePath}` : ''
  return proceed(request, h, `${servicePath}${getStartPath(model)}`)
}
