import {
  type Lifecycle,
  type Plugin,
  type RouteOptions,
  type Server,
  type ServerRoute
} from '@hapi/hapi'

import { type FormModel } from '~/src/server/plugins/engine/models/index.js'
import { validatePluginOptions } from '~/src/server/plugins/engine/options.js'
import { getRoutes as getFileUploadStatusRoutes } from '~/src/server/plugins/engine/routes/file-upload.js'
import { makeLoadFormPreHandler } from '~/src/server/plugins/engine/routes/index.js'
import { getRoutes as getQuestionRoutes } from '~/src/server/plugins/engine/routes/questions.js'
import { getRoutes as getRepeaterItemDeleteRoutes } from '~/src/server/plugins/engine/routes/repeaters/item-delete.js'
import { getRoutes as getRepeaterSummaryRoutes } from '~/src/server/plugins/engine/routes/repeaters/summary.js'
import { type PluginOptions } from '~/src/server/plugins/engine/types.js'
import { registerVision } from '~/src/server/plugins/engine/vision.js'
import {
  type FormRequestPayloadRefs,
  type FormRequestRefs
} from '~/src/server/routes/types.js'
import { CacheService } from '~/src/server/services/index.js'

export const plugin = {
  name: '@defra/forms-engine-plugin',
  dependencies: ['@hapi/crumb', '@hapi/yar', 'hapi-pino'],
  multiple: true,
  async register(server: Server, options: PluginOptions) {
    options = validatePluginOptions(options)

    const {
      model,
      cacheName,
      saveAndExit,
      nunjucks: nunjucksOptions,
      viewContext,
      preparePageEventRequestOptions
    } = options

    const cacheService = new CacheService({
      server,
      cacheName
    })

    await registerVision(server, options)

    server.expose('baseLayoutPath', nunjucksOptions.baseLayoutPath)
    server.expose('viewContext', viewContext)
    server.expose('cacheService', cacheService)
    server.expose('saveAndExit', saveAndExit)

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache = new Map<string, { model: FormModel; updatedAt: Date }>()
    server.app.models = itemCache

    const loadFormPreHandler = makeLoadFormPreHandler(server, options)

    const getRouteOptions: RouteOptions<FormRequestRefs> = {
      pre: [
        {
          method:
            loadFormPreHandler as unknown as Lifecycle.Method<FormRequestRefs>
        }
      ]
    }

    const postRouteOptions: RouteOptions<FormRequestPayloadRefs> = {
      payload: {
        parse: true
      },
      pre: [
        {
          method:
            loadFormPreHandler as unknown as Lifecycle.Method<FormRequestPayloadRefs>
        }
      ]
    }

    const routes = [
      ...getQuestionRoutes(
        getRouteOptions,
        postRouteOptions,
        preparePageEventRequestOptions
      ),
      ...getRepeaterSummaryRoutes(getRouteOptions, postRouteOptions),
      ...getRepeaterItemDeleteRoutes(getRouteOptions, postRouteOptions),
      ...getFileUploadStatusRoutes()
    ]

    server.route(routes as unknown as ServerRoute[]) // TODO
  }
} satisfies Plugin<PluginOptions>
