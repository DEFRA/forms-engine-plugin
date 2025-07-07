import Boom from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'

import {
  findPage,
  getCacheService,
  getPage,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import { generateUniqueReference } from '~/src/server/plugins/engine/referenceNumbers.js'
import { type FormContext } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'

export async function redirectOrMakeHandler(
  request: FormRequest | FormRequestPayload,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>,
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
