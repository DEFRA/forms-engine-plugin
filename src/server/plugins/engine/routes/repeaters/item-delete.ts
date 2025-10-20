import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { type RouteOptions, type ServerRoute } from '@hapi/hapi'
import Joi from 'joi'

import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import { type OnRequestCallback } from '~/src/server/plugins/engine/types.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs,
  type FormResponseToolkit
} from '~/src/server/routes/types.js'
import {
  actionSchema,
  confirmSchema,
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'

// Item delete GET route
function getHandler(onRequest?: OnRequestCallback) {
  return async function (request: FormRequest, h: FormResponseToolkit) {
    const { params } = request

    return redirectOrMakeHandler(request, h, onRequest, (page, context) => {
      if (
        !(
          page instanceof RepeatPageController ||
          page instanceof FileUploadPageController
        )
      ) {
        throw Boom.notFound(`No page found for /${params.path}`)
      }

      return page.makeGetItemDeleteRouteHandler()(request, context, h)
    })
  }
}

function postHandler(onRequest?: OnRequestCallback) {
  return async function (request: FormRequestPayload, h: FormResponseToolkit) {
    const { params } = request

    return redirectOrMakeHandler(request, h, onRequest, (page, context) => {
      const { isForceAccess } = context

      if (
        isForceAccess ||
        !(
          page instanceof RepeatPageController ||
          page instanceof FileUploadPageController
        )
      ) {
        throw Boom.notFound(`No page found for /${params.path}`)
      }

      return page.makePostItemDeleteRouteHandler()(request, context, h)
    })
  }
}

export function getRoutes(
  getRouteOptions: RouteOptions<FormRequestRefs>,
  postRouteOptions: RouteOptions<FormRequestPayloadRefs>,
  onRequest?: OnRequestCallback
): (ServerRoute<FormRequestRefs> | ServerRoute<FormRequestPayloadRefs>)[] {
  return [
    {
      method: 'get',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: getHandler(onRequest),
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          })
        }
      }
    },

    {
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: getHandler(onRequest),
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          })
        }
      }
    },

    {
      method: 'post',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: postHandler(onRequest),
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema,
              confirm: confirmSchema
            })
            .required()
        }
      }
    },

    {
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: postHandler(onRequest),
      options: {
        ...postRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema,
            path: pathSchema,
            itemId: itemIdSchema
          }),
          payload: Joi.object()
            .keys({
              crumb: crumbSchema,
              action: actionSchema,
              confirm: confirmSchema
            })
            .required()
        }
      }
    }
  ]
}
