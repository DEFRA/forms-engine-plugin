import Catbox from '@hapi/catbox'
import hapi, {
  type Request,
  type ResponseToolkit,
  type ServerOptions,
  type ServerRoute
} from '@hapi/hapi'
import inert from '@hapi/inert'
import Scooter from '@hapi/scooter'
import Wreck from '@hapi/wreck'
import Client from '@modernpoacher/catbox-mongodb'
import blipp from 'blipp'
import { ProxyAgent } from 'proxy-agent'

import { config } from '~/src/config/index.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { requestTracing } from '~/src/server/common/helpers/logging/request-tracing.js'
import { configureCrumbPlugin } from '~/src/server/plugins/crumb.js'
import { configureEnginePlugin } from '~/src/server/plugins/engine/configureEnginePlugin.js'
import pluginErrorPages from '~/src/server/plugins/errorPages.js'
import { plugin as pluginViews } from '~/src/server/plugins/nunjucks/index.js'
import pluginPulse from '~/src/server/plugins/pulse.js'
import pluginSession from '~/src/server/plugins/session.js'
import { dummyApiRoutes, publicRoutes } from '~/src/server/routes/index.js'
import { prepareSecureContext } from '~/src/server/secure-context.js'
import { type RouteConfig } from '~/src/server/types.js'

const proxyAgent = new ProxyAgent()

Wreck.agents = {
  https: proxyAgent,
  http: proxyAgent,
  httpsAllowUnauthorized: proxyAgent
}

const serverOptions = (): ServerOptions => {
  const cache = new Catbox.Client(Client, {
    uri: 'mongodb://localhost:27017/?replicaSet=rs0&directConnection=true&readPreference=secondaryPreferred',
    partition: 'my-state'
  })

  const serverOptions: ServerOptions = {
    debug: { request: [`${config.get('isDevelopment')}`] },
    port: config.get('port'),
    router: {
      stripTrailingSlash: true
    },
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    cache: [
      {
        name: 'session',
        engine: cache
        // engine: config.get('isTest')
        //   ? new CatboxMemory()
        //   : new CatboxRedis({
        //       client: buildRedisClient()
        //     })
      }
    ]
  }

  return serverOptions
}

export async function createServer(routeConfig?: RouteConfig) {
  const server = hapi.server(serverOptions())

  await server.register(requestLogger)

  if (config.get('isProduction')) {
    prepareSecureContext(server)
  }

  const pluginCrumb = configureCrumbPlugin(routeConfig)
  const pluginEngine = await configureEnginePlugin(routeConfig)

  await server.register(pluginSession)
  await server.register(pluginPulse)
  await server.register(inert)
  await server.register(Scooter)
  await server.register(pluginCrumb)
  await server.register(pluginEngine)

  server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
    const { response } = request

    if ('isBoom' in response) {
      return h.continue
    }

    // Prevent search engine indexing
    response.header('x-robots-tag', 'noindex, nofollow')

    // Disable cache to ensure back/foward navigation updates progress
    if (
      !request.path.startsWith('/javascripts/') &&
      !request.path.startsWith('/stylesheets/') &&
      !request.path.startsWith('/assets/')
    ) {
      response.header('cache-control', 'no-store')
    }

    return h.continue
  })

  await server.register(pluginViews)

  await server.register({
    plugin: {
      name: 'router',
      register: (server) => {
        server.route(publicRoutes)
        server.route(dummyApiRoutes as ServerRoute[])
      }
    }
  })

  await server.register(pluginErrorPages)

  if (config.get('cdpEnvironment') === 'local') {
    await server.register(blipp)
  }

  await server.register(requestTracing)

  return server
}
