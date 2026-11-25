import { validatePluginOptions } from '~/src/server/plugins/engine/options.js'
import { generateUniqueReference } from '~/src/server/plugins/engine/referenceNumbers.js'
import { getRoutes as getFileUploadStatusRoutes } from '~/src/server/plugins/engine/routes/file-upload.js'
import { makeLoadFormPreHandler } from '~/src/server/plugins/engine/routes/index.js'
import { getRoutes as getPaymentRoutes } from '~/src/server/plugins/engine/routes/payment.js'
import { getRoutes as getQuestionRoutes } from '~/src/server/plugins/engine/routes/questions.js'
import { getRoutes as getRepeaterItemDeleteRoutes } from '~/src/server/plugins/engine/routes/repeaters/item-delete.js'
import { getRoutes as getRepeaterSummaryRoutes } from '~/src/server/plugins/engine/routes/repeaters/summary.js'
import { registerUnavailableResponse } from '~/src/server/plugins/engine/unavailable-response.js'
import { registerVision } from '~/src/server/plugins/engine/vision.js'
import { mapPlugin } from '~/src/server/plugins/map/index.js'
import { postcodeLookupPlugin } from '~/src/server/plugins/postcode-lookup/index.js'
import { CacheService } from '~/src/server/services/index.js'

/* eslint-disable jsdoc/valid-types -- the JSDoc type parser rejects a method signature in a type literal; tsc reads it */
/**
 * @type {{
 *   name: string
 *   dependencies: string[]
 *   multiple: true
 *   register(server: Server, options: PluginOptions): Promise<void>
 * }}
 */
/* eslint-enable jsdoc/valid-types */
export const plugin = /** @satisfies {Plugin<PluginOptions>} */ ({
  name: '@defra/forms-engine-plugin',
  dependencies: ['@hapi/crumb', '@hapi/yar', 'hapi-pino'],
  multiple: true,
  /**
   * @param {Server} server
   * @param {PluginOptions} options
   */
  async register(server, options) {
    options = validatePluginOptions(options)

    const {
      model,
      cache,
      saveAndExit,
      getLanguage,
      generateReferenceNumber,
      nunjucks: nunjucksOptions,
      viewContext,
      preparePageEventRequestOptions,
      onRequest,
      ordnanceSurveyApiKey,
      baseUrl,
      ordnanceSurveyApiSecret,
      services
    } = options

    const cacheService =
      typeof cache === 'string'
        ? new CacheService({ server, cacheName: cache })
        : cache

    await registerVision(server, options)

    // Register the postcode lookup plugin only if we have an OS api key
    if (ordnanceSurveyApiKey) {
      await server.register({
        plugin: postcodeLookupPlugin,
        options: {
          ordnanceSurveyApiKey
        }
      })
    }

    // Register the maps plugin only if we have an OS api key & secret
    if (ordnanceSurveyApiKey && ordnanceSurveyApiSecret) {
      await server.register({
        plugin: mapPlugin,
        options: {
          ordnanceSurveyApiKey,
          ordnanceSurveyApiSecret
        }
      })
    }

    server.expose('baseLayoutPath', nunjucksOptions.baseLayoutPath)
    server.expose('viewContext', viewContext)
    server.expose('cacheService', cacheService)
    server.expose('saveAndExit', saveAndExit)
    server.expose('getLanguage', getLanguage)
    server.expose(
      'generateReferenceNumber',
      generateReferenceNumber ?? generateUniqueReference
    )
    server.expose('baseUrl', baseUrl)
    server.expose('services', services)

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache =
      /** @type {Map<string, { model: FormModel; updatedAt: Date }>} */ (
        new Map()
      )
    server.app.models = itemCache

    const loadFormPreHandler = makeLoadFormPreHandler(server, options)

    /** @type {RouteOptions<FormRequestRefs>} */
    const getRouteOptions = {
      pre: [
        {
          method: /** @type {Lifecycle.Method<FormRequestRefs>} */ (
            /** @type {unknown} */ (loadFormPreHandler)
          )
        }
      ]
    }

    /** @type {RouteOptions<FormRequestPayloadRefs>} */
    const postRouteOptions = {
      payload: {
        parse: true
      },
      pre: [
        {
          method: /** @type {Lifecycle.Method<FormRequestPayloadRefs>} */ (
            /** @type {unknown} */ (loadFormPreHandler)
          )
        }
      ]
    }

    const routes = [
      ...getPaymentRoutes(),
      ...getFileUploadStatusRoutes(),
      ...getRepeaterSummaryRoutes(getRouteOptions, postRouteOptions, onRequest),
      ...getRepeaterItemDeleteRoutes(
        getRouteOptions,
        postRouteOptions,
        onRequest
      ),

      ...getQuestionRoutes(
        getRouteOptions,
        postRouteOptions,
        preparePageEventRequestOptions,
        onRequest
      )
    ]

    server.route(/** @type {ServerRoute[]} */ (/** @type {unknown} */ (routes))) // TODO

    // Registration order is important: must be registered after the engine's
    // routes so it sees their responses, but before any global error-page
    // handler that would re-shape Boom errors.
    registerUnavailableResponse(server)
  }
})

/**
 * @import { Lifecycle, Plugin, RouteOptions, Server, ServerRoute } from '@hapi/hapi'
 * @import { FormModel } from '~/src/server/plugins/engine/models/index.js'
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 * @import { FormRequestPayloadRefs, FormRequestRefs } from '~/src/server/routes/types.js'
 */
