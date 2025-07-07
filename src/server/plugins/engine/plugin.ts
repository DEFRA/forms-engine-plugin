import { getErrorMessage, slugSchema } from '@defra/forms-model'
import Boom from '@hapi/boom'
import {
  type Plugin,
  type PluginProperties,
  type ResponseToolkit,
  type RouteOptions,
  type Server
} from '@hapi/hapi'
import { isEqual } from 'date-fns'
import Joi from 'joi'

import { PREVIEW_PATH_PREFIX } from '~/src/server/constants.js'
import { redirectOrMakeHandler } from '~/src/server/plugins/engine/handlers/index.js'
import {
  makeGetHandler as makeQuestionGetHandler,
  postHandler as questionPostHandler
} from '~/src/server/plugins/engine/handlers/questions.js'
import {
  checkEmailAddressForLiveFormSubmission,
  checkFormStatus,
  getStartPath,
  proceed
} from '~/src/server/plugins/engine/helpers.js'
import { FormModel } from '~/src/server/plugins/engine/models/index.js'
import { FileUploadPageController } from '~/src/server/plugins/engine/pageControllers/FileUploadPageController.js'
import { type PageController } from '~/src/server/plugins/engine/pageControllers/PageController.js'
import { RepeatPageController } from '~/src/server/plugins/engine/pageControllers/RepeatPageController.js'
import * as defaultServices from '~/src/server/plugins/engine/services/index.js'
import { getUploadStatus } from '~/src/server/plugins/engine/services/uploadService.js'
import { type FilterFunction } from '~/src/server/plugins/engine/types.js'
import { registerVision } from '~/src/server/plugins/engine/vision.js'
import {
  type FormRequest,
  type FormRequestPayload,
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import {
  actionSchema,
  confirmSchema,
  crumbSchema,
  itemIdSchema,
  pathSchema,
  stateSchema
} from '~/src/server/schemas/index.js'
import { CacheService } from '~/src/server/services/index.js'
import { type Services } from '~/src/server/types.js'

export interface PluginOptions {
  model?: FormModel
  services?: Services
  controllers?: Record<string, typeof PageController>
  cacheName?: string
  filters?: Record<string, FilterFunction>
  pluginPath?: string
  nunjucks: {
    baseLayoutPath: string
    paths: string[]
  }
  viewContext: PluginProperties['forms-engine-plugin']['viewContext']
}

export const plugin = {
  name: '@defra/forms-engine-plugin',
  dependencies: ['@hapi/crumb', '@hapi/yar', 'hapi-pino'],
  multiple: true,
  async register(server: Server, options: PluginOptions) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- hapi types are wrong
    const prefix = server.realm.modifiers.route.prefix ?? ''
    const {
      model,
      services = defaultServices,
      controllers,
      cacheName,
      nunjucks: nunjucksOptions,
      viewContext
    } = options
    const { formsService } = services
    const cacheService = new CacheService(server, cacheName)

    await registerVision(server, options)

    server.expose('baseLayoutPath', nunjucksOptions.baseLayoutPath)
    server.expose('viewContext', viewContext)
    server.expose('cacheService', cacheService)

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache = new Map<string, { model: FormModel; updatedAt: Date }>()
    server.app.models = itemCache

    const loadFormPreHandler = async (
      request: FormRequest | FormRequestPayload,
      h: Pick<ResponseToolkit, 'continue'>
    ) => {
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
      let item = itemCache.get(key)

      if (!item || !isEqual(item.updatedAt, state.updatedAt)) {
        server.logger.info(
          `Getting form definition ${id} (${slug}) ${formState}`
        )

        // Get the form definition using the `id` from the metadata
        const definition = await formsService.getFormDefinition(id, formState)

        if (!definition) {
          throw Boom.notFound(
            `No definition found for form metadata ${id} (${slug}) ${formState}`
          )
        }

        const emailAddress =
          metadata.notificationEmail ?? definition.outputEmail

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

        // Construct the form model
        const model = new FormModel(
          definition,
          { basePath },
          services,
          controllers
        )

        // Create new item and add it to the item cache
        item = { model, updatedAt: state.updatedAt }
        itemCache.set(key, item)
      }

      // Assign the model to the request data
      // for use in the downstream handler
      request.app.model = item.model

      return h.continue
    }

    const dispatchHandler = (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { model } = request.app

      const servicePath = model ? `/${model.basePath}` : ''
      return proceed(request, h, `${servicePath}${getStartPath(model)}`)
    }

    const questionGetHandler = makeQuestionGetHandler(dispatchHandler)

    const dispatchRouteOptions: RouteOptions<FormRequestRefs> = {
      pre: [
        {
          method: loadFormPreHandler
        }
      ]
    }

    server.route({
      method: 'get',
      path: '/{slug}',
      handler: dispatchHandler,
      options: {
        ...dispatchRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema
          })
        }
      }
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}',
      handler: dispatchHandler,
      options: {
        ...dispatchRouteOptions,
        validate: {
          params: Joi.object().keys({
            state: stateSchema,
            slug: slugSchema
          })
        }
      }
    })

    const getRouteOptions: RouteOptions<FormRequestRefs> = {
      pre: [
        {
          method: loadFormPreHandler
        }
      ]
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path}/{itemId?}',
      handler: questionGetHandler,
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
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/{itemId?}',
      handler: questionGetHandler,
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
    })

    const postRouteOptions: RouteOptions<FormRequestPayloadRefs> = {
      payload: {
        parse: true
      },
      pre: [{ method: loadFormPreHandler }]
    }

    server.route({
      method: 'post',
      path: '/{slug}/{path}/{itemId?}',
      handler: questionPostHandler,
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
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId?}',
      handler: questionPostHandler,
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
    })

    /**
     * "AddAnother" repeat routes
     */

    // List summary GET route
    const getListSummaryHandler = (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        if (!(page instanceof RepeatPageController)) {
          throw Boom.notFound(`No repeater page found for /${params.path}`)
        }

        return page.makeGetListSummaryRouteHandler()(request, context, h)
      })
    }

    server.route({
      method: 'get',
      path: '/{slug}/{path}/summary',
      handler: getListSummaryHandler,
      options: {
        ...getRouteOptions,
        validate: {
          params: Joi.object().keys({
            slug: slugSchema,
            path: pathSchema
          })
        }
      }
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/summary',
      handler: getListSummaryHandler,
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
    })

    // List summary POST route
    const postListSummaryHandler = (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
        const { isForceAccess } = context

        if (isForceAccess || !(page instanceof RepeatPageController)) {
          throw Boom.notFound(`No repeater page found for /${params.path}`)
        }

        return page.makePostListSummaryRouteHandler()(request, context, h)
      })
    }

    server.route({
      method: 'post',
      path: '/{slug}/{path}/summary',
      handler: postListSummaryHandler,
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
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/summary',
      handler: postListSummaryHandler,
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
    })

    // Item delete GET route
    const getItemDeleteHandler = (
      request: FormRequest,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
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

    server.route({
      method: 'get',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: getItemDeleteHandler,
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
    })

    server.route({
      method: 'get',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: getItemDeleteHandler,
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
    })

    // Item delete POST route
    const postItemDeleteHandler = (
      request: FormRequestPayload,
      h: Pick<ResponseToolkit, 'redirect' | 'view'>
    ) => {
      const { params } = request

      return redirectOrMakeHandler(request, h, (page, context) => {
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

    server.route({
      method: 'post',
      path: '/{slug}/{path}/{itemId}/confirm-delete',
      handler: postItemDeleteHandler,
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
    })

    server.route({
      method: 'post',
      path: '/preview/{state}/{slug}/{path}/{itemId}/confirm-delete',
      handler: postItemDeleteHandler,
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
    })

    server.route({
      method: 'get',
      path: '/upload-status/{uploadId}',
      handler: async (
        request: FormRequest,
        h: Pick<ResponseToolkit, 'response'>
      ) => {
        const { uploadId } = request.params as unknown as {
          uploadId: string
        }
        try {
          const status = await getUploadStatus(uploadId)

          if (!status) {
            return h.response({ error: 'Status check failed' }).code(400)
          }

          return h.response(status)
        } catch (error) {
          const errMsg = getErrorMessage(error)
          request.logger.error(
            errMsg,
            `[uploadStatusFailed] Upload status check failed for uploadId: ${uploadId} - ${errMsg}`
          )
          return h.response({ error: 'Status check error' }).code(500)
        }
      },
      options: {
        plugins: {
          crumb: false
        },
        validate: {
          params: Joi.object().keys({
            uploadId: Joi.string().guid().required()
          })
        }
      }
    })
  }
} satisfies Plugin<PluginOptions>
