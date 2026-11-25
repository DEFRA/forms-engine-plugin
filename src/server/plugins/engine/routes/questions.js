import { hasFormComponents, slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
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
  actionSchema,
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'
import * as httpService from '~/src/server/services/httpService.js'
import { resolveLanguage } from '~/src/server/utils/utils.js'

/**
 * @param {AnyFormRequest} request
 * @param {PageControllerClass} page
 * @param {FormContext} context
 * @param {Event} event
 * @param {FormModel} model
 * @param {PreparePageEventRequestOptions} [preparePageEventRequestOptions]
 */
async function handleHttpEvent(
  request,
  page,
  context,
  event,
  model,
  preparePageEventRequestOptions
) {
  const { options } = event
  const { url } = options

  // TODO: Update structured data POST payload with when helper
  // is updated to removing the dependency on `SummaryViewModel` etc.
  const language = resolveLanguage(request)
  const translator = model.createTranslator(language)
  const viewModel = new SummaryViewModel(request, page, context, translator)
  const items = getFormSubmissionData(
    viewModel.context,
    viewModel.details,
    model,
    translator
  )

  // @ts-expect-error - function signature will be refactored in the next iteration of the formatter
  const payload = format(context, items, model, undefined, undefined)
  /** @type {httpService.RequestOptions} */
  const opts = { payload, timeout: 5000 }

  if (preparePageEventRequestOptions) {
    preparePageEventRequestOptions(opts, event, page, context)
  }

  const { payload: response } = await httpService.postJson(url, opts)

  Object.assign(context.data, response)
}

/**
 * @param {PreparePageEventRequestOptions} [preparePageEventRequestOptions]
 * @param {OnRequestCallback} [onRequest]
 */
export function makeGetHandler(preparePageEventRequestOptions, onRequest) {
  /**
   * @param {FormRequest} request
   * @param {FormResponseToolkit} h
   */
  return function getHandler(request, h) {
    const { params } = request

    if (normalisePath(params.path) === '') {
      return dispatchHandler(request, h)
    }

    return redirectOrMakeHandler(
      request,
      h,
      onRequest,
      async (page, context) => {
        // Check for a page onLoad HTTP event and if one exists,
        // call it and assign the response to the context data
        const { events } = page
        const { model } = request.app

        if (!model) {
          throw Boom.notFound(`No model found for /${params.path}`)
        }

        if (events?.onLoad?.type === 'http') {
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
      }
    )
  }
}

/**
 * @param {PreparePageEventRequestOptions} [preparePageEventRequestOptions]
 * @param {OnRequestCallback} [onRequest]
 */
export function makePostHandler(preparePageEventRequestOptions, onRequest) {
  /**
   * @param {FormRequestPayload} request
   * @param {FormResponseToolkit} h
   */
  return function postHandler(request, h) {
    const { query } = request

    return redirectOrMakeHandler(
      request,
      h,
      onRequest,
      async (page, context) => {
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

        if (events?.onSave?.type === 'http' && isSuccessful(response)) {
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
      }
    )
  }
}

/**
 * @param {ResponseObject} response
 * @returns {boolean}
 */
function isSuccessful(response) {
  const { statusCode } = response

  return !Boom.isBoom(response) && statusCode >= 200 && statusCode < 400
}

/**
 * @param {RouteOptions<FormRequestRefs>} getRouteOptions
 * @param {RouteOptions<FormRequestPayloadRefs>} postRouteOptions
 * @param {PreparePageEventRequestOptions} [preparePageEventRequestOptions]
 * @param {OnRequestCallback} [onRequest]
 * @returns {(ServerRoute<FormRequestRefs> | ServerRoute<FormRequestPayloadRefs>)[]}
 */
export function getRoutes(
  getRouteOptions,
  postRouteOptions,
  preparePageEventRequestOptions,
  onRequest
) {
  return [
    {
      method: 'get',
      path: '/{slug}',
      handler: makeGetHandler(preparePageEventRequestOptions, onRequest),
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
      handler: makeGetHandler(preparePageEventRequestOptions, onRequest),
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
      handler: makeGetHandler(preparePageEventRequestOptions, onRequest),
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
      handler: makePostHandler(preparePageEventRequestOptions, onRequest),
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
      handler: makePostHandler(preparePageEventRequestOptions, onRequest),
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

/**
 * @import { Event } from '@defra/forms-model'
 * @import { ResponseObject, RouteOptions, ServerRoute } from '@hapi/hapi'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { PageControllerClass } from '~/src/server/plugins/engine/pageControllers/helpers/pages.js'
 * @import { AnyFormRequest, FormContext, OnRequestCallback, PreparePageEventRequestOptions } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequest, FormRequestPayload, FormRequestPayloadRefs, FormRequestRefs, FormResponseToolkit } from '~/src/server/routes/types.js'
 */
