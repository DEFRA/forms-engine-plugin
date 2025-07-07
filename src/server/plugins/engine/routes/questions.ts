import { hasFormComponents, slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
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
import { SummaryViewModel } from '~/src/server/plugins/engine/models/index.js'
import { format } from '~/src/server/plugins/engine/outputFormatters/machine/v1.js'
import { getFormSubmissionData } from '~/src/server/plugins/engine/pageControllers/SummaryPageController.js'
import {
  dispatchHandler,
  redirectOrMakeHandler
} from '~/src/server/plugins/engine/routes/index.js'
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

function getHandler(
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
      const { options } = events.onLoad
      const { url } = options

      // TODO: Update structured data POST payload with when helper
      // is updated to removing the dependency on `SummaryViewModel` etc.
      const viewModel = new SummaryViewModel(request, page, context)
      const items = getFormSubmissionData(viewModel.context, viewModel.details)

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

function postHandler(
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

export function getRoutes(
  getRouteOptions: RouteOptions<FormRequestRefs>,
  postRouteOptions: RouteOptions<FormRequestPayloadRefs>
): (ServerRoute<FormRequestRefs> | ServerRoute<FormRequestPayloadRefs>)[] {
  return [
    {
      method: 'get',
      path: '/{slug}',
      handler: getHandler,
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
      handler: getHandler,
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
      handler: getHandler,
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
      handler: postHandler,
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
      handler: postHandler,
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
