// List summary GET route
import { slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import Joi from 'joi'

import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/routes/index.js'
import {
  actionSchema,
  crumbSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'

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
      if (!(page instanceof RepeatPageController)) {
        throw Boom.notFound(`No repeater page found for /${params.path}`)
      }

      return page.makeGetListSummaryRouteHandler()(request, context, h)
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

      if (isForceAccess || !(page instanceof RepeatPageController)) {
        throw Boom.notFound(`No repeater page found for /${params.path}`)
      }

      return page.makePostListSummaryRouteHandler()(request, context, h)
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
      path: '/{slug}/{path}/summary',
      handler: getHandler(onRequest),
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
      handler: getHandler(onRequest),
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
      handler: postHandler(onRequest),
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
      handler: postHandler(onRequest),
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

/**
 * @import { RouteOptions, ServerRoute } from '@hapi/hapi'
 * @import { OnRequestCallback } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormRequestPayloadRefs, FormRequestRefs, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
