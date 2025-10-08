import { makeLoadFormPreHandler } from '~/src/server/plugins/engine/routes/index.js'
import { getRoutes } from '~/src/server/plugins/postcode-lookup/routes/index.js'

export const VIEW_PATH = 'src/server/plugins/postcode-lookup/views'

/**
 * @satisfies {NamedPlugin<PostcodeLookupConfiguration>}
 */
export const postcodeLookupPlugin = {
  name: '@defra/forms-engine-plugin/postcode-lookup',
  dependencies: ['@hapi/vision'],
  multiple: false,
  register(server, options) {
    const loadFormPreHandler = makeLoadFormPreHandler(
      server,
      options.enginePluginOptions
    )

    const getRouteOptions = {
      pre: [
        {
          method: loadFormPreHandler
        }
      ]
    }

    server.route(
      /** @type {ServerRoute[]} */ (
        // @ts-expect-error - Request typing
        getRoutes(getRouteOptions, options.ordnanceSurveyApiKey)
      )
    )
  }
}

/**
 * @typedef {{
 *   ordnanceSurveyApiKey: string
 *   enginePluginOptions: PluginOptions
 * }} PostcodeLookupConfiguration
 */

/**
 * @import { NamedPlugin, ServerRoute } from '@hapi/hapi'
 * @import { PluginOptions } from '~/src/server/plugins/engine/types.js'
 */
