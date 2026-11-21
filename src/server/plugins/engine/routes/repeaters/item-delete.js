import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'

import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import {
  actionSchema,
  confirmSchema,
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'

// Item delete GET route
/**
 * @param {OnRequestCallback} [onRequest]
 */
function getHandler(onRequest) {
  /**
   * @param {FormRequest} request
   * @param {FormResponseToolkit} h
   */
  return async function (request, h) {
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

/**
 * @param {OnRequestCallback} [onRequest]
 */
function postHandler(onRequest) {
  /**
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   */
  return async function (request, h) {
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

/**
 * @param {RouteOptions<FormRequestRefs>} getRouteOptions
 * @param {RouteOptions<FormRequestPayloadRefs>} postRouteOptions
 * @param {OnRequestCallback} [onRequest]
 * @returns {(ServerRoute<FormRequestRefs> | ServerRoute<FormRequestPayloadRefs>)[]}
 */
export function getRoutes(getRouteOptions, postRouteOptions, onRequest) {
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

/**
 * @import { RouteOptions, ServerRoute } from '@hapi/hapi'
 * @import { OnRequestCallback } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormRequestPayloadRefs, FormRequestRefs, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
