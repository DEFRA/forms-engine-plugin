import { type Plugin, type Server } from '@hapi/hapi'

import enginePlugin from '~/src/server/plugins/engine/index.js'
import { type PluginOptions } from '~/src/server/plugins/forms/types.js'

export const plugin = {
  name: '@defra/forms-index',
  dependencies: ['@hapi/crumb', '@hapi/yar', 'hapi-pino'],
  multiple: true,
  async register(server: Server, options?: PluginOptions) {
    // routes that should have a predictable URL
    server.route({
      method: 'GET',
      path: '/forms-manifest',
      handler: (_, h) => {
        const prefix = options?.serverRegistrationOptions?.routes?.prefix ?? ''

        return h.response({
          engineBaseUrl: prefix
        })
      }
    })

    // forms can be prefixed to prevent collisions
    await server.register(
      {
        plugin: enginePlugin,
        options: options?.engine
      },
      options?.serverRegistrationOptions
    )
  }
} satisfies Plugin<PluginOptions>
