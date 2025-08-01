// List summary GET route
import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type ResponseToolkit,
  type RouteOptions,
  type ServerRoute
} from '@hapi/hapi'
import Joi from 'joi'

import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import {
  actionSchema,
  crumbSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'

function getHandler(
  request: FormRequest,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { params } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    if (!(page instanceof RepeatPageController)) {
      throw Boom.notFound(`No repeater page found for /${params.path}`)
    }

    return page.makeGetListSummaryRouteHandler()(request, context, h)
  })
}

function postHandler(
  request: FormRequestPayload,
  h: Pick<ResponseToolkit, 'redirect' | 'view'>
) {
  const { params } = request

  return redirectOrMakeHandler(request, h, (page, context) => {
    const { isForceAccess } = context

    if (isForceAccess || !(page instanceof RepeatPageController)) {
      throw Boom.notFound(`No repeater page found for /${params.path}`)
    }

    return page.makePostListSummaryRouteHandler()(request, context, h)
  })
}

export function getRoutes(
  getRouteOptions: RouteOptions<FormRequestRefs>,
  postRouteOptions: RouteOptions<FormRequestPayloadRefs>
): (ServerRoute<FormRequestRefs> | ServerRoute<FormRequestPayloadRefs>)[] {
  return [
    {
      method: 'get',
      path: '/{slug}/{path}/summary',
      handler: getHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    },

    {
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/summary',
      handler: getHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    },

    {
      method: 'post',
      path: '/{slug}/{path}/summary',
      handler: postHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .required()
        }
      }
    },

    {
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/summary',
      handler: postHandler,
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema
            })
            .required()
        }
      }
    }
  ]
}
