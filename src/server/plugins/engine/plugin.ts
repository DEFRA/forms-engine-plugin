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
      keyGenerator,
      sessionHydrator,
      nunjucks: nunjucksOptions,
      viewContext,
      preparePageEventRequestOptions
    } = options
    const cacheService = new CacheService({
      server,
      cacheName,
      options: {
        keyGenerator,
        sessionHydrator
      }
    })

    await registerVision(server, options)

    server.expose('baseLayoutPath', nunjucksOptions.baseLayoutPath)
    server.expose('viewContext', viewContext)
    server.expose('cacheService', cacheService)

    server.app.model = model

    // In-memory cache of FormModel items, exposed
    // (for testing purposes) through `server.app.models`
    const itemCache = new Map<string, { model: FormModel; updatedAt: Date }>()
    server.app.models = itemCache

    const loadFormPreHandler = makeLoadFormPreHandler(server, options)

    const requireAuthForProtectedForms = async (
      request: FormRequest | FormRequestPayload,
      h: Pick<ResponseToolkit, 'continue'>
    ) => {
      const acc1 = request.route.auth.access(request)
      const acc2 = Auth.access(request)
      const acc3 = Auth.testAccess(request)
      const metadata = await formsService.getFormMetadata(request.params.slug)
      const { params, path } = request
      const { state: formState } = checkFormStatus(params)
      const { id } = metadata
      const formDefinition = await formsService.getFormDefinition(id, formState)

      const formAuth = formDefinition?.metadata?.auth as AuthConfig | undefined

      const segments = path.split('/')
      const pagePath = '/' + segments[segments.length - 1]
      const page = formDefinition?.pages.find((p) => p.path === pagePath)
      const effectiveAuth = page?.auth ?? formAuth ?? { mode: 'none' }
      const mode = effectiveAuth.mode ?? 'none'

      // If authentication is required but no credentials are found, reject the request
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (mode === 'required' && !request.auth.credentials) {
        throw Boom.unauthorized('You must be logged in to access this form')
      }

      // Proceed to the next pre-handler or route handler
      return h.continue
    }

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
