import { getHiddenFields } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type Server
} from '@hapi/hapi'
import { isEqual } from 'date-fns'

import {
  EXTERNAL_STATE_APPENDAGE,
  EXTERNAL_STATE_PAYLOAD,
  PREVIEW_PATH_PREFIX
} from '~/src/server/constants.js'
import {
  FormComponent,
  isFormState
} from '~/src/server/plugins/engine/components/FormComponent.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  findPage,
  getCacheService,
  getPage,
  getStartPath,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
import { generateUniqueReference } from '~/src/server/plugins/engine/referenceNumbers.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import {
  type AnyFormRequest,
  type ExternalStateAppendage,
  type FormContext,
  type FormPayload,
  type FormStateValue,
  type FormSubmissionState,
  type OnRequestCallback,
  type PluginOptions
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'
import { type Services } from '~/src/server/types.js'

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

/**
 * A series of functions that can transform a pre-fill input parameter e.g lookup a form title based on firm id
 */
const paramLookupFunctions = {
  formId: async (val: string, services: Services) => {
    const meta = await services.formsService.getFormMetadataById(val)
    return meta.title
  }
} as Partial<
  Record<
    string,
    (val: string, services: Services) => Promise<string | undefined>
  >
>

/**
 * Any hidden parameters defined in the FormDefinition may be pre-filled by URL parameter values.
 * Other parameters are ignored for security reasons.
 * @param request
 * @param model
 */
export async function prefillStateFromQueryParameters(
  request: AnyFormRequest,
  model: FormModel
): Promise<void> {
  const hiddenFieldNames = new Set(
    getHiddenFields(model.def).map((field) => field.name)
  )
  const query = Object.keys(request.query).length ? request.query : undefined

  if (!query) {
    return
  }

  const params = {} as Record<string, FormStateValue | undefined>

  for (const [key, value = ''] of Object.entries(query)) {
    if (hiddenFieldNames.has(key)) {
      const lookupFunc = paramLookupFunctions[key]
      const resValue = lookupFunc
        ? await lookupFunc(value, model.services)
        : value
      params[key] = resValue
    }
  }

  const page = model.pages[0] // Any page will do so just take the first one
  const formData = await page.getState(request)
  await page.mergeState(request, formData, params)
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

  const componentState = isFormState(stateAppendage)
    ? Object.fromEntries(
        Object.entries(stateAppendage).map(([key, value]) => [
          `${componentName}__${key}`,
          value
        ])
      )
    : { [componentName]: stateAppendage }

  // Save the external component state immediately
  const pageState = page.getStateFromValidForm(
    request,
    state,
    componentState as FormPayload
  )
  const savedState = await page.mergeState(request, state, pageState)

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

  const { formsService } = services

  async function handler(request: AnyFormRequest, h: ResponseToolkit) {
    if (server.app.model) {
      request.app.model = server.app.model

      // Copy any URL params into the form state
      await prefillStateFromQueryParameters(request, request.app.model)

      return h.continue
    }

    const { params } = request
    const { slug } = params
    const { isPreview, state: formState } = checkFormStatus(params)

    // Get the form metadata using the `slug` param
    const metadata = await formsService.getFormMetadata(slug)

    const { id, [formState]: state } = metadata

    // Check the metadata supports the requested state
    if (!state) {
      throw Boom.notFound(`No '${formState}' state for form metadata ${id}`)
    }

    // Cache the models based on id, state and whether
    // it's a preview or not. There could be up to 3 models
    // cached for a single form:
    // "{id}_live_false" (live/live)
    // "{id}_live_true" (live/preview)
    // "{id}_draft_true" (draft/preview)
    const key = `${id}_${formState}_${isPreview}`
    let item = server.app.models.get(key)

    if (!item || !isEqual(item.updatedAt, state.updatedAt)) {
      server.logger.info(`Getting form definition ${id} (${slug}) ${formState}`)

      // Get the form definition using the `id` from the metadata
      const definition = await formsService.getFormDefinition(id, formState)

      if (!definition) {
        throw Boom.notFound(
          `No definition found for form metadata ${id} (${slug}) ${formState}`
        )
      }

      const emailAddress = metadata.notificationEmail ?? definition.outputEmail

      checkEmailAddressForLiveFormSubmission(emailAddress, isPreview)

      // Build the form model
      server.logger.info(
        `Building model for form definition ${id} (${slug}) ${formState}`
      )

      // Set up the basePath for the model
      const basePath = (
        isPreview
          ? `${prefix}${PREVIEW_PATH_PREFIX}/${formState}/${slug}`
          : `${prefix}/${slug}`
      ).substring(1)

      const versionNumber = metadata.versions?.[0]?.versionNumber

      // Construct the form model
      const model = new FormModel(
        definition,
        { basePath, versionNumber, ordnanceSurveyApiKey, formId: id },
        services,
        controllers
      )

      // Copy any URL params into the form state
      await prefillStateFromQueryParameters(request, model)

      // Create new item and add it to the item cache
      item = { model, updatedAt: state.updatedAt }
      server.app.models.set(key, item)
    }

    // Assign the model to the request data
    // for use in the downstream handler
    request.app.model = item.model

    return h.continue
  }

  return handler
}

export function dispatchHandler(request: FormRequest, h: FormResponseToolkit) {
  const { model } = request.app

  const servicePath = model ? `/${model.basePath}` : ''
  return proceed(request, h, `${servicePath}${getStartPath(model)}`)
}
