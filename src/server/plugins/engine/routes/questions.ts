import { hasFormComponents, slugSchema, type Event } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type ResponseObject,
  type ResponseToolkit,
  type RouteOptions,
  type ServerRoute
} from '@hapi/hapi'
import Joi from 'joi'

import {
  normalisePath,
  proceed,
  redirectPath
} from '~/src/server/plugins/engine/helpers.js'
import {
  SummaryViewModel,
  type FormModel
} from '~/src/server/plugins/engine/models/index.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/machine/v1.js'
import { getFormSubmissionData } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import { type PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers.js'
import {
  dispatchHandler,
  redirectOrMakeHandler
} from '~/src/server/plugins/engine/routes/index.js'
import {
  type FormContext,
  type PreparePageEventRequestOptions
} from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import {
  actionSchema,
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'
import * as httpService from '~/src/server/services/httpService.js'

async function handleHttpEvent(
  request: FormRequest | FormRequestPayload,
  page: PageControllerClass,
  context: FormContext,
  event: Event,
  model: FormModel,
  preparePageEventRequestOptions?: PreparePageEventRequestOptions
) {
  const { options } = event
  const { url } = options

  // TODO: Update structured data POST payload with when helper
  // is updated to removing the dependency on `SummaryViewModel` etc.
  const viewModel = new SummaryViewModel(request, page, context)
  const items = getFormSubmissionData(viewModel.context, viewModel.details)

  // @ts-expect-error - function signature will be refactored in the next iteration of the formatter
  const payload = format(context, items, model, undefined, undefined)
  const opts: httpService.RequestOptions = { payload, timeout: 5000 }

  if (preparePageEventRequestOptions) {
    preparePageEventRequestOptions(opts, event, page, context)
  }

  const { payload: response } = await httpService.postJson(url, opts)

  Object.assign(context.data, response)
}

export function makeGetHandler(
  preparePageEventRequestOptions?: PreparePageEventRequestOptions
) {
  return function getHandler(
    request: FormRequest,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) {
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
        await handleHttpEvent(
          request,
          page,
          context,
          events.onLoad,
          model,
          preparePageEventRequestOptions
        )
      }

      return page.makeGetRouteHandler()(request, context, h)
    })
  }
}

export function makePostHandler(
  preparePageEventRequestOptions?: PreparePageEventRequestOptions
) {
  return function postHandler(
    request: FormRequestPayload,
    h: Pick<ResponseToolkit, 'redirect' | 'view'>
  ) {
    const { query } = request

    return redirectOrMakeHandler(request, h, async (page, context) => {
      const { pageDef } = page
      const { isForceAccess } = context
      const { model } = request.app
      const { events } = page

      // Redirect to GET for preview URL direct access
      if (isForceAccess && !hasFormComponents(pageDef)) {
        return proceed(request, h, redirectPath(page.href, query))
      }

      if (!model) {
        throw Boom.notFound(`No model found for /${request.params.path}`)
      }

      const response = await page.makePostRouteHandler()(request, context, h)

      if (
        events?.onSave &&
        events.onSave.type === 'http' &&
        isSuccessful(response)
      ) {
        await handleHttpEvent(
          request,
          page,
          context,
          events.onSave,
          model,
          preparePageEventRequestOptions
        )
      }

      return response
    })
  }
}

function isSuccessful(response: ResponseObject): boolean {
  const { statusCode } = response

  return !Boom.isBoom(response) && statusCode >= 200 && statusCode < 400
}

export function getRoutes(
  getRouteOptions: RouteOptions<FormRequestRefs>,
  postRouteOptions: RouteOptions<FormRequestPayloadRefs>,
  preparePageEventRequestOptions?: PreparePageEventRequestOptions
): (ServerRoute<FormRequestRefs> | ServerRoute<FormRequestPayloadRefs>)[] {
  return [
    {
      method: 'get',
      path: '/{slug}',
      handler: makeGetHandler(preparePageEventRequestOptions),
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema
          })
        }
      }
    },
    {
      method: 'get',
      path: '/preview/{state}/{slug}',
      handler: dispatchHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema
          })
        }
      }
    },
    {
      method: 'get',
      path: '/{slug}/{path}/{itemId?}',
      handler: makeGetHandler(preparePageEventRequestOptions),
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema.optional()
          })
        }
      }
    },
    {
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/{itemId?}',
      handler: makeGetHandler(preparePageEventRequestOptions),
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema.optional()
          })
        }
      }
    },
    {
      method: 'post',
      path: '/{slug}/{path}/{itemId?}',
      handler: makePostHandler(preparePageEventRequestOptions),
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema.optional()
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .unknown(true)
            .required()
        }
      }
    },
    {
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId?}',
      handler: makePostHandler(preparePageEventRequestOptions),
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema.optional()
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .unknown(true)
            .required()
        }
      }
    }
  ]
}
