import Boom from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type Server
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import { object } from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { FormComponent } from '~/src/server/plugins/engine/components/FormComponent.js'
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
  type FormContext,
  type FormState,
  type FormStateValue,
  type FormSubmissionState,
  type PluginOptions
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'

export async function redirectOrMakeHandler(
  request: AnyFormRequest,
  h: FormResponseToolkit,
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

function importExternalComponentState(
  request: AnyFormRequest,
  page: PageControllerClass,
  state: FormSubmissionState
): Promise<FormSubmissionState> {
  const externalComponentData: string = request.yar.flash(
    'externalStateAppendage'
  )[0]

  if (!externalComponentData) {
    return Promise.resolve(state)
  }

  let componentName: string | undefined
  let stateAppendage: FormState | undefined

  try {
    const externalComponentPayload = JSON.parse(externalComponentData) as {
      component: string
      data: FormState
    }
    componentName = externalComponentPayload.component
    stateAppendage = externalComponentPayload.data
  } catch (e) {
    request.server.logger.error(
      e,
      'Error parsing external component state JSON or type cast failed'
    )
    throw new Error(
      'Error parsing external component state JSON or type cast failed'
    )
  }

  const component = request.app.model?.componentMap.get(componentName)

  if (!component) {
    throw new Error(`Component ${componentName} not found in form`)
  }

  if (!(component instanceof FormComponent)) {
    throw new Error(
      `Component ${componentName} is not a FormComponent and does not support isState`
    )
  }

  if (!stateAppendage) {
    throw new Error('No state appendage found')
  }

  // Filter stateAppendage keys to only those starting with componentName
  const filteredStateAppendage = Object.keys(stateAppendage)
    .filter((key) => key.startsWith(componentName))
    .reduce((acc: Record<string, unknown>, key) => {
      acc[key] = stateAppendage[key]
      return acc
    }, {})

  // if (!component.isState(filteredStateAppendage as FormState)) {
  //   throw new Error(`State for component ${componentName} is invalid`)
  // }

  return page.mergeState(request, state, {
    ...filteredStateAppendage
  })
}

export function makeLoadFormPreHandler(server: Server, options: PluginOptions) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- hapi types are wrong
  const prefix = server.realm.modifiers.route.prefix ?? ''

  const { services = defaultServices, controllers, onRequest } = options

  const { formsService } = services

  async function handler(request: AnyFormRequest, h: ResponseToolkit) {
    if (server.app.model) {
      request.app.model = server.app.model

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
        { basePath, versionNumber },
        services,
        controllers
      )

      // Create new item and add it to the item cache
      item = { model, updatedAt: state.updatedAt }
      server.app.models.set(key, item)
    }

    // Call the onRequest callback if it has been supplied
    if (onRequest) {
      onRequest(request, params, item.model.def, metadata)
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
