import { hasFormComponents } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type ResponseObject, type ResponseToolkit } from '@hapi/hapi'

import { redirectOrMakeHandler } from '~/src/server/plugins/engine/handlers/index.js'
import {
  normalisePath,
  proceed,
  redirectPath
} from '~/src/server/plugins/engine/helpers.js'
import { SummaryViewModel } from '~/src/server/plugins/engine/models/index.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/machine/v1.js'
import { getFormSubmissionData } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import {
  type FormRequest,
  type FormRequestPayload
} from '~/src/server/routes/types.js'
import * as httpService from '~/src/server/services/httpService.js'

export function makeGetHandler(
  dispatchHandler: (
    request: FormRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) => ResponseObject
) {
  function getHandler(
    request: FormRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ): ResponseObject | Promise<ResponseObject> {
    const { params } = request

    if (normalisePath(params.path) === '') {
      return dispatchHandler(request, h)
    }

    return redirectOrMakeHandler(request, h, async (page, context) => {
      // Check for a page onLoad HTTP event and if one exists,
      // call it and assign the response to the context data
      const { events } = page
      const { model } = request.app

      if (!model) {
        throw Boom.notFound(`No model found for /${params.path}`)
      }

      if (events?.onLoad && events.onLoad.type === 'http') {
        const { options } = events.onLoad
        const { url } = options

        // TODO: Update structured data POST payload with when helper
        // is updated to removing the dependency on `SummaryViewModel` etc.
        const viewModel = new SummaryViewModel(request, page, context)
        const items = getFormSubmissionData(
          viewModel.context,
          viewModel.details
        )

        // @ts-expect-error - function signature will be refactored in the next iteration of the formatter
        const payload = format(items, model, undefined, undefined)

        const { payload: response } = await httpService.postJson(url, {
          payload
        })

        Object.assign(context.data, response)
      }

      return page.makeGetRouteHandler()(request, context, h)
    })
  }

  return getHandler
}

export function postHandler(
  request: FormRequestPayload,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { query } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    const { pageDef } = page
    const { isForceAccess } = context

    // Redirect to GET for preview URL direct access
    if (isForceAccess && !hasFormComponents(pageDef)) {
      return proceed(request, h, redirectPath(page.href, query))
    }

    return page.makePostRouteHandler()(request, context, h)
  })
}
